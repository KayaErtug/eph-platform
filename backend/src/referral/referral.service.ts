import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  async validateReferralCode(code: string) {
    const candidate = await this.prisma.referralCandidate.findFirst({
      where: {
        referralCode: code.toUpperCase(),
        isActive: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException("Referans kodu bulunamadı.");
    }

    return {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      role: candidate.role,
    };
  }
}