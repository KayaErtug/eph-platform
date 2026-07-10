import { Injectable } from '@nestjs/common';
import {
  PendingRegistration,
  PendingRegistrationStatus,
  Role,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

type CreatePendingRegistrationInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  city: string;
  role: Role;
  registrationType?: string | null;
  inviteCode?: string | null;
  referralCandidateId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class PendingRegistrationService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.pendingRegistration.findUnique({
      where: { id },
    });
  }

  async createOrReplace(
    input: CreatePendingRegistrationInput,
  ): Promise<PendingRegistration> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.pendingRegistration.deleteMany({
      where: {
        OR: [{ email: input.email }, { phone: input.phone }],
      },
    });

    return this.prisma.pendingRegistration.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash,
        city: input.city,
        role: input.role,
        registrationType: input.registrationType || null,
        inviteCode: input.inviteCode || null,
        referralCandidateId: input.referralCandidateId || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        expiresAt,
        status: PendingRegistrationStatus.PHONE_VERIFICATION_PENDING,
      },
    });
  }

  markPhoneVerified(id: string) {
    return this.prisma.pendingRegistration.update({
      where: { id },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        phoneVerificationCodeHash: null,
        phoneVerificationExpiresAt: null,
        phoneVerificationAttempts: 0,
        status: PendingRegistrationStatus.EMAIL_VERIFICATION_PENDING,
      },
    });
  }

  markEmailVerified(id: string) {
    return this.prisma.pendingRegistration.update({
      where: { id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationAttempts: 0,
        status: PendingRegistrationStatus.READY_TO_CREATE_USER,
      },
    });
  }

  markCompleted(id: string) {
    return this.prisma.pendingRegistration.update({
      where: { id },
      data: {
        status: PendingRegistrationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }
}
