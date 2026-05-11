import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private invitationsService: InvitationsService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Davet kodunu doğrula
    const invitation = await this.invitationsService.validate(dto.inviteCode);

    // 2. Email daha önce kayıtlı mı?
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Bu email zaten kayıtlı.');

    // 3. Şifreyi hashle
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 4. Kullanıcıyı oluştur — rol davetten geliyor
    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: invitation.role,
    });

    // 5. Davet kodunu kullanıldı olarak işaretle
    await this.invitationsService.markAsUsed(dto.inviteCode, user.id);

    // 6. JWT üret
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
        role: user.role,
        isApproved: user.isApproved,
      },
    };
  }

  async login(dto: LoginDto) {
    // 1. Kullanıcıyı bul
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Email veya şifre hatalı.');

    // 2. Şifreyi kontrol et
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Email veya şifre hatalı.');

    // 3. JWT üret
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
        role: user.role,
        isApproved: user.isApproved,
      },
    };
  }
}