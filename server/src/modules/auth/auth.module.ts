import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OtpCode } from './entities/otp-code.entity';
import { OtpCleanupTask } from './otp-cleanup.task';
import { UserModule } from '../user/user.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [TypeOrmModule.forFeature([OtpCode]), UserModule, SmsModule],
  controllers: [AuthController],
  providers: [AuthService, OtpCleanupTask],
})
export class AuthModule {}
