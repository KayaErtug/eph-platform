import { Injectable, Logger } from "@nestjs/common";
import { CustomerInterestPriority, CustomerStatus, Prisma } from "@prisma/client";

import { CrmService } from "../../crm/crm.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LinaChatDto } from "../dto/lina-chat.dto";
import { LinaAccessService } from "../lina-access.service";
import { LinaActionSourceModule } from "../actions/lina-action.types";
import { LinaCrmExtractionService } from "./lina-crm-extraction.service";
import {
  describeFields,
  expandRooms,
  isCancelWord,
  isConfirmWord,
  isDemandRole,
  mergeDraft,
  mightBeCrmMessage,
  missingKeys,
  missingRequired,
  roleEnum,
  roleToIntent,
  splitName,
  validEmail,
  validPhone,
} from "./lina-draft-logic";
import { bosAlanlar, CrmTaslakAlanlari, HamCikarim, TaslakDurumu } from "./lina-draft.types";
import { LinaLocationValidation, LinaLocationValidatorService } from "./lina-location-validator.service";
import { emptyMaskState, LinaMaskingService } from "./lina-masking.service";

const DRAFT_TTL_MS = 30 * 60 * 1000;
const TUR = "CRM_MUSTERI";

export type LinaDraftFlowResult = {
  handled: boolean;
  success?: boolean;
  message?: string;
  action?: string;
  requiresConfirmation?: boolean;
  data?: unknown;
};

export type LinaScopeDraftContext = { aktifTaslak: boolean; ozet?: string };

type LinaFlowUser = { id?: string; role?: string; email?: string };

@Injectable()
export class LinaDraftFlowService {
  private readonly logger = new Logger(LinaDraftFlowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly masking: LinaMaskingService,
    private readonly extraction: LinaCrmExtractionService,
    private readonly locationValidator: LinaLocationValidatorService,
    private readonly accessService: LinaAccessService,
    private readonly crmService: CrmService,
  ) {}

  // Konu filtresi için: aktif taslak var mı ve neleri içeriyor (kişisel veri içermeyen kısa özet).
  async getScopeContext(userId?: string): Promise<LinaScopeDraftContext> {
    if (!userId) return { aktifTaslak: false };
    try {
      const draft = await this.findActive(userId);
      if (!draft) return { aktifTaslak: false };
      const a = this.readFields(draft.alanlar);
      const parts = [
        a.rol && `rol: ${a.rol}`,
        a.mulkTipi && `mülk: ${a.mulkTipi}`,
        (a.il || a.ilce || a.mahalleler.length) && `konum: ${[a.il, a.ilce, ...a.mahalleler].filter(Boolean).join("/")}`,
        (a.butceMin !== null || a.butceMax !== null) && "bütçe girildi",
      ].filter(Boolean);
      return { aktifTaslak: true, ozet: parts.join("; ") };
    } catch {
      return { aktifTaslak: false };
    }
  }

  async handle(
    body: LinaChatDto,
    user: LinaFlowUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaDraftFlowResult> {
    const result = await this.handleTurn(body, user, sourceModule);
    if (result.handled) await this.recordTurn(String(user?.id || ""), String(body?.message || ""), result);
    return result;
  }

  // Yerel (LLM'siz) turlar dahil her taslak turu konuşma ve denetim tablolarına yazılır; mesaj maskelenmiş saklanır.
  private async recordTurn(userId: string, message: string, result: LinaDraftFlowResult): Promise<void> {
    try {
      const masked = this.masking.mask(message, emptyMaskState()).text.slice(0, 4000);
      const reply = String(result.message || "").slice(0, 4000);
      const conversation = await this.prisma.linaKonusma.create({
        data: { kullaniciId: userId, modul: "CRM", niyet: "MUSTERI_TAKIBI", kullaniciMesaji: masked, linaCevabi: reply },
      });
      await this.prisma.linaDenetim.create({
        data: {
          kullaniciId: userId,
          konusmaId: conversation.id,
          denetimTuru: "BILGI",
          modul: "CRM",
          baslik: `crm_taslak:${result.action || "tur"}`,
          ekVeri: (result.data ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(`LINA_TURN_LOG_FAILED:${error instanceof Error ? error.message.slice(0, 100) : "?"}`);
    }
  }

  private async handleTurn(
    body: LinaChatDto,
    user: LinaFlowUser,
    _sourceModule: LinaActionSourceModule,
  ): Promise<LinaDraftFlowResult> {
    const userId = String(user?.id || "");
    const message = String(body?.message || "").trim();
    if (!userId || !message) return { handled: false };
    if (!this.accessService.checkModuleAccess(user, "crm").allowed) return { handled: false };

    const draft = await this.findActive(userId);

    if (draft && isCancelWord(message)) {
      await this.finish(draft.id, "IPTAL");
      return this.reply("Taslak iptal edildi. Hiçbir kayıt oluşturulmadı.", "confirmation_cancelled");
    }

    if (draft && isConfirmWord(message)) {
      return this.confirm(draft, user);
    }

    if (!draft && !mightBeCrmMessage(message)) return { handled: false };

    // 1) Maskele (numaralı, geri çözülebilir)  2) Şemalı çıkarım  3) Doğrula + birleştir
    const state = draft ? this.masking.decrypt(draft.maskeEsleme) : emptyMaskState();
    const masked = this.masking.mask(message, state);
    const current = draft ? this.readFields(draft.alanlar) : null;

    let ham: HamCikarim;
    try {
      ham = await this.extraction.extract(masked.text, current);
    } catch (error) {
      this.logger.warn(`LINA_CRM_EXTRACTION_FAILED:${error instanceof Error ? error.message.slice(0, 120) : "?"}`);
      if (!draft) return { handled: false };
      return this.reply("Mesajınızı şu anda işleyemedim; taslağınız korunuyor. Lütfen tekrar yazar mısınız?", "crm_customer_create", false, draft.id);
    }

    if (!draft && ham.niyet !== "crm_kayit") return { handled: false };
    if (draft && ham.niyet === "diger") return { handled: false };

    const telefon = validPhone(this.masking.resolveToken(ham.telefon, "TEL", masked.state));
    const email = validEmail(this.masking.resolveToken(ham.email, "EPOSTA", masked.state));

    let konum: LinaLocationValidation | null = null;
    const konumGeldi = Boolean(ham.il || ham.ilce || ham.mahalleler.length);
    if (konumGeldi) {
      konum = await this.locationValidator.validate({
        il: ham.il || current?.il || null,
        ilce: ham.ilce || current?.ilce || null,
        mahalleler: ham.mahalleler,
      });
    }

    const merged = mergeDraft(current ?? bosAlanlar(), ham, { telefon, email, konum });
    const missing = missingRequired(merged);
    const sorular = this.locationQuestions(konum);
    const ready = missing.length === 0 && sorular.length === 0;
    const durum: TaslakDurumu = ready ? "ONAY_BEKLIYOR" : "AKTIF";

    const saved = await this.save(draft?.id, userId, merged, masked.state, durum);
    const mukerrer = ready ? await this.findDuplicate(userId, merged) : null;
    return this.render(saved.id, merged, missing, sorular, ready, ham, konumGeldi, mukerrer ? `${mukerrer.firstName} ${mukerrer.lastName}` : null);
  }

  // ---- Onay: yalnız DB'deki taslağı kaydeder ----
  private async confirm(
    draft: { id: string; alanlar: Prisma.JsonValue; durum: string },
    user: LinaFlowUser,
  ): Promise<LinaDraftFlowResult> {
    const a = this.readFields(draft.alanlar);
    const missing = missingRequired(a);
    if (draft.durum !== "ONAY_BEKLIYOR" || missing.length > 0) {
      const eksik = missing.length ? missing : ["önceki sorumdaki bilginin (ör. konum) tamamlanması"];
      return this.reply(
        `Henüz kaydedemem; kayıt oluşturulmadı. Eksik: ${eksik.join("; ")}.`,
        "crm_customer_create",
        false,
        draft.id,
      );
    }

    const userId = String(user.id);
    const mukerrer = await this.findDuplicate(userId, a);

    try {
      const result = mukerrer
        ? await this.addToExisting(mukerrer.id, userId, user.role, a)
        : await this.createNew(userId, a);
      await this.finish(draft.id, "KAYDEDILDI", { customerId: result.customerId, interestId: result.interestId });
      return {
        handled: true,
        success: true,
        action: "crm_customer_create_with_interest",
        requiresConfirmation: false,
        message: [
          mukerrer
            ? `${a.adSoyad} için mevcut CRM kaydına talep eklendi.`
            : `${a.adSoyad} CRM'e kaydedildi.`,
          ...describeFields(a, (t) => this.mulkEtiketi(t)),
        ].join("\n"),
        data: { customerId: result.customerId, interestId: result.interestId, crmUrl: "/crm", reusedCustomer: Boolean(mukerrer) },
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Kayıt oluşturulamadı.";
      this.logger.warn(`LINA_CRM_COMMIT_FAILED:${reason.slice(0, 160)}`);
      return this.reply(`Kayıt oluşturulamadı: ${reason}\nTaslağınız korunuyor.`, "crm_customer_create", true, draft.id);
    }
  }

  private async createNew(userId: string, a: CrmTaslakAlanlari) {
    const { firstName, lastName } = splitName(a.adSoyad as string);
    const demand = isDemandRole(a.rol);
    const odalar = expandRooms(a.odaSayisi, a.odaEnAz);
    const interestAreas =
      a.il && a.ilce
        ? (a.mahalleler.length ? a.mahalleler : [""]).map((neighborhood) => ({ city: a.il, district: a.ilce, neighborhood }))
        : [];

    const customer = (await this.crmService.createCustomer(userId, {
      firstName,
      lastName,
      phone: a.telefon || undefined,
      email: a.email || undefined,
      city: a.il || undefined,
      budget: a.butceMax ?? a.butceMin ?? undefined,
      interestedArea: [a.il, a.ilce, a.mahalleler.join(", ")].filter(Boolean).join(" / ") || undefined,
      interestedType: a.mulkTipi ? this.mulkEtiketi(a.mulkTipi) : undefined,
      source: "LINA",
      status: CustomerStatus.YENI_LEAD,
      roles: [roleEnum(a.rol as NonNullable<CrmTaslakAlanlari["rol"]>)],
      // Satıcı/kiraya veren için talep (aranan) değil teklif olduğundan mülk bilgisi nota yazılır; talep eşleşmesi tetiklenmez.
      notes: demand ? a.not || undefined : this.supplyNote(a),
      ...(demand
        ? {
            interestAreas,
            minBudget: a.butceMin ?? undefined,
            maxBudget: a.butceMax ?? undefined,
            minArea: a.m2Min ?? undefined,
            maxArea: a.m2Max ?? undefined,
            propertyTypes: a.mulkTipi ? [a.mulkTipi] : [],
            interestStatuses: a.amac ? [a.amac] : [],
            roomCounts: odalar,
            features: a.ozellikler,
            purchaseIntent: roleToIntent(a.rol),
            priority: CustomerInterestPriority.NORMAL,
            interestTitle: this.interestTitle(a),
            interestNotes: a.not || undefined,
          }
        : {}),
    })) as { id: string; interests?: Array<{ id?: string }> };
    return { customerId: customer.id, interestId: customer.interests?.[0]?.id };
  }

  private async addToExisting(customerId: string, userId: string, role: string | undefined, a: CrmTaslakAlanlari) {
    if (!isDemandRole(a.rol)) return { customerId, interestId: undefined };
    const interest = (await this.crmService.addCustomerInterest(customerId, userId, role as never, {
      title: this.interestTitle(a),
      city: a.il,
      district: a.ilce,
      neighborhood: a.mahalleler[0] || null,
      propertyTypes: a.mulkTipi ? [a.mulkTipi] : [],
      statuses: a.amac ? [a.amac] : [],
      minBudget: a.butceMin,
      maxBudget: a.butceMax,
      minArea: a.m2Min,
      maxArea: a.m2Max,
      roomCounts: expandRooms(a.odaSayisi, a.odaEnAz),
      features: a.ozellikler,
      purchaseIntent: roleToIntent(a.rol),
      notes: a.not,
      isActive: true,
    })) as { id?: string };
    return { customerId, interestId: interest?.id };
  }

  private async findDuplicate(userId: string, a: CrmTaslakAlanlari) {
    if (!a.adSoyad) return null;
    const digits = String(a.telefon || "").replace(/\D/g, "").slice(-10);
    const { firstName, lastName } = splitName(a.adSoyad as string);
    return this.prisma.customer.findFirst({
      where: {
        ownerId: userId,
        OR: [
          ...(digits.length === 10 ? [{ phone: { contains: digits } }] : []),
          { firstName: { equals: firstName, mode: "insensitive" as const }, lastName: { equals: lastName, mode: "insensitive" as const } },
        ],
      },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  // ---- Yanıt metni ----
  private render(
    taslakId: string,
    a: CrmTaslakAlanlari,
    missing: string[],
    sorular: string[],
    ready: boolean,
    ham: HamCikarim,
    konumGeldi: boolean,
    mukerrerAd: string | null,
  ): LinaDraftFlowResult {
    const alanlar = describeFields(a, (t) => this.mulkEtiketi(t));
    const lines: string[] = [];
    if (ready) {
      lines.push("Müşteri taslağı hazır. Kaydetmeden önce kontrol edin:");
      lines.push(...alanlar);
      if (mukerrerAd) lines.push(`${mukerrerAd} zaten CRM kayıtlarınızda var. Güncelleyeyim mi? Yeni müşteri açılmaz, talep mevcut kayda eklenir.`);
      lines.push('Doğruysa "Onayla" yazın; düzeltmek için değişecek bilgiyi yazın; vazgeçmek için "İptal" yazın.');
    } else {
      if (alanlar.length) {
        lines.push("Taslağınızda şu an olanlar:", ...alanlar);
      }
      const sor = [...sorular];
      if (missing.length) sor.push(`Eksik: ${missing.join("; ")}.`);
      if (!alanlar.length && !sor.length) sor.push("Müşterinin adı, soyadı ve rolünü (alıcı/satıcı/kiracı/kiraya veren) yazar mısınız?");
      lines.push(...sor);
      lines.push("Henüz kayıt oluşturulmadı.");
    }
    if (!konumGeldi && ham.niyet === "duzeltme_veya_bilgi" && !alanlar.length) {
      lines.unshift("Taslakta bu bilgiyi göremiyorum.");
    }
    return {
      handled: true,
      success: true,
      action: "crm_customer_create",
      requiresConfirmation: ready,
      message: lines.join("\n"),
      data: {
        taslakId,
        eksikler: missing,
        eksikKodlar: missingKeys(a),
        hazir: ready,
        konumSorusu: sorular.length > 0,
        mukerrer: Boolean(mukerrerAd),
      },
    };
  }

  private locationQuestions(konum: LinaLocationValidation | null): string[] {
    if (!konum) return [];
    const out: string[] = [];
    if (konum.dogrulanamayan.length) {
      out.push(`"${konum.dogrulanamayan.join('", "')}" konumunu doğrulayamadım, kaydetmedim. Hangi il/ilçe/mahalle olduğunu yazar mısınız?`);
    }
    if (konum.belirsiz.length) {
      out.push(`"${konum.belirsiz.join('", "')}" birden fazla yerde var veya verdiğiniz il/ilçe ile uyuşmuyor. Hangi il ve ilçedeki yeri kastediyorsunuz?`);
    }
    return out;
  }

  private reply(message: string, action: string, requiresConfirmation = false, taslakId?: string): LinaDraftFlowResult {
    return { handled: true, success: true, message, action, requiresConfirmation, data: taslakId ? { taslakId } : undefined };
  }

  // ---- Kalıcılık ----
  private async findActive(userId: string) {
    return this.prisma.linaTaslak.findFirst({
      where: { kullaniciId: userId, tur: TUR, durum: { in: ["AKTIF", "ONAY_BEKLIYOR"] }, gecerlilikTarihi: { gt: new Date() } },
      orderBy: { guncellenmeTarihi: "desc" },
    });
  }

  private async save(id: string | undefined, userId: string, alanlar: CrmTaslakAlanlari, state: ReturnType<typeof emptyMaskState>, durum: TaslakDurumu) {
    const data = {
      alanlar: alanlar as unknown as Prisma.InputJsonValue,
      maskeEsleme: Object.keys(state.esleme).length ? this.masking.encrypt(state) : null,
      durum,
      sonSonuc: Prisma.DbNull,
      gecerlilikTarihi: new Date(Date.now() + DRAFT_TTL_MS),
    };
    return id
      ? this.prisma.linaTaslak.update({ where: { id }, data })
      : this.prisma.linaTaslak.create({ data: { ...data, kullaniciId: userId, tur: TUR } });
  }

  // Sonuçlanan taslakta kişisel veri (alanlar + maske eşlemesi) temizlenir.
  private async finish(id: string, durum: TaslakDurumu, sonSonuc?: Record<string, unknown>) {
    await this.prisma.linaTaslak.update({
      where: { id },
      data: {
        durum,
        alanlar: bosAlanlar() as unknown as Prisma.InputJsonValue,
        maskeEsleme: null,
        sonSonuc: sonSonuc ? (sonSonuc as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }

  private readFields(json: Prisma.JsonValue): CrmTaslakAlanlari {
    return { ...bosAlanlar(), ...((json && typeof json === "object" && !Array.isArray(json) ? json : {}) as Partial<CrmTaslakAlanlari>) };
  }

  private mulkEtiketi(type: string): string {
    const text = type.toLowerCase().replace(/_/g, " "); // enum adı ASCII: tr-TR küçültme "I"yı "ı" yapardı
    return text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1);
  }

  private interestTitle(a: CrmTaslakAlanlari): string {
    const tur = a.rol === "kiracı" ? "Kiralama Talebi" : "Satın Alma Talebi";
    return a.mulkTipi ? `${this.mulkEtiketi(a.mulkTipi)} — ${tur}` : tur;
  }

  private supplyNote(a: CrmTaslakAlanlari): string {
    const parts = describeFields({ ...a, adSoyad: null, rol: null, telefon: null, email: null, not: null }, (t) => this.mulkEtiketi(t));
    return [`${a.rol === "kiraya veren" ? "Kiraya verilecek" : "Satılacak"} mülk: ${parts.join("; ") || "belirtilmedi"}`, a.not]
      .filter(Boolean)
      .join(" | ");
  }
}
