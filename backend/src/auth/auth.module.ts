import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { InvitationsModule } from '../invitations/invitations.module';
import { MailService } from '../mail.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationV2Service } from './email/email-verification-v2.service';
import { FirebasePhoneVerificationService } from './firebase/firebase-phone-verification.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { NetgsmService } from './otp/netgsm.service';
import { PhoneOtpService } from './otp/phone-otp.service';
import { PendingRegistrationService } from './registration/pending-registration.service';
import { RegistrationV2Service } from './registration/registration-v2.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    InvitationsModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'sm-super-secret-jwt-key-degistirin',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [
    AuthService,
    RegistrationV2Service,
    PendingRegistrationService,
    PhoneOtpService,
    NetgsmService,
    FirebasePhoneVerificationService,
    EmailVerificationV2Service,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    MailService,
  ],
  controllers: [AuthController],
  exports: [
    JwtAuthGuard,
    RolesGuard,
    JwtModule,
    RegistrationV2Service,
    FirebasePhoneVerificationService,
  ],
})
export class AuthModule {}
