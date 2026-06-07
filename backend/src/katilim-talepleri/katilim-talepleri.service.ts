import { BadRequestException, Injectable } from '@nestjs/common';
import { ApplicationStatus, InvitationStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { KatilimTalebiOlusturDto } from './dto/katilim-talebi-olustur.dto';

@Injectable()
export class KatilimTalepleriService {
  constructor(private readonly prisma: PrismaService) {}

  async olustur(dto: KatilimTalebiOlusturDto, ipAddress?: string, userAgent?: string) {
    this.hukukiOnaylariKontrolEt(dto);

    const email = dto.applicantEmail.trim().toLowerCase();
    const referralCode = dto.referralCode?.trim().toUpperCase() || null;

    await this.mukerrerBasvuruKontrolEt(email);

    const referansBilgisi = referralCode
      ? await this.referansKodunuDogrula(referralCode, dto.requestedRole)
      : null;

    const basvuruTuru = referansBilgisi ? 'REFERANSLI' : 'REFERANSSIZ';
    const onayYetkiSeviyesi = referansBilgisi
      ? 'MODERATOR_ADMIN_SUPER_ADMIN'
      : 'ADMIN_SUPER_ADMIN';

    const application = await this.prisma.application.create({
      data: {
        applicantName: dto.applicantName.trim(),
        applicantEmail: email,
        applicantPhone: dto.applicantPhone.trim(),
        requestedRole: dto.requestedRole,
        profession: dto.profession?.trim() || null,
        city: dto.city?.trim() || null,
        message: this.basvuruMesajiniHazirla(dto.message, {
          basvuruTuru,
          pilotBasvuruMu: Boolean(dto.pilotBasvuruMu),
          onayYetkiSeviyesi,
          district: dto.district?.trim() || null,
        }),
        referralCode,

        status: ApplicationStatus.PENDING,

        platformAccepted: dto.platformAccepted,
        kvkkAccepted: dto.kvkkAccepted,
        privacyAccepted: dto.privacyAccepted,
        userAgreementAccepted: dto.userAgreementAccepted,
        legalAcceptedAt: new Date(),

        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return {
      success: true,
      message: referansBilgisi
        ? 'Referans kodunuz doğrulandı. Katılım talebiniz moderatör veya yönetim onayına gönderildi.'
        : 'Katılım talebiniz alındı. Yönetim onayından sonra size e-posta ile bilgi verilecektir.',
      applicationId: application.id,
      basvuruTuru,
      pilotBasvuruMu: Boolean(dto.pilotBasvuruMu),
      referansliMi: Boolean(referansBilgisi),
      onayYetkiSeviyesi,
      status: application.status,
    };
  }

  private hukukiOnaylariKontrolEt(dto: KatilimTalebiOlusturDto) {
    if (
      !dto.platformAccepted ||
      !dto.kvkkAccepted ||
      !dto.privacyAccepted ||
      !dto.userAgreementAccepted
    ) {
      throw new BadRequestException(
        'Katılım talebi oluşturmak için platform, KVKK, gizlilik ve kullanıcı sözleşmesi onayları gereklidir.',
      );
    }
  }

  private async mukerrerBasvuruKontrolEt(email: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('Bu e-posta adresi ile kayıtlı bir kullanıcı bulunmaktadır.');
    }

    const existingApplication = await this.prisma.application.findFirst({
      where: {
        applicantEmail: email,
        status: {
          in: [
            ApplicationStatus.PENDING,
            ApplicationStatus.APPROVED,
            ApplicationStatus.INVITED,
            ApplicationStatus.GORUSME_PLANLANDI,
            ApplicationStatus.EVRAK_BEKLENIYOR,
          ],
        },
      },
      select: { id: true, status: true },
    });

    if (existingApplication) {
      throw new BadRequestException('Bu e-posta adresi ile devam eden bir katılım talebi bulunmaktadır.');
    }
  }

  private async referansKodunuDogrula(
    referralCode: string,
    requestedRole: KatilimTalebiOlusturDto['requestedRole'],
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code: referralCode },
    });

    if (!invitation) {
      throw new BadRequestException('Referans kodu bulunamadı.');
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new BadRequestException('Bu referans kodu iptal edilmiş.');
    }

    if (invitation.status === InvitationStatus.USED) {
      throw new BadRequestException('Bu referans kodu daha önce kullanılmış.');
    }

    if (invitation.usedCount >= invitation.maxUses) {
      throw new BadRequestException('Bu referans kodunun kullanım limiti dolmuş.');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Bu referans kodunun geçerlilik süresi dolmuş.');
    }

    if (invitation.role !== requestedRole) {
      throw new BadRequestException('Referans kodu seçilen rol için uygun değil.');
    }

    return {
      invitationId: invitation.id,
    };
  }

  private basvuruMesajiniHazirla(
    kullaniciMesaji: string | undefined,
    meta: {
      basvuruTuru: string;
      pilotBasvuruMu: boolean;
      onayYetkiSeviyesi: string;
      district: string | null;
    },
  ) {
    const mesaj = kullaniciMesaji?.trim() || '';

    const sistemNotu = [
      '',
      '---',
      'Sistem Notu:',
      `Başvuru türü: ${meta.basvuruTuru}`,
      `Pilot başvuru mu: ${meta.pilotBasvuruMu ? 'Evet' : 'Hayır'}`,
      `Onay yetkisi: ${meta.onayYetkiSeviyesi}`,
      meta.district ? `İlçe: ${meta.district}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return `${mesaj}${sistemNotu}`;
  }
}