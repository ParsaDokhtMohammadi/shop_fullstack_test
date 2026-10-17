import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, minutes } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import {
  setAuthCookie,
  clearAuthCookie,
  AUTH_COOKIE,
} from '../../common/utils/cookie.util';
import { AUTH_MESSAGES } from '../../common/messages';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/utils/jwt.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: minutes(2) } })
  @ApiOperation({
    summary: 'Send a login code by SMS',
    description:
      'Login and signup in one call: an unknown number gets an account, a known number just receives a code. Only the phone number is needed.',
  })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  // Per ip, on top of the per-code cap of 5 wrong guesses the service keeps.
  // Those two stop different attacks: the service's counter lives on one OTP
  // row, so it bounds guessing one number's code — but it does nothing against
  // one guess sprayed across a thousand numbers, where every attempt lands on
  // a different row and no counter ever builds. This is the brake on that.
  //
  // The window is the 120s an OTP is alive, and 10 is double what the service
  // would ever let a single code absorb — room for a typo and a retry, while
  // cutting a sprayer from 1200 attempts an hour per ip to 300.
  @Throttle({ default: { limit: 10, ttl: minutes(2) } })
  @ApiOperation({
    summary: 'Verify a login code and start a session',
    description:
      'Checks the code against the newest unused OTP for that number, burns it, and sets the httpOnly JWT cookie. Rate limited to 10 attempts per 2 minutes per ip, separately from the 5 wrong guesses any single code allows before it is dead.',
  })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, ...result } = await this.authService.verifyOtp(dto);
    setAuthCookie(res, token);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res);
    return { message: AUTH_MESSAGES.LOGGED_OUT };
  }

  @Get('me')
  @ApiCookieAuth(AUTH_COOKIE)
  @ApiOperation({
    summary: 'The logged-in user, or null',
    description:
      'Deliberately unguarded and always 200 — branch on `user`, never on the status code. `user` is null when there is no cookie, when the cookie is expired or malformed, and when the token is valid but the account behind it no longer exists; otherwise it is the account. The session cookie is httpOnly so the frontend cannot inspect it directly, which is what this endpoint is for: call it on load and read `user`.',
  })
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user?.sub);
  }
}
