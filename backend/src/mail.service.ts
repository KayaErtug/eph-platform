import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type RegistrationType =
  | 'EMLAK_DANISMANI'
  | 'EMLAK_OFISI'
  | 'MUTEAHHIT'
  | 'INSAAT_FIRMASI';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure =
      String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    const rejectUnauthorized =
      String(
        process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true',
      ).toLowerCase() === 'true';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.kurumsaleposta.com',
      port: Number.isFinite(smtpPort) ? smtpPort : 587,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      tls: {
        rejectUnauthorized,
      },
    });
  }

  private getRegistrationRequirements(registrationType: RegistrationType) {
    const requirements: Record<
      RegistrationType,
      {
        roleLabel: string;
        requiredDocuments: string;
        controlPoint: string;
      }
    > = {
      EMLAK_DANISMANI: {
        roleLabel: 'Emlak Danışmanı',
        requiredDocuments: 'MYK Seviye 4 veya Seviye 5 Belgesi',
        controlPoint: 'MYK Portal / e-Devlet',
      },
      EMLAK_OFISI: {
        roleLabel: 'Emlak Ofisi',
        requiredDocuments: 'Taşınmaz Ticareti Yetki Belgesi',
        controlPoint: 'TTBS Sistemi / e-Devlet',
      },
      MUTEAHHIT: {
        roleLabel: 'Müteahhit (Bireysel)',
        requiredDocuments: 'YAMBİS Kayıt Belgesi + Vergi Levhası',
        controlPoint: 'ÇŞB Bakanlığı + GİB Doğrulama',
      },
      INSAAT_FIRMASI: {
        roleLabel: 'İnşaat Firması',
        requiredDocuments: 'YAMBİS Kayıt Belgesi + Vergi Levhası',
        controlPoint: 'ÇŞB Bakanlığı + GİB Doğrulama',
      },
    };

    return requirements[registrationType];
  }

  async sendEmailVerificationCode(data: {
    email: string;
    firstName: string;
    code: string;
    expiresInMinutes: number;
    registrationType: RegistrationType;
  }) {
    const fromName = process.env.SMTP_FROM_NAME || 'EPH Platform';
    const fromEmail =
      process.env.SMTP_FROM_EMAIL ||
      process.env.SMTP_USER ||
      'bildirim@emlakportfoyhavuzu.com';
    const requirement = this.getRegistrationRequirements(
      data.registrationType,
    );

    await this.transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.email,
      subject: 'EPH Platform E-posta Doğrulama Kodunuz',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#F4F8FF;padding:24px;">
          <div style="overflow:hidden;border:1px solid #C7D6E8;border-radius:20px;background:#FFFFFF;">
            <div style="background:#2563EB;padding:24px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;">E-posta Adresinizi Doğrulayın</h1>
              <p style="margin:8px 0 0;color:#DBEAFE;font-size:14px;">EPH Platform güvenli üyelik doğrulaması</p>
            </div>

            <div style="padding:28px;color:#1F2937;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Merhaba <strong>${data.firstName}</strong>,</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Üyelik başvurunuzu tamamlamak için aşağıdaki 6 haneli doğrulama kodunu kayıt ekranına girin.</p>

              <div style="margin:24px 0;border:2px dashed #2563EB;border-radius:16px;background:#EFF6FF;padding:22px;text-align:center;">
                <p style="margin:0 0 8px;color:#64748B;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Doğrulama Kodunuz</p>
                <p style="margin:0;color:#06194A;font-family:monospace;font-size:34px;font-weight:900;letter-spacing:8px;">${data.code}</p>
              </div>

              <div style="margin:0 0 18px;border:1px solid #BFDBFE;border-radius:14px;background:#EFF6FF;padding:16px;">
                <p style="margin:0 0 12px;color:#1E3A8A;font-size:14px;font-weight:800;">${requirement.roleLabel} başvuru belgeleri</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="width:138px;padding:7px 0;color:#64748B;font-size:13px;vertical-align:top;">Zorunlu belgeler</td>
                    <td style="padding:7px 0;color:#1F2937;font-size:13px;font-weight:700;line-height:1.6;">${requirement.requiredDocuments}</td>
                  </tr>
                  <tr>
                    <td style="width:138px;padding:7px 0;color:#64748B;font-size:13px;vertical-align:top;">Kontrol noktası</td>
                    <td style="padding:7px 0;color:#1F2937;font-size:13px;font-weight:700;line-height:1.6;">${requirement.controlPoint}</td>
                  </tr>
                </table>
                <p style="margin:10px 0 0;color:#475569;font-size:12px;line-height:1.6;">E-posta doğrulamasından sonra başvurunuzun incelenebilmesi için bu belgeleri hazır bulundurmanız gerekir.</p>
              </div>

              <div style="border:1px solid #E2E8F0;border-radius:12px;background:#F8FAFC;padding:16px;">
                <p style="margin:0;color:#475569;font-size:13px;line-height:1.7;">Bu kod <strong>${data.expiresInMinutes} dakika</strong> boyunca geçerlidir ve yalnızca bir kez kullanılabilir.</p>
                <p style="margin:10px 0 0;color:#475569;font-size:13px;line-height:1.7;">Bu başvuruyu siz yapmadıysanız bu e-postayı dikkate almayın.</p>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  async sendNewApplication(data: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    requestedRole: string;
    referralCode?: string;
  }) {
    const ROLE_LABELS: Record<string, string> = {
      EMLAKCI: 'Emlakçı',
      MUTEAHHIT: 'Müteahhit',
      INSAAT_FIRMASI: 'İnşaat Firması',
      MODERATOR: 'Moderatör',
      ADMIN: 'Admin',
      SUPER_ADMIN: 'Yazılım Ekibi',
    };

    await this.transporter.sendMail({
      from: '"EPH Platform" <bildirim@emlakportfoyhavuzu.com>',
      to: 'info@emlakportfoyhavuzu.com',
      subject: '🆕 Yeni Üyelik Başvurusu',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1557D6;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;">Yeni Üyelik Başvurusu</h2>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#666;width:140px;">Ad Soyad</td><td style="padding:8px 0;font-weight:600;">${data.applicantName}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">E-posta</td><td style="padding:8px 0;font-weight:600;">${data.applicantEmail}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Telefon</td><td style="padding:8px 0;font-weight:600;">${data.applicantPhone}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Rol</td><td style="padding:8px 0;font-weight:600;">${ROLE_LABELS[data.requestedRole] || data.requestedRole}</td></tr>
              ${data.referralCode ? `<tr><td style="padding:8px 0;color:#666;">Referans Kodu</td><td style="padding:8px 0;font-weight:600;">${data.referralCode}</td></tr>` : ''}
            </table>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
              <a href="https://emlakportfoyhavuzu.com/admin" style="background:#1557D6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Admin Paneline Git →</a>
            </div>
          </div>
        </div>
      `,
    });
  }

  async sendApplicationApproved(email: string, name: string) {
    await this.transporter.sendMail({
      from: '"EPH Platform" <bildirim@emlakportfoyhavuzu.com>',
      to: email,
      subject: '✅ EPH Platform - Başvurunuz Onaylandı!',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#16A34A;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;">Başvurunuz Onaylandı! 🎉</h2>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
            <p>Merhaba <strong>${name}</strong>,</p>
            <p>EPH Platform üyelik başvurunuz admin tarafından onaylandı. En kısa sürede size davet bilgileriniz iletilecektir.</p>
            <p style="color:#666;font-size:13px;">Herhangi bir sorunuz için bizimle iletişime geçebilirsiniz.</p>
            <p style="color:#666;">📧 info@emlakportfoyhavuzu.com</p>
          </div>
        </div>
      `,
    });
  }

  async sendReferralInvitation(data: {
    email: string;
    name: string;
    role: string;
    referralCode: string;
    expiresAt?: Date;
  }) {
    const ROLE_LABELS: Record<string, string> = {
      EMLAKCI: 'Gayrimenkul Danışmanı',
      MUTEAHHIT: 'Müteahhit',
      INSAAT_FIRMASI: 'İnşaat Firması',
      MODERATOR: 'Moderatör',
      ADMIN: 'Admin',
      SUPER_ADMIN: 'Yazılım Ekibi',
    };

    const basvuruLink = "https://emlakportfoyhavuzu.com/kayit";
    const sonGecerlilik = data.expiresAt
      ? data.expiresAt.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '30 gün';

    await this.transporter.sendMail({
      from: '"EPH Platform" <bildirim@emlakportfoyhavuzu.com>',
      to: data.email,
      subject: 'EPH Platform Davetiniz Hazır',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#F7FBFF;padding:24px;">
          <div style="background:#ffffff;border:1px solid #DDE7F3;border-radius:24px;overflow:hidden;">
            <div style="background:#1557D6;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">EPH Platform Davetiniz Hazır</h1>
              <p style="color:#DBEAFE;margin:8px 0 0;font-size:14px;">Emlak Portföy Havuzu resmi davet bildirimi</p>
            </div>

            <div style="padding:28px;color:#27364F;">
              <p style="font-size:16px;line-height:1.7;margin:0 0 14px;">Merhaba <strong>${data.name}</strong>,</p>
              <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">EPH Platform'a <strong>${ROLE_LABELS[data.role] || data.role}</strong> rolüyle davet edildiniz. Aşağıdaki referans kodunu kullanarak katılım başvurunuzu oluşturabilirsiniz.</p>

              <div style="background:#EFF6FF;border:2px dashed #1557D6;border-radius:18px;padding:22px;margin:24px 0;text-align:center;">
                <p style="margin:0 0 8px;color:#64748B;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Referans Kodunuz</p>
                <p style="margin:0;color:#06194A;font-size:26px;font-weight:900;letter-spacing:2px;font-family:monospace;">${data.referralCode}</p>
                <p style="margin:12px 0 0;color:#1557D6;font-size:12px;font-weight:800;">Kopyalamak için kodu seçip kopyalayabilirsiniz.</p>
              </div>

              <div style="text-align:center;margin:24px 0;">
                <a href="${basvuruLink}" style="display:inline-block;background:#1557D6;color:#ffffff;text-decoration:none;border-radius:14px;padding:14px 24px;font-size:15px;font-weight:800;">Katılım Başvurusu Oluştur</a>
              </div>

              <div style="margin-top:20px;padding:16px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
                <p style="font-size:13px;line-height:1.7;color:#475569;margin:0;">⏳ Son Geçerlilik Tarihi: <strong>${sonGecerlilik}</strong></p>
                <p style="font-size:13px;line-height:1.7;color:#475569;margin:10px 0 0;">Bu davet kodu yalnızca sizin için oluşturulmuştur ve devredilemez.</p>
                <p style="font-size:13px;line-height:1.7;color:#475569;margin:10px 0 0;">Herhangi bir sorunuz için: <strong>info@emlakportfoyhavuzu.com</strong></p>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  async sendApplicationInvited(email: string, name: string, inviteCode: string) {
    const kayitLink = "https://emlakportfoyhavuzu.com/kayit";
    await this.transporter.sendMail({
      from: '"EPH Platform" <bildirim@emlakportfoyhavuzu.com>',
      to: email,
      subject: '🎉 EPH Platform - Davet Kodunuz Hazır!',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1557D6;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;">Davet Kodunuz Hazır! 🚀</h2>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
            <p>Merhaba <strong>${name}</strong>,</p>
            <p>EPH Platform'a katılmaya davet edildiniz! Aşağıdaki davet kodunuzu kullanarak kayıt işleminizi tamamlayabilirsiniz.</p>
            <div style="background:#EFF6FF;border:2px dashed #1557D6;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
              <p style="margin:0 0 8px;color:#666;font-size:13px;">Davet Kodunuz</p>
              <p style="margin:0;color:#1557D6;font-size:28px;font-weight:700;letter-spacing:3px;font-family:monospace;">${inviteCode}</p>
            </div>
            <div style="margin-top:16px;text-align:center;">
              <a href="${kayitLink}" style="background:#1557D6;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Kayıt Ol →</a>
            </div>
            <p style="color:#999;font-size:11px;margin-top:24px;">Bu davet kodu 30 gün geçerlidir ve yalnızca 1 kez kullanılabilir.</p>
            <p style="color:#666;font-size:12px;">Herhangi bir sorunuz için: info@emlakportfoyhavuzu.com</p>
          </div>
        </div>
      `,
    });
  }

  async sendNewNomination(data: {
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    candidateRole: string;
    nominatorName: string;
    note?: string;
  }) {
    const ROLE_LABELS: Record<string, string> = {
      EMLAKCI: 'Emlakçı',
      MUTEAHHIT: 'Müteahhit',
      INSAAT_FIRMASI: 'İnşaat Firması',
      MODERATOR: 'Moderatör',
      ADMIN: 'Admin',
      SUPER_ADMIN: 'Yazılım Ekibi',
    };

    await this.transporter.sendMail({
      from: '"EPH Platform" <bildirim@emlakportfoyhavuzu.com>',
      to: 'info@emlakportfoyhavuzu.com',
      subject: '👥 Yeni Tavsiye',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#7C3AED;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;">Yeni Tavsiye Geldi</h2>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
            <p style="color:#666;margin:0 0 16px;">Öneren: <strong>${data.nominatorName}</strong></p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#666;width:140px;">Aday Adı</td><td style="padding:8px 0;font-weight:600;">${data.candidateName}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">E-posta</td><td style="padding:8px 0;font-weight:600;">${data.candidateEmail}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Telefon</td><td style="padding:8px 0;font-weight:600;">${data.candidatePhone}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Rol</td><td style="padding:8px 0;font-weight:600;">${ROLE_LABELS[data.candidateRole] || data.candidateRole}</td></tr>
              ${data.note ? `<tr><td style="padding:8px 0;color:#666;">Not</td><td style="padding:8px 0;font-style:italic;">${data.note}</td></tr>` : ''}
            </table>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
              <a href="https://emlakportfoyhavuzu.com/admin" style="background:#7C3AED;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Admin Paneline Git →</a>
            </div>
          </div>
        </div>
      `,
    });
  }

  async sendNewLead(data: {
    fullName?: string;
    phone?: string;
    email?: string;
    profession?: string;
    city?: string;
    interest?: string;
  }) {
    await this.transporter.sendMail({
      from: '"EPH Platform - Lina" <bildirim@emlakportfoyhavuzu.com>',
      to: 'info@emlakportfoyhavuzu.com',
      subject: '🤖 Lina Yeni Lead Topladı',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1557D6;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;">🤖 Lina Yeni Lead</h2>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">AI Asistan üzerinden potansiyel müşteri</p>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
            <table style="width:100%;border-collapse:collapse;">
              ${data.fullName ? `<tr><td style="padding:8px 0;color:#666;width:140px;">Ad Soyad</td><td style="padding:8px 0;font-weight:600;">${data.fullName}</td></tr>` : ''}
              ${data.phone ? `<tr><td style="padding:8px 0;color:#666;">Telefon</td><td style="padding:8px 0;font-weight:600;">${data.phone}</td></tr>` : ''}
              ${data.email ? `<tr><td style="padding:8px 0;color:#666;">E-posta</td><td style="padding:8px 0;font-weight:600;">${data.email}</td></tr>` : ''}
              ${data.profession ? `<tr><td style="padding:8px 0;color:#666;">Meslek</td><td style="padding:8px 0;font-weight:600;">${data.profession}</td></tr>` : ''}
              ${data.city ? `<tr><td style="padding:8px 0;color:#666;">Şehir</td><td style="padding:8px 0;font-weight:600;">${data.city}</td></tr>` : ''}
              ${data.interest ? `<tr><td style="padding:8px 0;color:#666;">İlgi Alanı</td><td style="padding:8px 0;font-weight:600;">${data.interest}</td></tr>` : ''}
            </table>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
              <a href="https://emlakportfoyhavuzu.com/admin" style="background:#1557D6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Lina Leads Paneli →</a>
            </div>
          </div>
        </div>
      `,
    });
  }

  async sendUserApproved(email: string, firstName: string) {
    await this.transporter.sendMail({
      from: '"EPH Platform" <bildirim@emlakportfoyhavuzu.com>',
      to: email,
      subject: '✅ EPH Platform - Hesabınız Onaylandı!',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#16A34A;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;">Hesabınız Onaylandı! 🎉</h2>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
            <p>Merhaba <strong>${firstName}</strong>,</p>
            <p>EPH Platform hesabınız admin tarafından onaylandı. Artık platforma giriş yapabilirsiniz.</p>
            <div style="margin-top:20px;">
              <a href="https://emlakportfoyhavuzu.com/giris" style="background:#16A34A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Platforma Giriş Yap →</a>
            </div>
          </div>
        </div>
      `,
    });
  }

  async sendUserSuspended(email: string, firstName: string) {
    await this.transporter.sendMail({
      from: '"EPH Platform" <bildirim@emlakportfoyhavuzu.com>',
      to: email,
      subject: '⚠️ EPH Platform - Hesabınız Askıya Alındı',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#D97706;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;">Hesabınız Askıya Alındı</h2>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
            <p>Merhaba <strong>${firstName}</strong>,</p>
            <p>EPH Platform hesabınız geçici olarak askıya alınmıştır. Daha fazla bilgi için bizimle iletişime geçebilirsiniz.</p>
            <p style="color:#666;">📧 info@emlakportfoyhavuzu.com</p>
          </div>
        </div>
      `,
    });
  }
}