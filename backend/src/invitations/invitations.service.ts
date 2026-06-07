import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvitationStatus, OnayYetkiSeviyesi, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  private readonly tersTurkAlfabesi: Record<string, string> = {
    A: '29',
    B: '28',
    C: '27',
    Ç: '26',
    D: '25',
    E: '24',
    F: '23',
    G: '22',
    Ğ: '21',
    H: '20',
    I: '19',
    İ: '18',
    J: '17',
    K: '16',
    L: '15',
    M: '14',
    N: '13',
    O: '12',
    Ö: '11',
    P: '10',
    R: '09',
    S: '08',
    Ş: '07',
    T: '06',
    U: '05',
    Ü: '04',
    V: '03',
    Y: '02',
    Z: '01',
  };

  private readonly rolKodlari: Record<Role, string> = {
    EMLAKCI: 'EML',
    MUTEAHHIT: 'MUT',
    INSAAT_FIRMASI: 'INS',
    MODERATOR: 'MOD',
    ADMIN: 'ADM',
    SUPER_ADMIN: 'SUP',
  };

  private guvenlikKoduUret(length = 7): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private normalizeName(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleUpperCase('tr-TR');
  }

  private getHarfKodu(harf: string): string {
    const kod = this.tersTurkAlfabesi[harf.toLocaleUpperCase('tr-TR')];

    if (!kod) {
      throw new BadRequestException(`Referans kodu üretilemedi. Desteklenmeyen karakter: ${harf}`);
    }

    return kod;
  }

  private adayAdSoyadAyir(candidateName: string) {
    const temizAdSoyad = this.normalizeName(candidateName);
    const parcalar = temizAdSoyad.split(' ').filter(Boolean);

    if (parcalar.length < 2) {
      throw new BadRequestException('Referans kodu için adayın ad ve soyadı gereklidir.');
    }

    const ad = parcalar[0];
    const soyad = parcalar[parcalar.length - 1];

    if (ad.length < 2 || soyad.length < 2) {
      throw new BadRequestException('Referans kodu için ad ve soyad en az 2 harf olmalıdır.');
    }

    return { ad, soyad };
  }

  private generateCode(candidateName: string, role: Role): string {
    const { ad, soyad } = this.adayAdSoyadAyir(candidateName);

    const adIlk = this.getHarfKodu(ad[0]);
    const soyadIlk = this.getHarfKodu(soyad[0]);
    const adIkinci = this.getHarfKodu(ad[1]);
    const soyadIkinci = this.getHarfKodu(soyad[1]);

    return `EPH-${adIlk}-${this.rolKodlari[role]}${soyadIlk}-${adIkinci}${soyadIkinci}${this.guvenlikKoduUret()}`;
  }

  private async benzersizKodUret(candidateName: string, role: Role): Promise<string> {
    let code = this.generateCode(candidateName, role);
    let exists = await this.prisma.invitation.findUnique({ where: { code } });

    while (exists) {
      code = this.generateCode(candidateName, role);
      exists = await this.prisma.invitation.findUnique({ where: { code } });
    }

    return code;
  }

  async create(dto: CreateInvitationDto) {
    const candidateEmail = dto.candidateEmail.trim().toLowerCase();
    const code = await this.benzersizKodUret(dto.candidateName, dto.role);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);

    return this.prisma.invitation.create({
      data: {
        code,
        role: dto.role,
        adayAdSoyad: dto.candidateName.trim(),
        adayEposta: candidateEmail,
        pilotDavetiMi: Boolean(dto.isPilotInvitation),
        expiresAt,
        maxUses: dto.maxUses || 1,
        onayYetkiSeviyesi: OnayYetkiSeviyesi.MODERATOR_ADMIN_SUPER_ADMIN,
      },
    });
  }

  async validate(code: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!invitation) {
      throw new NotFoundException('Davet kodu bulunamadı.');
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new BadRequestException('Bu davet kodu iptal edilmiş.');
    }

    if (invitation.status === InvitationStatus.USED) {
      throw new BadRequestException('Bu davet kodu daha önce kullanılmış.');
    }

    if (invitation.usedCount >= invitation.maxUses) {
      throw new BadRequestException('Kullanım limiti dolmuş.');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Davet kodunun süresi dolmuş.');
    }

    return {
      valid: true,
      role: invitation.role,
      code: invitation.code,
      candidateName: invitation.adayAdSoyad,
      candidateEmail: invitation.adayEposta,
      isPilotInvitation: invitation.pilotDavetiMi,
      expiresAt: invitation.expiresAt,
    };
  }

  async findAll() {
    return this.prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(code: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!invitation) {
      throw new NotFoundException('Davet kodu bulunamadı.');
    }

    return this.prisma.invitation.update({
      where: { code: invitation.code },
      data: { status: InvitationStatus.REVOKED },
    });
  }

  async markAsUsed(code: string, userId: string) {
    return this.prisma.invitation.update({
      where: { code: code.trim().toUpperCase() },
      data: {
        usedCount: { increment: 1 },
        status: InvitationStatus.USED,
      },
    });
  }
}