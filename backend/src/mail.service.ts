import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: 'mail.kurumsaleposta.com',
    port: 587,
    secure: false,
    auth: {
      user: 'bildirim@emlakportfoyhavuzu.com',
      pass: 'EmlaK_635122!Eph',
    },
    tls: { rejectUnauthorized: false },
  });

  async sendNewApplication(data: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    requestedRole: string;
    referralCode?: string;
  }) {
    const ROLE_LABELS: Record<string, string> = {
      EMLAKCI: 'Emlakçı', MUTEAHHIT: 'Müteahhit', INSAAT_FIRMASI: 'İnşaat Firması'
    };
    await this.transporter.sendMail({
      from: '"EPH Platform" <bildirim@emlakportfoyhavuzu.com>',
      to: 'info@emlakportfoyhavuzu.com',
      subject: '🆕 Yeni Üyelik Başvurusu',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#E8380D;padding:20px;border-radius:8px 8px 0 0;">
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
              <a href="https://emlakportfoyhavuzu.com/admin" style="background:#E8380D;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Admin Paneline Git →</a>
            </div>
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
      EMLAKCI: 'Emlakçı', MUTEAHHIT: 'Müteahhit', INSAAT_FIRMASI: 'İnşaat Firması'
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
          <div style="background:#E8380D;padding:20px;border-radius:8px 8px 0 0;">
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
              <a href="https://emlakportfoyhavuzu.com/admin" style="background:#E8380D;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Lina Leads Paneli →</a>
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