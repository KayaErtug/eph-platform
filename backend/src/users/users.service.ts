import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    passwordHash: string;
    role: Role;
    isApproved?: boolean;
    referralCode?: string;
  }) {
    return this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        passwordHash: data.passwordHash,
        role: data.role,
        isApproved: data.isApproved ?? false,
        referralCode: data.referralCode,
      },
    });
  }
}