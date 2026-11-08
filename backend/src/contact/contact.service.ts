import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface ContactMailMessage {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}

export type ContactMailSender = (message: ContactMailMessage) => Promise<void>;

export interface ContactBody {
  adSoyad: string;
  eposta: string;
  telefon: string;
  ofisDurumu: 'VAR' | 'YOK';
}

export type ContactValidation =
  | { ok: true; value: ContactBody }
  | { ok: false; fields: string[] };

const EMAIL_RE = /^[^\s@<>",;:]+@[^\s@<>",;:]+\.[^\s@<>",;:]{2,}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

export function validateContactBody(raw: unknown): ContactValidation {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const fields: string[] = [];

  const adSoyad = typeof body.adSoyad === 'string' ? body.adSoyad.trim() : '';
  if (adSoyad.length < 2 || adSoyad.length > 80 || CONTROL_RE.test(adSoyad)) {
    fields.push('adSoyad');
  }

  const eposta = typeof body.eposta === 'string' ? body.eposta.trim() : '';
  if (eposta.length > 254 || !EMAIL_RE.test(eposta)) fields.push('eposta');

  const telefon =
    typeof body.telefon === 'string'
      ? body.telefon.replace(/[\s\-()]/g, '')
      : '';
  if (!/^5\d{9}$/.test(telefon)) fields.push('telefon');

  const ofisDurumu = body.ofisDurumu;
  if (ofisDurumu !== 'VAR' && ofisDurumu !== 'YOK') fields.push('ofisDurumu');

  if (fields.length) return { ok: false, fields };
  return {
    ok: true,
    value: {
      adSoyad,
      eposta,
      telefon,
      ofisDurumu: ofisDurumu as 'VAR' | 'YOK',
    },
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly injectedSender?: ContactMailSender) {}

  isConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
    );
  }

  private defaultSender(): ContactMailSender {
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.isFinite(port) ? port : 587,
      secure:
        String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' ||
        port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return async (message) => {
      await transporter.sendMail(message);
    };
  }

  async send(data: ContactBody): Promise<void> {
    const to = process.env.CONTACT_TO || 'info@emlakportfoyhavuzu.com';
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || to;
    const tarih = new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date());
    const ofis = data.ofisDurumu === 'VAR' ? 'Ofisi var' : 'Ofisi yok';

    const rows: Array<[string, string]> = [
      ['Ad Soyad', data.adSoyad],
      ['E-posta', data.eposta],
      ['Telefon', data.telefon],
      ['Ofis Durumu', ofis],
      ['Tarih', `${tarih} (Europe/Istanbul)`],
    ];
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    const html = `<table style="font-family:Arial,sans-serif;border-collapse:collapse">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px;color:#666">${escapeHtml(k)}</td><td style="padding:6px 12px;font-weight:600">${escapeHtml(v)}</td></tr>`,
      )
      .join('')}</table>`;

    const sender = this.injectedSender ?? this.defaultSender();
    try {
      await sender({
        from,
        to,
        replyTo: data.eposta,
        subject: 'Form Dolduran',
        text,
        html,
      });
    } catch (err) {
      // Kişisel veri loglanmaz; yalnız hata türü.
      this.logger.error(
        `İletişim formu e-postası gönderilemedi: ${(err as Error)?.name ?? 'Error'}`,
      );
      throw err;
    }
  }
}
