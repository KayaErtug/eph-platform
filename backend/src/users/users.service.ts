import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    if (!email) return null;
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByPhone(phone: string) {
    if (!phone) return null;
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async findByPhoneOrEmail(identifier: string) {
    const raw = String(identifier || '').trim();
    if (!raw) return null;

    // E-posta formatı kontrolü
    if (raw.includes('@')) {
      return this.findByEmail(raw.toLowerCase());
    }

    // Telefon araması: hem doğrudan hem normalize formatta dener
    const digits = raw.replace(/\D/g, '');
    let local = digits;
    if (local.startsWith('0090')) local = local.slice(4);
    else if (local.startsWith('90')) local = local.slice(2);
    else if (local.startsWith('0')) local = local.slice(1);
    if (local.length > 10) local = local.slice(-10);

    let formattedPhone = raw;
    if (local.length === 10 && local.startsWith('5')) {
      formattedPhone = `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
    }

    return this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: formattedPhone },
          { phone: raw },
          { email: raw.toLowerCase() },
        ],
      },
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
    email?: string | null;
    phone: string;
    city: string;
    passwordHash: string;
    role: Role;
    isApproved?: boolean;
    referralCode?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone,
          city: data.city,
          passwordHash: data.passwordHash,
          role: data.role,
          isApproved: data.isApproved ?? false,
          referralCode: data.referralCode,
        },
      });

      return user;
    });
  }
}
