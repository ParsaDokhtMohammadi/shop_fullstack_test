import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/utils/jwt.util';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

// The customer's own account, at /me. The phone number is not editable here or
// anywhere else: it is the login identity, it is what every past order and OTP
// is keyed to, and a shop that wants a customer moved to a new number has an
// admin do it. So the only thing this panel writes is the name.
@ApiTags('My account')
@Controller('me')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'My profile',
    description:
      'The account row itself. Where GET /auth/me answers "is there a session", this answers "what is in my account" — same user, fuller payload.',
  })
  findProfile(@CurrentUser() user: JwtPayload) {
    return this.userService.findProfile(user.sub);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Change my name',
    description:
      'fullName is the only editable field on the account. The phone number cannot be changed — it is the login identity — and the role is never client-settable. Send an empty string to clear the name.',
  })
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.sub, dto);
  }
}
