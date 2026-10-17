import { hashCode, verifyCode } from './../../common/utils/hash.util';
import {
  BadRequestException,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LessThan,
  LessThanOrEqual,
  MoreThan,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { randomInt } from 'crypto';

import { OtpCode } from './entities/otp-code.entity';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserService } from '../user/user.service';
import { SmsService } from '../sms/sms.service';
import { SmsUnknownError } from '../sms/sms.errors';
import { normalizePhone } from '../../common/utils/phone.util';
import { signToken } from '../../common/utils/jwt.util';
import { AUTH_MESSAGES, SMS_MESSAGES } from '../../common/messages';

const OTP_TTL_SECONDS = 120;
const RESEND_COOLDOWN_SECONDS = 60;
// Exported because the cleanup task needs the same number: a row at the cap is
// dead, and two different ideas of where the cap is would mean collecting rows
// that can still be used, or leaving dead ones behind.
export const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepository: Repository<OtpCode>,
    private readonly userService: UserService,
    private readonly smsService: SmsService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const phone = normalizePhone(dto.phoneNumber);
    if (!phone) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_PHONE);
    }
    const cutoff = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000);

    const recent = await this.otpRepository.findOne({
      where: { phone, createdAt: MoreThan(cutoff) },
      order: { createdAt: 'DESC' },
    });

    if (recent) {
      const secondsLeft = Math.ceil(
        (recent.createdAt.getTime() +
          RESEND_COOLDOWN_SECONDS * 1000 -
          Date.now()) /
          1000,
      );
      throw new HttpException(
        AUTH_MESSAGES.OTP_RESEND_COOLDOWN(secondsLeft),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // No account is created here. Asking for a code is not proof that anyone
    // owns the number — anyone can type any phone number into this endpoint —
    // so a row would mean an account for someone who never consented, and one
    // that survives even when the SMS below is refused. verifyOtp creates it,
    // once the code has come back. The OTP row is keyed by phone, which is the
    // login identity, so nothing here needs a user to point at.
    //
    // Only the newest code may work. Without this the previous one stays valid
    // until it expires, so a code the user thinks they replaced still logs in.
    //
    // The cutoff matters: deleting unconditionally would also clear a code a
    // simultaneous request had just inserted, and then both would send one.
    await this.otpRepository.delete({
      phone,
      purpose: 'login',
      createdAt: LessThanOrEqual(cutoff),
    });

    const code = randomInt(10000, 100000).toString();
    const codeHash = await hashCode(code);

    // One row per (phone, purpose), so if a simultaneous request got here
    // first its row is still there and this insert is refused. That is the
    // check the cooldown read above cannot make: two requests can both pass it
    // before either has written anything.
    const otp = await this.otpRepository
      .save(
        this.otpRepository.create({
          phone,
          codeHash,
          purpose: 'login',
          expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
        }),
      )
      .catch((error: unknown) => {
        if (!isDuplicateCode(error)) throw error;

        // The other request created it a moment ago, so the wait is the whole
        // cooldown — no need to read the row back to find that out.
        throw new HttpException(
          AUTH_MESSAGES.OTP_RESEND_COOLDOWN(RESEND_COOLDOWN_SECONDS),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      });

    // Two different failures, and they must not be handled the same way.
    //
    // An explicit refusal from the gateway (no credit, bad sender line) means
    // the message definitely did not go out: the row goes away again, because
    // leaving it would start the 60-second cooldown for a code that never
    // arrived, and the user would be told to wait before retrying something
    // that never happened.
    //
    // A timeout or a broken connection means we do not know. The message has
    // very likely been sent — abandoning our wait does not cancel the request —
    // so the row stays. Deleting it is the worst case available: the customer
    // gets the SMS and then finds the code rejected.
    try {
      await this.smsService.send(phone, SMS_MESSAGES.OTP(code));
    } catch (error) {
      if (error instanceof SmsUnknownError)
        this.logger.warn(
          `OTP for ${phone} kept: delivery unconfirmed (${error.message})`,
        );
      else {
        await this.otpRepository.delete({ id: otp.id });
        throw new HttpException(
          SMS_MESSAGES.SEND_FAILED,
          HttpStatus.BAD_GATEWAY,
        );
      }
    }

    return {
      message: AUTH_MESSAGES.OTP_SENT,
      phoneNumber: phone,
      expiresIn: OTP_TTL_SECONDS,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = normalizePhone(dto.phoneNumber);
    if (!phone) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_PHONE);
    }
    const otp = await this.otpRepository.findOne({
      where: { phone, purpose: 'login' },
      order: { createdAt: 'DESC' },
    });

    if (!otp) throw new BadRequestException(AUTH_MESSAGES.OTP_INVALID);
    if (otp.expiresAt.getTime() <= Date.now())
      throw new BadRequestException(AUTH_MESSAGES.OTP_EXPIRED);
    // Spend an attempt before checking the code, and let the WHERE do the
    // counting. Reading attempts and incrementing afterwards let concurrent
    // guesses all see the same number and all pass — the bcrypt compare below
    // takes ~50ms, which is a wide enough gap to fit a lot of guesses into.
    // A correct code spends one too, which costs nothing: the row is deleted
    // two lines later.
    const claimed = await this.otpRepository.increment(
      { id: otp.id, attempts: LessThan(MAX_VERIFY_ATTEMPTS) },
      'attempts',
      1,
    );
    if (!claimed.affected)
      throw new BadRequestException(AUTH_MESSAGES.OTP_TOO_MANY_ATTEMPTS);

    const matches = await verifyCode(dto.code, otp.codeHash);
    if (!matches) throw new BadRequestException(AUTH_MESSAGES.OTP_INVALID);
    // Burn it: the code has done its job and the session cookie takes over.
    await this.otpRepository.delete({ id: otp.id });
    const user = await this.userService.findOrCreateByPhone(phone);

    const token = signToken({
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    return {
      token,
      message: AUTH_MESSAGES.OTP_VERIFIED,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }

  async getMe(userId: string | undefined) {
    if (!userId) return { user: null };
    const user = await this.userService.findById(userId);
    if (!user) return { user: null };

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }
}

// 23505 is a unique violation — here, only ever otp_code_phone_purpose_unique,
// because that is the single unique index this service writes against.
const isDuplicateCode = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === '23505';
