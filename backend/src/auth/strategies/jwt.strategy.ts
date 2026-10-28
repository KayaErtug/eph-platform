import { officeMembershipEnforced } from '../../office/office-wallet.rules';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'sm-super-secret-jwt-key-degistirin',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isApproved: true,
        isVerified: true,
        professionalVerificationStatus: true,
        office: { select: { isActive: true } },
        ownedOffices: { where: { isActive: true }, select: { id: true }, take: 1 },
      },
    });

    if (!user || !user.isApproved || !user.isVerified) {
      throw new UnauthorizedException('Oturum artık geçerli değil.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      professionalVerificationStatus: user.professionalVerificationStatus,
      officeMembershipRequired: user.role === 'EMLAKCI' && !user.office?.isActive && !user.ownedOffices.length && await officeMembershipEnforced(this.prisma),
    };
  }
}
