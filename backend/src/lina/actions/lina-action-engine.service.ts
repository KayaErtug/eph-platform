import { Injectable } from "@nestjs/common";
import {
  ActivityType,
  CustomerInterestPriority,
  CustomerPurchaseIntent,
  CustomerRole,
  CustomerStatus,
  Role,
  TaskStatus,
  UnitStatus,
  UnitType,
} from "@prisma/client";

import { CrmService } from "../../crm/crm.service";
import { LinaAuditService } from "../lina-audit.service";
import {
  LinaActionExecutionResult,
  LinaActionHistoryItem,
  LinaActionSourceModule,
  LinaActionUser,
  LinaPendingAction,
  LinaResolvedUser,
} from "./lina-action.types";

type CustomerLike = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  budget?: number | null;
  status?: CustomerStatus;
  notes?: string | null;
  interests?: Array<{
    id: string;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
    propertyTypes?: UnitType[];
    statuses?: UnitStatus[];
    maxBudget?: number | null;
    roomCounts?: string[];
    purchaseIntent?: CustomerPurchaseIntent;
    isActive?: boolean;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    dueDate?: Date | string | null;
  }>;
};

type ParsedCustomerFields = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  city?: string;
  budget?: number;
  notes?: string;
};

type ParsedNaturalCrmLead = {
  fullName: string;
  firstName: string;
  lastName: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  maxBudget?: number;
  roomCounts: string[];
  propertyTypes: UnitType[];
  statuses: UnitStatus[];
  purchaseIntent: CustomerPurchaseIntent;
  customerRole: CustomerRole;
  originalText: string;
};

type PendingCrmCreation = {
  userId: string;
  createdAt: number;
  expiresAt: number;
};


const PENDING_ACTION_TTL_MS = 5 * 60 * 1000;
const PENDING_CRM_CREATION_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class LinaActionEngineService {
  private readonly pendingActions = new Map<string, LinaPendingAction>();
  private readonly pendingCrmCreations = new Map<string, PendingCrmCreation>();

  constructor(
    private readonly crmService: CrmService,
    private readonly linaAuditService: LinaAuditService,
  ) {}

  async tryExecute(
    rawMessage: string,
    rawUser: LinaActionUser | undefined,
    sourceModule: LinaActionSourceModule = "general",
    rawHistory: LinaActionHistoryItem[] = [],
  ): Promise<LinaActionExecutionResult> {
    const message = String(rawMessage || "").trim();
    const history = this.normalizeHistory(rawHistory);

    if (!message) {
      return { handled: false };
    }

    const user = this.resolveUser(rawUser);

    if (!user) {
      if (this.looksLikePlatformAction(message)) {
        return {
          handled: true,
          success: false,
          message: "Bu işlemi yapabilmem için EPH Platform hesabınızla giriş yapmanız gerekir.",
        };
      }

      return { handled: false };
    }

    const confirmationResult = await this.handlePendingConfirmation(
      message,
      user,
      sourceModule,
    );

    if (confirmationResult.handled) {
      return confirmationResult;
    }

    try {
      const crmDraftStart = this.handleCrmCreationStart(
        message,
        user,
        sourceModule,
      );

      if (crmDraftStart) {
        return crmDraftStart;
      }

      const crmCreationContextActive = this.hasCrmCreationContext(
        user.id,
        message,
        history,
      );

      if (
        crmCreationContextActive &&
        this.looksLikeNaturalCrmLead(message)
      ) {
        return await this.createCrmCustomerFromNaturalLead(
          message,
          user,
          sourceModule,
        );
      }

      if (this.isInformationalQuestion(message)) {
        return { handled: false };
      }

      if (this.isCrmCustomerListCommand(message)) {
        return await this.listCrmCustomers(user, sourceModule);
      }

      if (this.isCrmCustomerFindCommand(message)) {
        return await this.findCrmCustomer(message, user, sourceModule);
      }

      if (this.isCrmCustomerCreateCommand(message)) {
        return await this.createCrmCustomer(message, user, sourceModule);
      }

      if (this.isCrmCustomerDeleteCommand(message)) {
        return await this.prepareDeleteCrmCustomer(message, user, sourceModule);
      }

      if (this.isCrmStatusUpdateCommand(message)) {
        return await this.updateCrmCustomerStatus(message, user, sourceModule);
      }

      if (this.isCrmTaskCreateCommand(message)) {
        return await this.createCrmTask(message, user, sourceModule);
      }

      if (this.isCrmActivityCreateCommand(message)) {
        return await this.createCrmActivity(message, user, sourceModule);
      }

      if (this.isCrmCustomerUpdateCommand(message)) {
        return await this.updateCrmCustomer(message, user, sourceModule);
      }

      return { handled: false };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Lina işlem motorunda bilinmeyen hata oluştu.";

      this.audit(user, sourceModule, "lina_action_engine", "error", reason, 2);

      return {
        handled: true,
        success: false,
        message: reason,
      };
    }
  }

  private resolveUser(user?: LinaActionUser): LinaResolvedUser | null {
    const id = String(user?.id || "").trim();
    const roleValue = String(user?.role || "")
      .trim()
      .toUpperCase()
      .replaceAll("İ", "I")
      .replaceAll("Ü", "U")
      .replaceAll("Ğ", "G")
      .replaceAll("Ş", "S")
      .replaceAll("Ö", "O")
      .replaceAll("Ç", "C");

    const roleMap: Record<string, Role> = {
      EMLAKCI: Role.EMLAKCI,
      MUTEAHHIT: Role.MUTEAHHIT,
      INSAAT_FIRMASI: Role.INSAAT_FIRMASI,
      ADMIN: Role.ADMIN,
      SUPER_ADMIN: Role.SUPER_ADMIN,
      SUPERADMIN: Role.SUPER_ADMIN,
      MODERATOR: Role.MODERATOR,
    };

    const role = roleMap[roleValue];

    if (!id || !role) {
      return null;
    }

    return {
      id,
      role,
      email: user?.email,
    };
  }

  private normalizeHistory(
    history: LinaActionHistoryItem[],
  ): LinaActionHistoryItem[] {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .slice(-20)
      .map((item) => ({
        role:
          item?.role === "assistant"
            ? ("assistant" as const)
            : ("user" as const),
        content: String(item?.content || "").trim(),
      }))
      .filter((item) => item.content.length > 0);
  }

  private handleCrmCreationStart(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): LinaActionExecutionResult | null {
    const normalized = this.normalize(message)
      .replace(/[.!?]+$/g, "")
      .trim();
    const isStartCommand =
      /^(lina\s+)?(?:yeni\s+)?(?:crm|musteri)\s+(?:kaydi|kayit)\s+(?:olusturalim|acalim|ekleyelim|olustur|ac)$/.test(
        normalized,
      ) ||
      /^(lina\s+)?crm(?:de|e)?\s+(?:yeni\s+)?musteri\s+(?:olusturalim|ekleyelim|olustur)$/.test(
        normalized,
      );

    if (!isStartCommand) {
      return null;
    }

    const now = Date.now();

    this.pendingCrmCreations.set(user.id, {
      userId: user.id,
      createdAt: now,
      expiresAt: now + PENDING_CRM_CREATION_TTL_MS,
    });

    this.audit(user, sourceModule, "crm_customer_create_prepare", "success");

    return {
      handled: true,
      success: true,
      action: "crm_customer_create",
      message:
        "Elbette. CRM kaydı oluşturacağım. Müşterinin ad-soyadını; varsa telefonunu, aradığı il-ilçe-mahalleyi, bütçesini, oda sayısını ve gayrimenkul türünü tek cümlede söyleyin.",
    };
  }

  private hasCrmCreationContext(
    userId: string,
    currentMessage: string,
    history: LinaActionHistoryItem[],
  ): boolean {
    const pending = this.pendingCrmCreations.get(userId);

    if (pending) {
      if (pending.expiresAt >= Date.now()) {
        return true;
      }

      this.pendingCrmCreations.delete(userId);
    }

    const currentNormalized = this.normalize(currentMessage);
    let currentMessageSkipped = false;

    const previousHistory = [...history]
      .reverse()
      .filter((item) => {
        if (
          !currentMessageSkipped &&
          item.role === "user" &&
          this.normalize(item.content) === currentNormalized
        ) {
          currentMessageSkipped = true;
          return false;
        }

        return true;
      })
      .slice(0, 10);

    return previousHistory.some((item) => {
      const normalized = this.normalize(item.content);

      if (item.role === "user") {
        return (
          /(?:crm|musteri).*(?:kaydi|kayit).*(?:olustur|ekle|ac)/.test(
            normalized,
          ) ||
          /(?:olustur|ekle|ac).*(?:crm|musteri).*(?:kaydi|kayit)/.test(
            normalized,
          )
        );
      }

      return (
        normalized.includes("crm kaydi olusturacagim") ||
        normalized.includes("musterinin ad soyadini") ||
        normalized.includes("musteri bilgilerini soyleyin")
      );
    });
  }

  private looksLikeNaturalCrmLead(message: string): boolean {
    const normalized = this.normalize(message);
    const firstSegment = String(message || "").split(",")[0]?.trim() || "";
    const nameParts = this.splitPersonName(firstSegment);

    if (!nameParts) {
      return false;
    }

    return (
      /(satin almak istiyor|kiralamak istiyor|yatirim yapmak istiyor|daire ariyor|villa ariyor|arsa ariyor|gayrimenkul ariyor)/.test(
        normalized,
      ) ||
      (
        /(milyon|bin|tl|₺|butce|kadar)/.test(normalized) &&
        /(daire|villa|rezidans|mustakil ev|arsa|tarla|dukkan|ofis)/.test(
          normalized,
        )
      )
    );
  }

  private async createCrmCustomerFromNaturalLead(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const lead = this.parseNaturalCrmLead(message);

    if (!lead) {
      return {
        handled: true,
        success: false,
        message:
          "CRM kaydını oluşturmak istediğinizi anladım; ancak müşteri adı veya talep ayrıntılarından bazılarını ayıramadım. Ad-soyadı, konum, bütçe ve gayrimenkul türünü tek cümlede tekrar söyleyin.",
      };
    }

    const customers = (await this.crmService.getCustomers(
      user.id,
      user.role,
    )) as CustomerLike[];

    const existingCustomer = customers.find(
      (customer) =>
        this.normalize(this.customerFullName(customer)) ===
        this.normalize(lead.fullName),
    );

    let customer: CustomerLike;
    let createdNewCustomer = false;

    if (existingCustomer) {
      customer = (await this.crmService.getCustomer(
        existingCustomer.id,
        user.id,
        user.role,
      )) as CustomerLike;

      const duplicateInterest = customer.interests?.find((interest) => {
        const sameCity =
          this.normalize(interest.city || "") ===
          this.normalize(lead.city || "");
        const sameDistrict =
          this.normalize(interest.district || "") ===
          this.normalize(lead.district || "");
        const sameNeighborhood =
          this.normalize(interest.neighborhood || "") ===
          this.normalize(lead.neighborhood || "");
        const sameRoom =
          lead.roomCounts.length === 0 ||
          lead.roomCounts.some((roomCount) =>
            interest.roomCounts?.includes(roomCount),
          );
        const sameType =
          lead.propertyTypes.length === 0 ||
          lead.propertyTypes.some((propertyType) =>
            interest.propertyTypes?.includes(propertyType),
          );

        return (
          interest.isActive !== false &&
          sameCity &&
          sameDistrict &&
          sameNeighborhood &&
          sameRoom &&
          sameType
        );
      });

      if (duplicateInterest) {
        this.pendingCrmCreations.delete(user.id);

        return {
          handled: true,
          success: true,
          action: "crm_customer_create_with_interest",
          message: `${lead.fullName} için aynı konum ve özelliklerde aktif bir CRM talebi zaten bulunuyor. Tekrar kayıt oluşturmadım.`,
          data: {
            customerId: customer.id,
            interestId: duplicateInterest.id,
            reusedCustomer: true,
          },
        };
      }
    } else {
      customer = (await this.crmService.createCustomer(user.id, {
        firstName: lead.firstName,
        lastName: lead.lastName,
        city: lead.city,
        budget: lead.maxBudget,
        interestedArea: [lead.city, lead.district, lead.neighborhood]
          .filter(Boolean)
          .join(" / "),
        interestedType: lead.propertyTypes[0],
        source: "LINA",
        status: CustomerStatus.YENI_LEAD,
        roles: [lead.customerRole],
        notes: lead.originalText,
      })) as CustomerLike;

      createdNewCustomer = true;
    }

    try {
      const interest = await this.crmService.addCustomerInterest(
        customer.id,
        user.id,
        user.role,
        {
          title: this.buildNaturalLeadTitle(lead),
          city: lead.city,
          district: lead.district,
          neighborhood: lead.neighborhood,
          propertyTypes: lead.propertyTypes,
          statuses: lead.statuses,
          maxBudget: lead.maxBudget,
          priceCurrency: "TRY",
          roomCounts: lead.roomCounts,
          purchaseIntent: lead.purchaseIntent,
          priority: CustomerInterestPriority.NORMAL,
          notes: lead.originalText,
          isActive: true,
        },
      );

      this.pendingCrmCreations.delete(user.id);
      this.audit(
        user,
        sourceModule,
        "crm_customer_create_with_interest",
        "success",
      );

      const locationText = [
        lead.city,
        lead.district,
        lead.neighborhood,
      ]
        .filter(Boolean)
        .join(" / ");
      const budgetText =
        typeof lead.maxBudget === "number"
          ? `${new Intl.NumberFormat("tr-TR").format(lead.maxBudget)} ₺`
          : "Belirtilmedi";
      const roomText =
        lead.roomCounts.length > 0
          ? lead.roomCounts.join(", ")
          : "Oda sayısı belirtilmedi";
      const propertyText = lead.propertyTypes
        .map((type) => this.propertyTypeLabel(type))
        .join(", ");

      return {
        handled: true,
        success: true,
        action: "crm_customer_create_with_interest",
        message: [
          `${lead.fullName} için CRM kaydı ve müşteri talebi oluşturuldu.`,
          locationText ? `Konum: ${locationText}` : null,
          `Talep: ${roomText} ${propertyText || "gayrimenkul"}`,
          `Üst bütçe: ${budgetText}`,
        ]
          .filter(Boolean)
          .join("\n"),
        data: {
          customer,
          interest,
          reusedCustomer: !createdNewCustomer,
        },
      };
    } catch (error) {
      if (createdNewCustomer) {
        try {
          await this.crmService.deleteCustomer(
            customer.id,
            user.id,
            user.role,
          );
        } catch {
          // Asıl hata korunur; geri alma hatası kullanıcıya ayrıca yansıtılmaz.
        }
      }

      throw error;
    }
  }

  private parseNaturalCrmLead(
    message: string,
  ): ParsedNaturalCrmLead | null {
    const text = String(message || "")
      .replace(/\s+/g, " ")
      .trim();
    const fullName = text.split(",")[0]?.trim() || "";
    const nameParts = this.splitPersonName(fullName);

    if (!nameParts) {
      return null;
    }

    const normalized = this.normalize(text);
    const locationMatch = text.match(
      /,\s*([A-Za-zÇĞİÖŞÜçğıöşü-]+)\s+([A-Za-zÇĞİÖŞÜçğıöşü\s-]+?)\s+ilçesi\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9\s-]+?)\s+mahallesi(?:nde|nda|de|da)?\b/i,
    );
    const budgetMatch = text.match(
      /([\d.,]+)\s*(milyon|bin)?\s*(?:tl|₺|türk lirası)?(?:['’]?(?:ye|ya|e|a))?\s+kadar/i,
    );
    const roomMatch = text.match(
      /\b(\d+(?:[,.]5)?\s*\+\s*\d+)\b/,
    );

    const propertyTypes = this.extractNaturalLeadPropertyTypes(normalized);
    const purchaseIntent = this.extractNaturalLeadPurchaseIntent(normalized);
    const statuses =
      purchaseIntent === CustomerPurchaseIntent.KIRALAMA
        ? [UnitStatus.KIRALIK]
        : [UnitStatus.SATILIK];
    const customerRole =
      purchaseIntent === CustomerPurchaseIntent.KIRALAMA
        ? CustomerRole.KIRACI
        : purchaseIntent === CustomerPurchaseIntent.YATIRIM
          ? CustomerRole.YATIRIMCI
          : CustomerRole.ALICI;

    return {
      fullName: this.titleCase(fullName),
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      city: locationMatch?.[1]?.trim(),
      district: locationMatch?.[2]?.trim(),
      neighborhood: locationMatch?.[3]?.trim(),
      maxBudget: budgetMatch
        ? this.parseTurkishMoney(budgetMatch[1], budgetMatch[2])
        : undefined,
      roomCounts: roomMatch
        ? [roomMatch[1].replace(/\s+/g, "").replace(",", ".")]
        : [],
      propertyTypes,
      statuses,
      purchaseIntent,
      customerRole,
      originalText: text,
    };
  }

  private extractNaturalLeadPropertyTypes(
    normalizedMessage: string,
  ): UnitType[] {
    const mappings: Array<[RegExp, UnitType]> = [
      [/\bmustakil ev\b/, UnitType.MUSTAK_EV],
      [/\bdukkan\b|\bmagaza\b/, UnitType.DUKKAN_MAGAZA],
      [/\bofis\b|\bburo\b/, UnitType.OFIS_BURO],
      [/\brezidans\b/, UnitType.REZIDANS],
      [/\bvilla\b/, UnitType.VILLA],
      [/\bdubleks\b/, UnitType.DAIRE],
      [/\bdaire\b/, UnitType.DAIRE],
      [/\bkonut\b/, UnitType.DAIRE],
      [/\barsa\b/, UnitType.ARSA],
      [/\btarla\b/, UnitType.TARLA],
    ];

    const propertyTypes = mappings
      .filter(([pattern]) => pattern.test(normalizedMessage))
      .map(([, propertyType]) => propertyType);

    return Array.from(new Set(propertyTypes));
  }

  private extractNaturalLeadPurchaseIntent(
    normalizedMessage: string,
  ): CustomerPurchaseIntent {
    if (/(kiralamak|kiralik|kiralama)/.test(normalizedMessage)) {
      return CustomerPurchaseIntent.KIRALAMA;
    }

    if (/(yatirim|yatirimlik)/.test(normalizedMessage)) {
      return CustomerPurchaseIntent.YATIRIM;
    }

    return CustomerPurchaseIntent.SATIN_ALMA;
  }

  private buildNaturalLeadTitle(lead: ParsedNaturalCrmLead): string {
    const roomText =
      lead.roomCounts.length > 0
        ? `${lead.roomCounts.join(", ")} `
        : "";
    const typeText =
      lead.propertyTypes.length > 0
        ? lead.propertyTypes
            .map((type) => this.propertyTypeLabel(type))
            .join(", ")
        : "Gayrimenkul";
    const intentText =
      lead.purchaseIntent === CustomerPurchaseIntent.KIRALAMA
        ? "Kiralama Talebi"
        : lead.purchaseIntent === CustomerPurchaseIntent.YATIRIM
          ? "Yatırım Talebi"
          : "Satın Alma Talebi";

    return `${roomText}${typeText} — ${intentText}`;
  }

  private propertyTypeLabel(type: UnitType): string {
    const labels: Partial<Record<UnitType, string>> = {
      [UnitType.DAIRE]: "Daire",
      [UnitType.VILLA]: "Villa",
      [UnitType.REZIDANS]: "Rezidans",
      [UnitType.MUSTAK_EV]: "Müstakil Ev",
      [UnitType.DUKKAN_MAGAZA]: "Dükkan / Mağaza",
      [UnitType.OFIS_BURO]: "Ofis / Büro",
      [UnitType.ARSA]: "Arsa",
      [UnitType.TARLA]: "Tarla",
    };

    return labels[type] || String(type).replaceAll("_", " ");
  }

  private looksLikePlatformAction(message: string): boolean {
    const normalized = this.normalize(message);

    return (
      /(ekle|kaydet|olustur|guncelle|degistir|sil|tamamla|iptal et|not ekle|gorev ekle)/.test(
        normalized,
      ) &&
      /(crm|musteri|forum|network|portfoy|havuz|gorev|mesaj)/.test(normalized)
    );
  }

  private isInformationalQuestion(message: string): boolean {
    const normalized = this.normalize(message);

    return (
      normalized.includes("nasil ") ||
      normalized.endsWith(" nasil") ||
      normalized.includes("miyim") ||
      normalized.includes("miyiz") ||
      normalized.includes("mumkun mu") ||
      normalized.includes("ne yapmaliyim") ||
      normalized.includes("anlat")
    );
  }

  private isCrmCustomerListCommand(message: string): boolean {
    const normalized = this.normalize(message);

    return (
      normalized.includes("crm") &&
      (
        normalized.includes("musterilerimi listele") ||
        normalized.includes("musterileri listele") ||
        normalized.includes("musteri listesi") ||
        normalized.includes("kac musterim") ||
        normalized.includes("musteri sayim") ||
        normalized.includes("crm ozeti")
      )
    );
  }

  private isCrmCustomerFindCommand(message: string): boolean {
    const normalized = this.normalize(message);

    return (
      /(crm|musteri)/.test(normalized) &&
      /(bul|goster|getir|ara)/.test(normalized) &&
      !/(gorev|aktivite|not ekle|durumunu|statusunu)/.test(normalized)
    );
  }

  private isCrmCustomerCreateCommand(message: string): boolean {
    const normalized = this.normalize(message);
    const isNestedCrmAction =
      /(gorev|aktivite|ilgi|talep)\s*(?:ekle|kaydet|olustur)/.test(
        normalized,
      ) ||
      /(not ekle|gorusme ekle|telefon gorusmesi|whatsapp gorusmesi|yer gosterimi ekle|teklif ekle)/.test(
        normalized,
      );

    return (
      /(crm|musteri)/.test(normalized) &&
      /(ekle|kaydet|olustur)/.test(normalized) &&
      !isNestedCrmAction
    );
  }

  private isCrmCustomerDeleteCommand(message: string): boolean {
    const normalized = this.normalize(message);

    return (
      /(crm|musteri)/.test(normalized) &&
      /(sil|kaldir)/.test(normalized) &&
      !/(gorev|aktivite|not|ilgi|talep)/.test(normalized)
    );
  }

  private isCrmStatusUpdateCommand(message: string): boolean {
    const normalized = this.normalize(message);

    return (
      /(crm|musteri)/.test(normalized) &&
      /(durum|status|asama)/.test(normalized) &&
      /(guncelle|degistir|yap|al)/.test(normalized)
    );
  }

  private isCrmTaskCreateCommand(message: string): boolean {
    const normalized = this.normalize(message);

    return (
      normalized.includes("gorev") &&
      /(ekle|olustur|kaydet|hatirlat)/.test(normalized) &&
      /(musteri|crm|icin)/.test(normalized)
    );
  }

  private isCrmActivityCreateCommand(message: string): boolean {
    const normalized = this.normalize(message);

    return (
      /(not ekle|aktivite ekle|gorusme ekle|telefon gorusmesi|whatsapp gorusmesi|yer gosterimi ekle|teklif ekle)/.test(
        normalized,
      ) &&
      /(musteri|crm|icin|ile)/.test(normalized)
    );
  }

  private isCrmCustomerUpdateCommand(message: string): boolean {
    const normalized = this.normalize(message);

    return (
      /(crm|musteri)/.test(normalized) &&
      /(telefon|e posta|email|sehir|il|butce|not)/.test(normalized) &&
      /(guncelle|degistir|duzelt)/.test(normalized)
    );
  }

  private async listCrmCustomers(
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const customers = (await this.crmService.getCustomers(
      user.id,
      user.role,
    )) as CustomerLike[];

    const firstCustomers = customers.slice(0, 10);
    const lines = firstCustomers.map((customer, index) => {
      const fullName = this.customerFullName(customer);
      const phone = customer.phone ? ` — ${customer.phone}` : "";
      return `${index + 1}. ${fullName}${phone}`;
    });

    const suffix =
      customers.length > firstCustomers.length
        ? `\n\nİlk 10 kayıt gösterildi. Toplam ${customers.length} CRM kaydınız var.`
        : `\n\nToplam ${customers.length} CRM kaydınız var.`;

    this.audit(user, sourceModule, "crm_customer_list", "success");

    return {
      handled: true,
      success: true,
      action: "crm_customer_list",
      message:
        customers.length === 0
          ? "CRM’inizde henüz müşteri kaydı bulunmuyor."
          : `CRM müşteri listeniz:\n\n${lines.join("\n")}${suffix}`,
      data: {
        total: customers.length,
        customers: firstCustomers.map((customer) => ({
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          email: customer.email,
          city: customer.city,
          status: customer.status,
        })),
      },
    };
  }

  private async findCrmCustomer(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const customerName = this.extractCustomerName(message, [
      "bul",
      "göster",
      "goster",
      "getir",
      "ara",
    ]);

    if (!customerName) {
      return this.missingCustomerName();
    }

    const resolution = await this.resolveCustomer(customerName, user);

    if (!("customer" in resolution)) {
      return resolution;
    }

    const customer = resolution.customer;
    const taskCount = Array.isArray(customer.tasks) ? customer.tasks.length : 0;

    this.audit(user, sourceModule, "crm_customer_find", "success");

    return {
      handled: true,
      success: true,
      action: "crm_customer_find",
      message: [
        `${this.customerFullName(customer)} CRM kaydı bulundu.`,
        customer.phone ? `Telefon: ${customer.phone}` : null,
        customer.email ? `E-posta: ${customer.email}` : null,
        customer.city ? `Şehir: ${customer.city}` : null,
        customer.status ? `Durum: ${this.customerStatusLabel(customer.status)}` : null,
        typeof customer.budget === "number"
          ? `Bütçe: ${new Intl.NumberFormat("tr-TR").format(customer.budget)} ₺`
          : null,
        `Bekleyen görev: ${taskCount}`,
        customer.notes ? `Not: ${customer.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      data: customer,
    };
  }

  private async createCrmCustomer(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const fields = this.extractCustomerFields(message);
    const customerName = this.extractCustomerName(message, [
      "ekle",
      "kaydet",
      "oluştur",
      "olustur",
    ]);

    if (!customerName) {
      return this.missingCustomerName();
    }

    const nameParts = this.splitPersonName(customerName);

    if (!nameParts) {
      return {
        handled: true,
        success: false,
        message:
          "CRM müşterisini ekleyebilmem için ad ve soyadı birlikte söyleyin. Örnek: “CRM’e Ahmet Yılmaz adlı müşteri ekle, telefonu 0532 000 00 00.”",
      };
    }

    const customers = (await this.crmService.getCustomers(
      user.id,
      user.role,
    )) as CustomerLike[];

    const duplicate = customers.find((customer) => {
      const sameName =
        this.normalize(this.customerFullName(customer)) ===
        this.normalize(`${nameParts.firstName} ${nameParts.lastName}`);
      const samePhone =
        fields.phone &&
        customer.phone &&
        this.onlyDigits(fields.phone) === this.onlyDigits(customer.phone);
      const sameEmail =
        fields.email &&
        customer.email &&
        fields.email.toLocaleLowerCase("tr-TR") ===
          customer.email.toLocaleLowerCase("tr-TR");

      return sameName || samePhone || sameEmail;
    });

    if (duplicate) {
      return {
        handled: true,
        success: false,
        message: `${this.customerFullName(duplicate)} adına ait bir CRM kaydı zaten bulunuyor. Tekrar kayıt oluşturmadım.`,
        data: {
          customerId: duplicate.id,
        },
      };
    }

    const created = (await this.crmService.createCustomer(user.id, {
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      phone: fields.phone,
      email: fields.email,
      city: fields.city,
      budget: fields.budget,
      notes: fields.notes,
      source: "LINA",
    })) as CustomerLike;

    this.audit(user, sourceModule, "crm_customer_create", "success");

    return {
      handled: true,
      success: true,
      action: "crm_customer_create",
      message: `${this.customerFullName(created)} CRM’e başarıyla eklendi.`,
      data: created,
    };
  }

  private async updateCrmCustomer(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const customerName = this.extractCustomerName(message, [
      "güncelle",
      "guncelle",
      "değiştir",
      "degistir",
      "düzelt",
      "duzelt",
    ]);

    if (!customerName) {
      return this.missingCustomerName();
    }

    const resolution = await this.resolveCustomer(customerName, user);

    if (!("customer" in resolution)) {
      return resolution;
    }

    const fields = this.extractCustomerFields(message);
    const data: Record<string, unknown> = {};

    if (fields.phone) data.phone = fields.phone;
    if (fields.email) data.email = fields.email;
    if (fields.city) data.city = fields.city;
    if (typeof fields.budget === "number") data.budget = fields.budget;
    if (fields.notes) data.notes = fields.notes;

    if (Object.keys(data).length === 0) {
      return {
        handled: true,
        success: false,
        message:
          "Güncellenecek alanı anlayamadım. Telefon, e-posta, şehir, bütçe veya not bilgisini açıkça söyleyin.",
      };
    }

    const updated = (await this.crmService.updateCustomer(
      resolution.customer.id,
      user.id,
      user.role,
      data,
    )) as CustomerLike;

    this.audit(user, sourceModule, "crm_customer_update", "success");

    return {
      handled: true,
      success: true,
      action: "crm_customer_update",
      message: `${this.customerFullName(updated)} CRM kaydı güncellendi.`,
      data: updated,
    };
  }

  private async updateCrmCustomerStatus(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const customerName = this.extractCustomerName(message, [
      "durum",
      "status",
      "aşama",
      "asama",
    ]);

    if (!customerName) {
      return this.missingCustomerName();
    }

    const status = this.extractCustomerStatus(message);

    if (!status) {
      return {
        handled: true,
        success: false,
        message:
          "CRM durumunu anlayamadım. Kullanılabilir durumlar: Yeni Lead, İlk Görüşme, Portföy Gönderildi, Yer Gösterimi, Teklif Süreci, Pazarlık, Kapandı ve Kaybedildi.",
      };
    }

    const resolution = await this.resolveCustomer(customerName, user);

    if (!("customer" in resolution)) {
      return resolution;
    }

    const updated = (await this.crmService.updateStatus(
      resolution.customer.id,
      user.id,
      user.role,
      status,
    )) as CustomerLike;

    this.audit(user, sourceModule, "crm_customer_status_update", "success");

    return {
      handled: true,
      success: true,
      action: "crm_customer_status_update",
      message: `${this.customerFullName(updated)} CRM durumu “${this.customerStatusLabel(status)}” olarak güncellendi.`,
      data: updated,
    };
  }

  private async prepareDeleteCrmCustomer(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const customerName = this.extractCustomerName(message, [
      "sil",
      "kaldır",
      "kaldir",
    ]);

    if (!customerName) {
      return this.missingCustomerName();
    }

    const resolution = await this.resolveCustomer(customerName, user);

    if (!("customer" in resolution)) {
      return resolution;
    }

    const fullName = this.customerFullName(resolution.customer);
    const now = Date.now();

    this.pendingActions.set(user.id, {
      type: "crm_customer_delete",
      userId: user.id,
      createdAt: now,
      expiresAt: now + PENDING_ACTION_TTL_MS,
      payload: {
        customerId: resolution.customer.id,
        customerName: fullName,
      },
    });

    this.audit(
      user,
      sourceModule,
      "crm_customer_delete_prepare",
      "allowed",
      undefined,
      2,
    );

    return {
      handled: true,
      success: true,
      action: "crm_customer_delete",
      requiresConfirmation: true,
      message: `${fullName} adlı CRM kaydı ve bağlı CRM verileri silinecek. Onaylamak için 5 dakika içinde yalnızca “Onayla” deyin. Vazgeçmek için “İptal” deyin.`,
    };
  }

  private async createCrmTask(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const customerName = this.extractCustomerName(message, [
      "görev",
      "gorev",
      "hatırlat",
      "hatirlat",
    ]);

    if (!customerName) {
      return this.missingCustomerName();
    }

    const resolution = await this.resolveCustomer(customerName, user);

    if (!("customer" in resolution)) {
      return resolution;
    }

    const title = this.extractTaskTitle(message, customerName);
    const dueDate = this.extractDueDate(message);

    const task = await this.crmService.addTask(
      resolution.customer.id,
      user.id,
      user.role,
      {
        title,
        dueDate: dueDate?.toISOString(),
      },
    );

    this.audit(user, sourceModule, "crm_task_create", "success");

    const dueText = dueDate
      ? ` Tarih: ${new Intl.DateTimeFormat("tr-TR", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Europe/Istanbul",
        }).format(dueDate)}.`
      : "";

    return {
      handled: true,
      success: true,
      action: "crm_task_create",
      message: `${this.customerFullName(resolution.customer)} için “${title}” görevi oluşturuldu.${dueText}`,
      data: task,
    };
  }

  private async createCrmActivity(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const customerName = this.extractCustomerName(message, [
      "not",
      "aktivite",
      "görüşme",
      "gorusme",
      "telefon",
      "whatsapp",
      "yer gösterimi",
      "yer gosterimi",
      "teklif",
    ]);

    if (!customerName) {
      return this.missingCustomerName();
    }

    const resolution = await this.resolveCustomer(customerName, user);

    if (!("customer" in resolution)) {
      return resolution;
    }

    const note = this.extractActivityNote(message);

    if (!note) {
      return {
        handled: true,
        success: false,
        message:
          "Aktivite notunu anlayamadım. Örnek: “Ahmet Yılmaz için telefon görüşmesi ekle: Cuma günü tekrar aranacak.”",
      };
    }

    const type = this.extractActivityType(message);
    const activity = await this.crmService.addActivity(
      resolution.customer.id,
      user.id,
      user.role,
      {
        type,
        note,
      },
    );

    this.audit(user, sourceModule, "crm_activity_create", "success");

    return {
      handled: true,
      success: true,
      action: "crm_activity_create",
      message: `${this.customerFullName(resolution.customer)} CRM kaydına ${this.activityTypeLabel(type)} aktivitesi eklendi.`,
      data: activity,
    };
  }

  private async handlePendingConfirmation(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const pending = this.pendingActions.get(user.id);

    if (!pending) {
      return { handled: false };
    }

    if (pending.expiresAt < Date.now()) {
      this.pendingActions.delete(user.id);

      if (this.isConfirmationWord(message) || this.isCancellationWord(message)) {
        return {
          handled: true,
          success: false,
          message: "Bekleyen işlem onay süresi doldu. İşlemi yeniden söyleyin.",
        };
      }

      return { handled: false };
    }

    if (this.isCancellationWord(message)) {
      this.pendingActions.delete(user.id);
      this.audit(user, sourceModule, "lina_action_cancel", "success");

      return {
        handled: true,
        success: true,
        action: "confirmation_cancelled",
        message: "Bekleyen işlem iptal edildi.",
      };
    }

    if (!this.isConfirmationWord(message)) {
      return { handled: false };
    }

    if (pending.type === "crm_customer_delete") {
      await this.crmService.deleteCustomer(
        pending.payload.customerId,
        user.id,
        user.role,
      );

      this.pendingActions.delete(user.id);
      this.audit(user, sourceModule, "crm_customer_delete", "success", undefined, 3);

      return {
        handled: true,
        success: true,
        action: "crm_customer_delete",
        message: `${pending.payload.customerName} adlı CRM kaydı silindi.`,
      };
    }

    return { handled: false };
  }

  private async resolveCustomer(
    nameQuery: string,
    user: LinaResolvedUser,
  ): Promise<
    | { customer: CustomerLike }
    | LinaActionExecutionResult
  > {
    const customers = (await this.crmService.getCustomers(
      user.id,
      user.role,
    )) as CustomerLike[];
    const normalizedQuery = this.normalize(nameQuery);

    const exactMatches = customers.filter(
      (customer) =>
        this.normalize(this.customerFullName(customer)) === normalizedQuery,
    );

    if (exactMatches.length === 1) {
      const customer = (await this.crmService.getCustomer(
        exactMatches[0].id,
        user.id,
        user.role,
      )) as CustomerLike;

      return { customer };
    }

    const partialMatches = customers.filter((customer) => {
      const fullName = this.normalize(this.customerFullName(customer));
      return (
        fullName.includes(normalizedQuery) ||
        normalizedQuery.includes(fullName)
      );
    });

    if (partialMatches.length === 1) {
      const customer = (await this.crmService.getCustomer(
        partialMatches[0].id,
        user.id,
        user.role,
      )) as CustomerLike;

      return { customer };
    }

    if (partialMatches.length > 1) {
      const names = partialMatches
        .slice(0, 5)
        .map((customer) => this.customerFullName(customer))
        .join(", ");

      return {
        handled: true,
        success: false,
        message: `Birden fazla eşleşen CRM kaydı bulundu: ${names}. Lütfen ad ve soyadı birlikte söyleyin.`,
      };
    }

    return {
      handled: true,
      success: false,
      message: `${nameQuery} adına ait CRM kaydı bulunamadı.`,
    };
  }

  private extractCustomerName(
    message: string,
    stopWords: string[],
  ): string | null {
    const text = String(message || "")
      .replace(/\s+/g, " ")
      .trim();

    const patterns: RegExp[] = [
      /(?:crm['’]?(?:e|ye|de|den)?\s+)(.+?)(?:\s+(?:adlı|isimli)\s+)?(?:müşteri(?:yi|si)?\s+)?(?:ekle|kaydet|oluştur|olustur|sil|kaldır|kaldir|bul|göster|goster|getir|ara)\b/i,
      /^(.+?)(?:['’](?:ı|i|u|ü|yi|yı|yu|yü|ın|in|un|ün))?\s+(?:adlı|isimli\s+)?(?:müşteri(?:yi|si)?\s+)?crm['’]?(?:e|ye|de|den)?\s+(?:ekle|kaydet|oluştur|olustur|sil|kaldır|kaldir|bul|göster|goster|getir|ara)\b/i,
      /^(.+?)(?:['’](?:ın|in|un|ün|a|e|ya|ye))?\s+(?:için\s+)?(?:görev|gorev|not|aktivite|telefon görüşmesi|telefon gorusmesi|whatsapp görüşmesi|whatsapp gorusmesi|yer gösterimi|yer gosterimi|teklif)\b/i,
      /(?:müşteri|crm kaydı|crm kaydi)\s+(.+?)(?:['’](?:ın|in|un|ün|ı|i|u|ü|a|e|ya|ye))?\s+(?:durum|status|aşama|asama|telefon|e[- ]?posta|email|şehir|sehir|il|bütçe|butce|not)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      const candidate = this.cleanExtractedName(match?.[1]);

      if (candidate) {
        return candidate;
      }
    }

    const normalizedStops = stopWords
      .map((word) => this.escapeRegExp(word))
      .join("|");

    const fallbackPatterns = [
      new RegExp(
        `(?:müşteri|crm kaydı|crm kaydi)\\s+(.+?)(?:['’](?:ın|in|un|ün|ı|i|u|ü|a|e|ya|ye))?\\s+(?:${normalizedStops})\\b`,
        "i",
      ),
      new RegExp(
        `^(.+?)(?:['’](?:ın|in|un|ün|ı|i|u|ü|a|e|ya|ye))?\\s+.*?(?:${normalizedStops})\\b`,
        "i",
      ),
    ];

    for (const pattern of fallbackPatterns) {
      const match = text.match(pattern);
      const candidate = this.cleanExtractedName(match?.[1]);

      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  private cleanExtractedName(value?: string): string | null {
    if (!value) {
      return null;
    }

    const cleaned = value
      .replace(
        /\b(?:adlı|isimli|müşteri|musteri|crm|kaydı|kaydi|için|icin|telefonu|telefon|e[- ]?postası|emaili|şehri|sehri|bütçesi|butcesi)\b/gi,
        " ",
      )
      .replace(/['’](?:ı|i|u|ü|yi|yı|yu|yü|ın|in|un|ün|a|e|ya|ye)$/i, "")
      .replace(/[,:;.!?]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const words = cleaned.split(" ").filter(Boolean);

    if (words.length < 1 || words.length > 5) {
      return null;
    }

    if (
      words.some((word) =>
        /^(ekle|kaydet|olustur|oluştur|sil|kaldir|kaldır|bul|goster|göster|getir|ara)$/i.test(
          word,
        ),
      )
    ) {
      return null;
    }

    return cleaned;
  }

  private splitPersonName(
    fullName: string,
  ): { firstName: string; lastName: string } | null {
    const parts = fullName
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    return {
      firstName: this.titleCase(parts.slice(0, -1).join(" ")),
      lastName: this.titleCase(parts[parts.length - 1] || ""),
    };
  }

  private extractCustomerFields(message: string): ParsedCustomerFields {
    const phoneMatch = message.match(
      /(?:telefon(?:u|unu)?|gsm|cep(?: telefonu)?)\s*(?::|=|olarak)?\s*(\+?90\s*)?0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/i,
    );
    const rawPhone = phoneMatch?.[0].match(
      /(\+?90\s*)?0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/,
    )?.[0];

    const emailMatch = message.match(
      /(?:e[- ]?posta(?:sı|si|sini)?|email(?:i|ini)?)\s*(?::|=|olarak)?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
    );

    const cityMatch = message.match(
      /(?:şehir(?:i|ini)?|sehir(?:i|ini)?|il(?:i|ini)?)\s*(?::|=|olarak)?\s*([A-Za-zÇĞİÖŞÜçğıöşü\s-]{2,30})(?=\s*(?:,|\.|telefon|e[- ]?posta|email|bütçe|butce|not|$))/i,
    );

    const budgetMatch = message.match(
      /(?:bütçe(?:si|sini)?|butce(?:si|sini)?)\s*(?::|=|olarak)?\s*([\d.,]+)\s*(milyon|bin)?/i,
    );

    const noteMatch = message.match(
      /(?:not(?:u|unu)?|açıklama(?:sı|sini)?|aciklama(?:si|sini)?)\s*(?::|=|olarak)?\s*(.+)$/i,
    );

    return {
      phone: rawPhone ? this.normalizePhone(rawPhone) : undefined,
      email: emailMatch?.[1]?.trim().toLocaleLowerCase("tr-TR"),
      city: cityMatch?.[1]?.trim(),
      budget: budgetMatch
        ? this.parseTurkishMoney(budgetMatch[1], budgetMatch[2])
        : undefined,
      notes: noteMatch?.[1]?.trim(),
    };
  }

  private extractCustomerStatus(message: string): CustomerStatus | null {
    const normalized = this.normalize(message);
    const statusMap: Array<[RegExp, CustomerStatus]> = [
      [/(kaybedildi|kayip|olumsuz)/, CustomerStatus.KAYBEDILDI],
      [/(kapandi|satis tamamlandi|islem tamamlandi)/, CustomerStatus.KAPANDI],
      [/(pazarlik)/, CustomerStatus.PAZARLIK],
      [/(teklif sureci|teklif)/, CustomerStatus.TEKLIF_SURECI],
      [/(yer gosterimi)/, CustomerStatus.YER_GOSTERIMI],
      [/(portfoy gonderildi|portfolyo gonderildi)/, CustomerStatus.PORTFOLYO_GONDERILDI],
      [/(ilk gorusme|gorusme yapildi)/, CustomerStatus.ILK_GORUSME],
      [/(yeni lead|yeni musteri|yeni)/, CustomerStatus.YENI_LEAD],
    ];

    for (const [pattern, status] of statusMap) {
      if (pattern.test(normalized)) {
        return status;
      }
    }

    return null;
  }

  private extractTaskTitle(message: string, customerName: string): string {
    const afterColon = message.split(/[:：]/).slice(1).join(":").trim();

    if (afterColon) {
      return this.cleanTaskTitle(afterColon);
    }

    const withoutName = message
      .replace(new RegExp(this.escapeRegExp(customerName), "i"), " ")
      .replace(
        /\b(?:crm|müşteri|musteri|için|icin|görev|gorev|ekle|oluştur|olustur|kaydet|hatırlat|hatirlat|bugün|bugun|yarın|yarin|öbür gün|obur gun|saat|tarih)\b/gi,
        " ",
      )
      .replace(/\b\d{1,2}[:.]\d{2}\b/g, " ")
      .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return this.cleanTaskTitle(withoutName || "Müşteri takibi");
  }

  private cleanTaskTitle(value: string): string {
    const cleaned = value
      .replace(/\s+/g, " ")
      .replace(/[.!?]+$/g, "")
      .trim();

    if (!cleaned) {
      return "Müşteri takibi";
    }

    return cleaned.length > 120 ? cleaned.slice(0, 120).trim() : cleaned;
  }

  private extractDueDate(message: string): Date | undefined {
    const normalized = this.normalize(message);
    const timeMatch = message.match(/\b(?:saat\s*)?([01]?\d|2[0-3])[:.]([0-5]\d)\b/i);
    const hour = timeMatch ? Number(timeMatch[1]) : 9;
    const minute = timeMatch ? Number(timeMatch[2]) : 0;

    const explicitDateMatch = message.match(
      /\b([0-3]?\d)[./-]([01]?\d)[./-](\d{2}|\d{4})\b/,
    );

    if (explicitDateMatch) {
      const day = Number(explicitDateMatch[1]);
      const month = Number(explicitDateMatch[2]);
      const rawYear = Number(explicitDateMatch[3]);
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;

      return this.createIstanbulDate(year, month, day, hour, minute);
    }

    let offsetDays: number | null = null;

    if (normalized.includes("obur gun")) offsetDays = 2;
    else if (normalized.includes("yarin")) offsetDays = 1;
    else if (normalized.includes("bugun")) offsetDays = 0;

    if (offsetDays === null && !timeMatch) {
      return undefined;
    }

    const now = new Date();
    const istanbulNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const year = istanbulNow.getUTCFullYear();
    const month = istanbulNow.getUTCMonth() + 1;
    const day = istanbulNow.getUTCDate() + (offsetDays ?? 0);

    return this.createIstanbulDate(year, month, day, hour, minute);
  }

  private createIstanbulDate(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
  ): Date {
    return new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0, 0));
  }

  private extractActivityNote(message: string): string | null {
    const afterColon = message.split(/[:：]/).slice(1).join(":").trim();

    if (afterColon) {
      return afterColon.slice(0, 1000);
    }

    const match = message.match(
      /(?:not ekle|aktivite ekle|görüşme ekle|gorusme ekle|telefon görüşmesi|telefon gorusmesi|whatsapp görüşmesi|whatsapp gorusmesi|yer gösterimi ekle|yer gosterimi ekle|teklif ekle)\s*(?:olarak)?\s+(.+)$/i,
    );

    const note = match?.[1]
      ?.replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return note ? note.slice(0, 1000) : null;
  }

  private extractActivityType(message: string): ActivityType {
    const normalized = this.normalize(message);

    if (normalized.includes("whatsapp")) return ActivityType.WHATSAPP;
    if (normalized.includes("email") || normalized.includes("e posta")) {
      return ActivityType.EMAIL;
    }
    if (normalized.includes("yer gosterimi")) return ActivityType.YER_GOSTERIMI;
    if (normalized.includes("teklif")) return ActivityType.TEKLIF;
    if (normalized.includes("telefon") || normalized.includes("gorusme")) {
      return ActivityType.TELEFON;
    }
    if (normalized.includes("not")) return ActivityType.NOT;

    return ActivityType.DIGER;
  }

  private isConfirmationWord(message: string): boolean {
    return /^(onayla|onayliyorum|evet|tamam|devam et)$/i.test(
      this.normalize(message),
    );
  }

  private isCancellationWord(message: string): boolean {
    return /^(iptal|iptal et|vazgec|hayir)$/i.test(this.normalize(message));
  }

  private missingCustomerName(): LinaActionExecutionResult {
    return {
      handled: true,
      success: false,
      message:
        "İşlem yapılacak müşterinin adını ve soyadını anlayamadım. Lütfen ad ve soyadı birlikte söyleyin.",
    };
  }

  private customerFullName(customer: CustomerLike): string {
    return `${customer.firstName || ""} ${customer.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim();
  }

  private customerStatusLabel(status: CustomerStatus): string {
    const labels: Record<CustomerStatus, string> = {
      YENI_LEAD: "Yeni Lead",
      ILK_GORUSME: "İlk Görüşme",
      PORTFOLYO_GONDERILDI: "Portföy Gönderildi",
      YER_GOSTERIMI: "Yer Gösterimi",
      TEKLIF_SURECI: "Teklif Süreci",
      PAZARLIK: "Pazarlık",
      KAPANDI: "Kapandı",
      KAYBEDILDI: "Kaybedildi",
    };

    return labels[status];
  }

  private activityTypeLabel(type: ActivityType): string {
    const labels: Record<ActivityType, string> = {
      TELEFON: "Telefon",
      WHATSAPP: "WhatsApp",
      EMAIL: "E-posta",
      YER_GOSTERIMI: "Yer Gösterimi",
      TEKLIF: "Teklif",
      NOT: "Not",
      DIGER: "Diğer",
    };

    return labels[type];
  }

  private normalize(value: string): string {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replaceAll("ç", "c")
      .replaceAll("ğ", "g")
      .replaceAll("ı", "i")
      .replaceAll("ö", "o")
      .replaceAll("ş", "s")
      .replaceAll("ü", "u")
      .replace(/[’']/g, "")
      .replace(/[^\p{L}\p{N}@.+:/\-\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private normalizePhone(value: string): string {
    const digits = this.onlyDigits(value);

    if (digits.startsWith("90") && digits.length === 12) {
      return `+${digits}`;
    }

    if (digits.length === 10 && digits.startsWith("5")) {
      return `0${digits}`;
    }

    return digits;
  }

  private onlyDigits(value: string): string {
    return String(value || "").replace(/\D/g, "");
  }

  private parseTurkishMoney(value: string, scale?: string): number | undefined {
    const normalizedScale = this.normalize(scale || "");
    const compact = String(value || "").replace(/\s+/g, "");
    let numericValue: number;

    if (compact.includes(",") && compact.includes(".")) {
      numericValue = Number(compact.replace(/\./g, "").replace(",", "."));
    } else if (compact.includes(",")) {
      const pieces = compact.split(",");
      numericValue =
        pieces[1]?.length === 3
          ? Number(compact.replace(/,/g, ""))
          : Number(compact.replace(",", "."));
    } else if (compact.includes(".")) {
      const pieces = compact.split(".");
      numericValue =
        pieces[1]?.length === 3
          ? Number(compact.replace(/\./g, ""))
          : Number(compact);
    } else {
      numericValue = Number(compact);
    }

    if (!Number.isFinite(numericValue)) {
      return undefined;
    }

    if (normalizedScale === "milyon") {
      return numericValue * 1_000_000;
    }

    if (normalizedScale === "bin") {
      return numericValue * 1_000;
    }

    return numericValue;
  }

  private titleCase(value: string): string {
    return value
      .toLocaleLowerCase("tr-TR")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toLocaleUpperCase("tr-TR")}${part.slice(1)}`)
      .join(" ");
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private audit(
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
    action: string,
    result: "allowed" | "blocked" | "filtered" | "error" | "success",
    reason?: string,
    riskLevel: 0 | 1 | 2 | 3 | 4 = 0,
  ): void {
    this.linaAuditService.log({
      userId: user.id,
      role: user.role,
      module: sourceModule,
      action,
      result,
      reason,
      riskLevel,
    });
  }
}
