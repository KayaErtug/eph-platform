import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { PrismaService } from '../prisma/prisma.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private invitationsService: InvitationsService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  generateReferralCode(firstName: string, lastName: string) {
    const random = Math.floor(
      1000 + Math.random() * 9000,
    );

    return `${firstName}-${lastName}-${random}`
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(
      dto.email,
    );

    if (existing) {
      throw new BadRequestException(
        'Bu email zaten kayıtlı.',
      );
    }

    let role: any = 'EMLAKCI';

    let isApproved = false;

    if (
      dto.inviteCode &&
      dto.inviteCode.trim() !== ''
    ) {
      const referral =
        await this.prisma.referralCandidate.findFirst({
          where: {
            referralCode:
              dto.inviteCode.toUpperCase(),
            isActive: true,
          },
        });

      if (!referral) {
        throw new BadRequestException(
          'Referans kodu bulunamadı.',
        );
      }

      role = referral.role;

      isApproved = true;

      await this.prisma.referralCandidate.update({
        where: {
          id: referral.id,
        },
        data: {
          usedAt: new Date(),
        },
      });
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      10,
    );

    const referralCode = this.generateReferralCode(
      dto.firstName,
      dto.lastName,
    );

    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role,
      isApproved,
      referralCode,
    });

    if (!isApproved) {
      return {
        success: true,
        message:
          'Başvurunuz alınmıştır. Admin onayı sonrası giriş yapabilirsiniz.',
      };
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role:
          user.role === 'EMLAKCI'
            ? 'Gayrimenkul Danışmanı'
            : user.role,
        isApproved: user.isApproved,
        referralCode: user.referralCode,
        nominationPoints: user.nominationPoints,
        nominationQuota: user.nominationQuota,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(
      dto.email,
    );

    if (!user) {
      throw new UnauthorizedException(
        'Email veya şifre hatalı.',
      );
    }

    if (!user.isApproved) {
      throw new UnauthorizedException(
        'Üyeliğiniz henüz admin tarafından onaylanmadı.',
      );
    }

    const isMatch = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isMatch) {
      throw new UnauthorizedException(
        'Email veya şifre hatalı.',
      );
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role:
          user.role === 'EMLAKCI'
            ? 'Gayrimenkul Danışmanı'
            : user.role,
        isApproved: user.isApproved,
        referralCode: user.referralCode,
        nominationPoints: user.nominationPoints,
        nominationQuota: user.nominationQuota,
      },
    };
  }
}