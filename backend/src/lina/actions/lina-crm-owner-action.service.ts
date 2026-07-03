import { Injectable } from "@nestjs/common";
import {
  CustomerRole,
  CustomerStatus,
  Role,
  UnitType,
} from "@prisma/client";

import { CrmService } from "../../crm/crm.service";
import {
  LinaActionExecutionResult,
  LinaActionHistoryItem,
  LinaActionSourceModule,
  LinaActionUser,
  LinaResolvedUser,
} from "./lina-action.types";
import { LinaAuditService } from "../lina-audit.service";

type CustomerRecord = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  city?: string | null;
  notes?: string | null;
  roles?: CustomerRole[];
  tags?: string[];
};

type OwnerLeadPurpose = "SALE" | "RENT_OUT" | "DEVELOPMENT";

type ParsedOwnerLead = {
  fullName: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  propertyType?: UnitType;
  area?: number;
  askingPrice?: number;
  purpose: OwnerLeadPurpose;
  roles: CustomerRole[];
  originalText: string;
};

@Injectable()
export class LinaCrmOwnerActionService {
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

    if (!message) {
      return { handled: false };
    }

    const user = this.resolveUser(rawUser);

    if (!user) {
      return { handled: false };
    }

    if (this.isCrmCreationStart(message)) {
      this.audit(user, sourceModule, "crm_customer_create_prepare", "success");

      return {
        handled: true,
        success: true,
        action: "crm_customer_create",
        message:
          "Elbette. CRM kaydı oluşturacağım. Müşterinin ad-soyadını, varsa telefonunu, gayrimenkul amacını ve ilgili konum, bütçe veya portföy bilgilerini tek cümlede söyleyin.",
      };
    }

    const history = this.normalizeHistory(rawHistory);

    if (!this.hasCrmCreationContext(message, history)) {
      return { handled: false };
    }

    const lead = this.parseOwnerLead(message);

    if (!lead) {
      return { handled: false };
    }

    try {
      const customers = (await this.crmService.getCustomers(
        user.id,
        user.role,
      )) as CustomerRecord[];

    const existingCustomer = customers.find(
      (customer) =>
        this.normalize(this.fullName(customer)) ===
        this.normalize(lead.fullName),
    );

    const tags = this.buildTags(lead);
    let customer: CustomerRecord;
    let reusedCustomer = false;

    if (existingCustomer) {
      const current = (await this.crmService.getCustomer(
        existingCustomer.id,
        user.id,
        user.role,
      )) as CustomerRecord;

      const currentRoles = Array.isArray(current.roles) ? current.roles : [];
      const currentTags = Array.isArray(current.tags) ? current.tags : [];
      const notes = this.mergeNotes(current.notes, lead.originalText);

      customer = (await this.crmService.updateCustomer(
        current.id,
        user.id,
        user.role,
        {
          city: current.city || lead.city,
          phone: current.phone || lead.phone,
          roles: Array.from(new Set([...currentRoles, ...lead.roles])),
          tags: Array.from(new Set([...currentTags, ...tags])),
          notes,
        },
      )) as CustomerRecord;

      reusedCustomer = true;
    } else {
      customer = (await this.crmService.createCustomer(user.id, {
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        city: lead.city,
        source: "LINA",
        status: CustomerStatus.YENI_LEAD,
        roles: lead.roles,
        tags,
        notes: lead.originalText,
      })) as CustomerRecord;
    }

    const locationText = [
      lead.city,
      lead.district,
      lead.neighborhood,
    ]
      .filter(Boolean)
      .join(" / ");

    const propertyText = [
      typeof lead.area === "number"
        ? `${new Intl.NumberFormat("tr-TR").format(lead.area)} m²`
        : null,
      lead.propertyType ? this.propertyTypeLabel(lead.propertyType) : "Gayrimenkul",
    ]
      .filter(Boolean)
      .join(" ");

    const purposeText =
      lead.purpose === "RENT_OUT"
        ? "mal sahibi"
        : lead.purpose === "DEVELOPMENT"
          ? "arsa sahibi"
          : lead.roles.includes(CustomerRole.ARSA_SAHIBI)
            ? "arsa sahibi / satıcı"
            : "mal sahibi / satıcı";

    const responseLines = [
      `${lead.fullName} için ${purposeText} CRM kaydı ${reusedCustomer ? "güncellendi" : "oluşturuldu"}.`,
      `Taşınmaz: ${propertyText}`,
      locationText ? `Konum: ${locationText}` : null,
      typeof lead.askingPrice === "number"
        ? `${lead.purpose === "RENT_OUT" ? "Talep edilen kira" : "İstenen fiyat"}: ${new Intl.NumberFormat("tr-TR").format(lead.askingPrice)} ₺`
        : null,
      "Alıcı müşteri talebi oluşturulmadı.",
    ];

      this.audit(
        user,
        sourceModule,
        "crm_owner_customer_create",
        "success",
        lead.purpose,
      );

      return {
        handled: true,
        success: true,
        action: "crm_customer_create",
        message: responseLines.filter(Boolean).join("\n"),
        data: {
          customer,
          reusedCustomer,
          ownerLead: true,
          purpose: lead.purpose,
        },
      };
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : "CRM mal sahibi kaydı oluşturulamadı.";

      this.audit(
        user,
        sourceModule,
        "crm_owner_customer_create",
        "error",
        reason,
      );

      return {
        handled: true,
        success: false,
        action: "crm_customer_create",
        message: reason,
      };
    }
  }

  private resolveUser(user?: LinaActionUser): LinaResolvedUser | null {
    const id = String(user?.id || "").trim();
    const roleValue = this.normalizeRole(user?.role);
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

  private normalizeRole(value?: string) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replaceAll("İ", "I")
      .replaceAll("Ü", "U")
      .replaceAll("Ğ", "G")
      .replaceAll("Ş", "S")
      .replaceAll("Ö", "O")
      .replaceAll("Ç", "C");
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

  private isCrmCreationStart(message: string) {
    const normalized = this.normalize(message)
      .replace(/[.!?]+$/g, "")
      .trim();

    return (
      /^(lina\s+)?(?:yeni\s+)?(?:crm|musteri)\s+(?:kaydi|kayit)\s+(?:olusturalim|acalim|ekleyelim|olustur|ac)$/.test(
        normalized,
      ) ||
      /^(lina\s+)?crm(?:de|e)?\s+(?:yeni\s+)?musteri\s+(?:olusturalim|ekleyelim|olustur)$/.test(
        normalized,
      )
    );
  }

  private hasCrmCreationContext(
    currentMessage: string,
    history: LinaActionHistoryItem[],
  ) {
    const current = this.normalize(currentMessage);

    if (
      /(?:crm|musteri).*(?:kaydi|kayit).*(?:olustur|ekle|ac)/.test(current) ||
      /(?:olustur|ekle|ac).*(?:crm|musteri).*(?:kaydi|kayit)/.test(current)
    ) {
      return true;
    }

    return history.slice(-12).some((item) => {
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
        normalized.includes("gayrimenkul amacini")
      );
    });
  }

  private parseOwnerLead(message: string): ParsedOwnerLead | null {
    const text = String(message || "").replace(/\s+/g, " ").trim();
    const normalized = this.normalize(text);

    const isRentOut =
      /(kiraya vermek istiyor|kiraya verecek|kiraya cikarmak istiyor|kiraya cikarmak)/.test(
        normalized,
      );
    const isDevelopment =
      /(kat karsiligi vermek istiyor|kat karsiligi degerlendirmek istiyor|arsa gelistirme|proje ortakligi)/.test(
        normalized,
      );
    const isSale =
      /(satmak istiyor|satisa cikarmak istiyor|satiliga cikarmak istiyor|satiliga cikarmak|elden cikarmak istiyor)/.test(
        normalized,
      );

    if (!isRentOut && !isDevelopment && !isSale) {
      return null;
    }

    const nameResult = this.extractNameAndDetails(text);

    if (!nameResult) {
      return null;
    }

    const nameParts = nameResult.fullName
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (nameParts.length < 2) {
      return null;
    }

    const firstName = this.titleCase(nameParts.slice(0, -1).join(" "));
    const lastName = this.titleCase(nameParts[nameParts.length - 1] || "");
    const propertyType = this.extractPropertyType(normalized);
    const isLandProperty = this.isLandProperty(propertyType);
    const purpose: OwnerLeadPurpose = isRentOut
      ? "RENT_OUT"
      : isDevelopment
        ? "DEVELOPMENT"
        : "SALE";

    const roles = this.resolveCustomerRoles(
      purpose,
      isLandProperty,
    );
    const location = this.extractLocation(nameResult.details);
    const area = this.extractArea(text);
    const askingPrice = this.extractPrice(text);
    const phone = this.extractPhone(text);

    return {
      fullName: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      phone,
      city: location.city,
      district: location.district,
      neighborhood: location.neighborhood,
      propertyType,
      area,
      askingPrice,
      purpose,
      roles,
      originalText: text,
    };
  }

  private extractNameAndDetails(text: string) {
    const possessiveMatch = text.match(
      /^(.+?)['’](?:nın|nin|nun|nün|ın|in|un|ün)\s+(.+)$/iu,
    );

    if (possessiveMatch) {
      return {
        fullName: possessiveMatch[1].trim(),
        details: possessiveMatch[2].trim(),
      };
    }

    const commaMatch = text.match(/^(.+?),\s*(.+)$/u);

    if (commaMatch) {
      return {
        fullName: commaMatch[1].trim(),
        details: commaMatch[2].trim(),
      };
    }

    const namedMatch = text.match(/^(.+?)\s+(?:adlı|isimli)\s+(.+)$/iu);

    if (namedMatch) {
      return {
        fullName: namedMatch[1].trim(),
        details: namedMatch[2].trim(),
      };
    }

    return null;
  }

  private extractLocation(details: string) {
    const slashMatch = details.match(
      /^([^/,\s]+)\s*\/\s*([^/,]+?)\s*\/\s*([^,]+?)(?:\s+mahallesi)?(?:['’]?(?:nde|nda|de|da))?\b/iu,
    );

    if (slashMatch) {
      return {
        city: this.titleCase(slashMatch[1]),
        district: this.titleCase(slashMatch[2]),
        neighborhood: this.titleCase(slashMatch[3]),
      };
    }

    const districtLabelMatch = details.match(
      /^([A-Za-zÇĞİÖŞÜçğıöşü-]+)\s+([A-Za-zÇĞİÖŞÜçğıöşü\s-]+?)\s+ilçesi\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9\s-]+?)\s+mahallesi(?:['’]?(?:nde|nda|de|da))?\b/iu,
    );

    if (districtLabelMatch) {
      return {
        city: this.titleCase(districtLabelMatch[1]),
        district: this.titleCase(districtLabelMatch[2]),
        neighborhood: this.titleCase(districtLabelMatch[3]),
      };
    }

    const simpleMatch = details.match(
      /^([A-Za-zÇĞİÖŞÜçğıöşü-]+)\s+([A-Za-zÇĞİÖŞÜçğıöşü-]+)\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9\s-]+?)\s+mahallesi(?:['’]?(?:nde|nda|de|da))?\b/iu,
    );

    if (simpleMatch) {
      return {
        city: this.titleCase(simpleMatch[1]),
        district: this.titleCase(simpleMatch[2]),
        neighborhood: this.titleCase(simpleMatch[3]),
      };
    }

    return {};
  }

  private extractPropertyType(normalized: string): UnitType | undefined {
    const mappings: Array<[RegExp, UnitType]> = [
      [/\bzeytinlik(?:i)?\b/, UnitType.ZEYTINLIK],
      [/\bbahce(?:si)?\b/, UnitType.BAHCE],
      [/\btarla(?:si)?\b/, UnitType.TARLA],
      [/\barsa(?:si)?\b/, UnitType.ARSA],
      [/\bvilla(?:si)?\b/, UnitType.VILLA],
      [/\brezidans(?:i)?\b/, UnitType.REZIDANS],
      [/\bmustakil ev(?:i)?\b/, UnitType.MUSTAK_EV],
      [/\bdaire(?:si)?\b|\bkonut(?:u)?\b/, UnitType.DAIRE],
      [/\bdukkan(?:i)?\b|\bmagaza(?:si)?\b/, UnitType.DUKKAN_MAGAZA],
      [/\bofis(?:i)?\b|\bburo(?:su)?\b/, UnitType.OFIS_BURO],
      [/\bfabrika(?:si)?\b/, UnitType.FABRIKA_URETIM_TESISI],
      [/\bdepo(?:su)?\b|\bantrepo(?:su)?\b/, UnitType.DEPO_ANTREPO],
      [/\botel(?:i)?\b/, UnitType.OTEL],
    ];

    return mappings.find(([pattern]) => pattern.test(normalized))?.[1];
  }

  private isLandProperty(propertyType?: UnitType) {
    const landPropertyTypes: UnitType[] = [
      UnitType.ARSA,
      UnitType.TARLA,
      UnitType.BAHCE,
      UnitType.ZEYTINLIK,
      UnitType.BAG,
      UnitType.MEYVE_BAHCESI,
      UnitType.KONUT_ARSASI,
      UnitType.VILLA_ARSASI,
      UnitType.TICARI_ARSA,
      UnitType.SANAYI_ARSASI,
      UnitType.TURIZM_IMARLI_ARSA,
    ];

    return Boolean(propertyType && landPropertyTypes.includes(propertyType));
  }

  private resolveCustomerRoles(
    purpose: OwnerLeadPurpose,
    isLandProperty: boolean,
  ): CustomerRole[] {
    if (purpose === "DEVELOPMENT") {
      return [CustomerRole.ARSA_SAHIBI];
    }

    if (purpose === "RENT_OUT") {
      return isLandProperty
        ? [CustomerRole.ARSA_SAHIBI, CustomerRole.MAL_SAHIBI]
        : [CustomerRole.MAL_SAHIBI];
    }

    return isLandProperty
      ? [CustomerRole.ARSA_SAHIBI, CustomerRole.SATICI]
      : [CustomerRole.MAL_SAHIBI, CustomerRole.SATICI];
  }

  private extractArea(text: string): number | undefined {
    const match = text.match(
      /(\d[\d.]*(?:,\d+)?)\s*(?:m²|m2|m\^2|metrekare)/iu,
    );

    return match ? this.parseTurkishNumber(match[1]) : undefined;
  }

  private extractPrice(text: string): number | undefined {
    const match = text.match(
      /(\d[\d.]*(?:,\d+)?)\s*(milyon|bin)?\s*(?:tl|₺|türk lirası)(?:['’]?(?:ye|ya|e|a))?/iu,
    );

    if (!match) {
      return undefined;
    }

    const base = this.parseTurkishNumber(match[1]);

    if (typeof base !== "number") {
      return undefined;
    }

    const scale = this.normalize(match[2] || "");

    if (scale === "milyon") {
      return base * 1_000_000;
    }

    if (scale === "bin") {
      return base * 1_000;
    }

    return base;
  }

  private extractPhone(text: string): string | undefined {
    const match = text.match(
      /\b(?:\+?90\s*)?0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/u,
    );

    return match?.[0]?.replace(/\s+/g, " ").trim();
  }

  private parseTurkishNumber(value: string): number | undefined {
    const normalized = String(value || "")
      .trim()
      .replace(/\./g, "")
      .replace(",", ".");
    const numberValue = Number(normalized);

    return Number.isFinite(numberValue) ? numberValue : undefined;
  }

  private buildTags(lead: ParsedOwnerLead): string[] {
    const tags = [
      lead.purpose === "RENT_OUT"
        ? "Kiraya Veren"
        : lead.purpose === "DEVELOPMENT"
          ? "Kat Karşılığı / Geliştirme"
          : "Satıcı",
      lead.roles.includes(CustomerRole.ARSA_SAHIBI)
        ? "Arsa Sahibi"
        : "Mal Sahibi",
      lead.propertyType
        ? this.propertyTypeLabel(lead.propertyType)
        : null,
      typeof lead.area === "number"
        ? `${new Intl.NumberFormat("tr-TR").format(lead.area)} m²`
        : null,
    ];

    return tags.filter((item): item is string => Boolean(item));
  }

  private mergeNotes(currentNotes: string | null | undefined, newNote: string) {
    const current = String(currentNotes || "").trim();

    if (!current) {
      return newNote;
    }

    if (this.normalize(current).includes(this.normalize(newNote))) {
      return current;
    }

    return `${current}\n${newNote}`;
  }

  private propertyTypeLabel(type: UnitType) {
    const labels: Partial<Record<UnitType, string>> = {
      [UnitType.DAIRE]: "Daire",
      [UnitType.VILLA]: "Villa",
      [UnitType.REZIDANS]: "Rezidans",
      [UnitType.MUSTAK_EV]: "Müstakil Ev",
      [UnitType.DUKKAN_MAGAZA]: "Dükkan / Mağaza",
      [UnitType.OFIS_BURO]: "Ofis / Büro",
      [UnitType.ARSA]: "Arsa",
      [UnitType.TARLA]: "Tarla",
      [UnitType.BAHCE]: "Bahçe",
      [UnitType.ZEYTINLIK]: "Zeytinlik",
      [UnitType.FABRIKA_URETIM_TESISI]: "Fabrika",
      [UnitType.DEPO_ANTREPO]: "Depo / Antrepo",
      [UnitType.OTEL]: "Otel",
    };

    return labels[type] || String(type).replaceAll("_", " ");
  }

  private fullName(customer: CustomerRecord) {
    return `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
  }

  private titleCase(value: string) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .split(/\s+/)
      .map((part) =>
        part
          ? `${part.charAt(0).toLocaleUpperCase("tr-TR")}${part.slice(1)}`
          : "",
      )
      .join(" ");
  }


  private audit(
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
    action: string,
    result: "success" | "error",
    reason?: string,
  ) {
    this.linaAuditService.log({
      userId: user.id,
      role: user.role,
      module: sourceModule,
      action,
      result,
      reason,
      riskLevel: result === "error" ? 2 : 0,
    });
  }

  private normalize(value: string) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replaceAll("ı", "i")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ş", "s")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c");
  }
}
