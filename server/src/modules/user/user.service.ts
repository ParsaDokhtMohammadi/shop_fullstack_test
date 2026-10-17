import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, MoreThan, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { USER_MESSAGES, VALIDATION_MESSAGES } from '../../common/messages';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phoneNumber } });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // Signup happens here, called by verifyOtp once a code has come back.
  //
  // Insert-then-read rather than find-then-save, because two requests can
  // genuinely arrive at once: a double-tap on the login button sends two
  // verifies, and the ~50ms bcrypt compare in between means both get past the
  // OTP lookup before either burns it. Find-then-save would have one of them
  // lose on the unique index and answer 409 to somebody who did nothing wrong.
  // ON CONFLICT DO NOTHING makes the insert a no-op for the loser, and the
  // read afterwards gives both of them the same row.
  async findOrCreateByPhone(phoneNumber: string): Promise<User> {
    await this.userRepository
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({ phoneNumber })
      .orIgnore()
      .execute();

    // Non-null: the insert either created the row or found it already there.
    return (await this.findByPhone(phoneNumber)) as User;
  }

  // One page of users for the admin CRM, newest first. Takes primitives rather
  // than the CRM's DTO so this module stays unaware of the customer module —
  // auth depends on this service, and it has no business importing a panel DTO.
  findPage(
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<[User[], number]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (search) {
      const term = search.trim();
      // Phones are stored normalized as +989xxxxxxxxx, but an admin types what
      // the customer reads out: 09121112222, 9121112222, +98912…. Stripping
      // the separators and whichever prefix was used leaves the digits that
      // actually identify the line, so any spelling matches the stored one.
      const digits = term.replace(/\D/g, '').replace(/^0098|^98|^0/, '');

      // One box for both, like the admin order list: whoever is on the phone
      // gives their number or their name, and the panel should not make the
      // admin choose which field they are searching.
      query.andWhere(
        new Brackets((where) => {
          where.where('user.fullName ILIKE :name', { name: `%${term}%` });
          if (digits)
            where.orWhere('user.phoneNumber ILIKE :phone', {
              phone: `%${digits}%`,
            });
        }),
      );
    }

    return query.getManyAndCount();
  }

  // The customer's own account. The same shape as the profile the panel shows,
  // so GET and PATCH answer with identical payloads.
  async findProfile(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(USER_MESSAGES.NOT_FOUND);

    return { message: USER_MESSAGES.PROFILE_FETCHED, payload: toProfile(user) };
  }

  // fullName is the only thing here. The phone number is the login identity and
  // the customer cannot change it; the role is server-side only — a client that
  // sends either has it dropped by the global whitelist pipe.
  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(USER_MESSAGES.NOT_FOUND);

    if (dto.fullName !== undefined) {
      const fullName = dto.fullName.trim();
      // An empty string clears the name; one or two characters is a typo, not
      // a name, and @Length cannot tell the two apart before the trim.
      if (fullName.length === 1)
        throw new BadRequestException(VALIDATION_MESSAGES.FULL_NAME_LENGTH);

      user.fullName = fullName || null;
    }

    const saved = await this.userRepository.save(user);

    return {
      message: USER_MESSAGES.PROFILE_UPDATED,
      payload: toProfile(saved),
    };
  }

  // For the admin dashboard. Two trivial COUNTs rather than one clever query:
  // the table is small, and `countSince` taking a plain date keeps the
  // dashboard's choice of windows out of this module.
  count(): Promise<number> {
    return this.userRepository.count();
  }

  countSince(date: Date): Promise<number> {
    return this.userRepository.count({ where: { createdAt: MoreThan(date) } });
  }

  async setRole(id: string, role: Role): Promise<void> {
    await this.userRepository.update({ id }, { role });
  }
}

// One place that decides what the customer may see of their own row. `role` is
// in it because the frontend shows an admin their panel link.
const toProfile = (user: User) => ({
  id: user.id,
  fullName: user.fullName,
  phoneNumber: user.phoneNumber,
  role: user.role,
  createdAt: user.createdAt,
});
