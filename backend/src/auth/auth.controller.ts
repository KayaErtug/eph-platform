import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendPhoneOtpDto } from './dto/resend-phone-otp.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendEmailCodeDto } from './dto/send-email-code.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyEmailV2Dto } from './dto/verify-email-v2.dto';
import { VerifyPasswordResetCodeDto } from './dto/verify-password-reset-code.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RegistrationV2Service } from './registration/registration-v2.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registrationV2Service: RegistrationV2Service,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registrationV2Service.start(dto);
  }

  @Post('verify-phone-otp')
  verifyPhoneOtp(@Body() dto: VerifyPhoneOtpDto) {
    return this.registrationV2Service.verifyPhoneOtp(
      dto.pendingRegistrationId,
      dto.code,
    );
  }

  @Post('resend-phone-otp')
  resendPhoneOtp(@Body() dto: ResendPhoneOtpDto) {
    return this.registrationV2Service.resendPhoneOtp(
      dto.pendingRegistrationId,
    );
  }

  @Post('send-email-code')
  sendEmailCode(@Body() dto: SendEmailCodeDto) {
    return this.registrationV2Service.sendEmailCode(
      dto.pendingRegistrationId,
    );
  }

  @Post('verify-email-v2')
  verifyEmailV2(@Body() dto: VerifyEmailV2Dto) {
    return this.registrationV2Service.verifyEmailV2(
      dto.pendingRegistrationId,
      dto.code,
    );
  }

  @Post('complete-registration')
  completeRegistration(
    @Body() dto: CompleteRegistrationDto,
  ) {
    return this.registrationV2Service.completeRegistration(
      dto.pendingRegistrationId,
    );
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('verify-password-reset-code')
  verifyPasswordResetCode(
    @Body() dto: VerifyPasswordResetCodeDto,
  ) {
    return this.authService.verifyPasswordResetCode(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  adminOnly() {
    return { message: 'Sadece admin görebilir.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMLAKCI, Role.ADMIN)
  @Get('emlakci-only')
  emlakciOnly(@CurrentUser() user: any) {
    return {
      message: `Hoş geldin emlakçı: ${user.email}`,
    };
  }
}
