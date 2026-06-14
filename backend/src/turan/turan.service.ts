import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type CurrentUserPayload = {
  id?: string;
  role?: Role | string;
};

type TuranQuotePayload = {
  text?: string;
  isActive?: boolean;
  sortOrder?: number;
};

const MAX_QUOTE_LENGTH = 300;

const DEFAULT_TURAN_QUOTES = [
  'Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!',
  "Vatan ne Türkiye'dir Türklere, ne Türkistan; Vatan büyük ve müebbet bir ülkedir Türklere Turan.",
  'Bugünden sonra divanda, dergahta, bargahta, mecliste ve meydanda Türkçeden başka dil kullanılmayacaktır.',
  'Har içinde biten gonca güle minnet eylemem.',
  'Yufka yüreklilerle çetin yollar aşılmaz.',
];

@Injectable()
export class TuranService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(user?: CurrentUserPayload) {
    return user?.role === Role.SUPER_ADMIN || user?.role === 'SUPER_ADMIN';
  }

  private ensureSuperAdmin(user?: CurrentUserPayload) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Bu alan yalnızca Yazılım Ekibi tarafından yönetilebilir.');
    }
  }

  private cleanText(value?: string | null) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  private validateText(value?: string | null) {
    const text = this.cleanText(value);

    if (!text) {
      throw new BadRequestException('Turan sözü boş bırakılamaz.');
    }

    if (text.length > MAX_QUOTE_LENGTH) {
      throw new BadRequestException(`Turan sözü en fazla ${MAX_QUOTE_LENGTH} karakter olabilir.`);
    }

    return text;
  }

  private defaultQuoteItems() {
    return DEFAULT_TURAN_QUOTES.map((text, index) => ({
      id: `default-${index + 1}`,
      text,
      isActive: true,
      sortOrder: index + 1,
      createdById: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      isDefault: true,
    }));
  }

  async findActive() {
    const total = await this.prisma.turanQuote.count();

    if (total === 0) {
      return this.defaultQuoteItems();
    }

    return this.prisma.turanQuote.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findAll(user: CurrentUserPayload) {
    this.ensureSuperAdmin(user);

    return this.prisma.turanQuote.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(user: CurrentUserPayload, payload: TuranQuotePayload) {
    this.ensureSuperAdmin(user);

    const text = this.validateText(payload.text);
    const last = await this.prisma.turanQuote.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.turanQuote.create({
      data: {
        text,
        isActive: payload.isActive ?? true,
        sortOrder: Number.isFinite(Number(payload.sortOrder))
          ? Number(payload.sortOrder)
          : (last?.sortOrder || 0) + 1,
        createdById: user.id || null,
      },
    });
  }

  async update(user: CurrentUserPayload, id: string, payload: TuranQuotePayload) {
    this.ensureSuperAdmin(user);

    const current = await this.prisma.turanQuote.findUnique({ where: { id } });

    if (!current) {
      throw new NotFoundException('Turan sözü bulunamadı.');
    }

    const data: Record<string, unknown> = {};

    if (payload.text !== undefined) {
      data.text = this.validateText(payload.text);
    }

    if (payload.isActive !== undefined) {
      data.isActive = Boolean(payload.isActive);
    }

    if (payload.sortOrder !== undefined) {
      data.sortOrder = Number(payload.sortOrder) || 0;
    }

    return this.prisma.turanQuote.update({
      where: { id },
      data,
    });
  }

  async remove(user: CurrentUserPayload, id: string) {
    this.ensureSuperAdmin(user);

    const current = await this.prisma.turanQuote.findUnique({ where: { id } });

    if (!current) {
      throw new NotFoundException('Turan sözü bulunamadı.');
    }

    await this.prisma.turanQuote.delete({ where: { id } });

    return { ok: true };
  }

  async loadDefaults(user: CurrentUserPayload) {
    this.ensureSuperAdmin(user);

    const existing = await this.prisma.turanQuote.findMany({ select: { text: true } });
    const existingTexts = new Set(existing.map((item) => this.cleanText(item.text).toLocaleLowerCase('tr-TR')));

    const data = DEFAULT_TURAN_QUOTES
      .filter((text) => !existingTexts.has(this.cleanText(text).toLocaleLowerCase('tr-TR')))
      .map((text, index) => ({
        text,
        isActive: true,
        sortOrder: existing.length + index + 1,
        createdById: user.id || null,
      }));

    if (data.length > 0) {
      await this.prisma.turanQuote.createMany({ data });
    }

    return this.findAll(user);
  }
}
