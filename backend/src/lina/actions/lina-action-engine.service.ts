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
  roles?: CustomerRole[];
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

// Lina CRM Confirmation And Fixed Voice V1
// Lina CRM Role First V2
type ParsedNaturalCrmLead = {
  fullName: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  minBudget?: number;
  maxBudget?: number;
  roomCounts: string[];
  propertyTypes: UnitType[];
  statuses: UnitStatus[];
  purchaseIntent: CustomerPurchaseIntent;
  customerRole: CustomerRole;
  customerRoles: CustomerRole[];
  originalText: string;
};

type PendingDirectCrmCustomer = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  city?: string;
  budget?: number;
  notes?: string;
  roles?: CustomerRole[];
};

type PendingCrmCreation = {
  userId: string;
  createdAt: number;
  expiresAt: number;
  mode:
    | "select-role"
    | "collecting"
    | "confirm-natural"
    | "confirm-direct";
  sourceModule: LinaActionSourceModule;
  selectedRoles?: CustomerRole[];
  lead?: ParsedNaturalCrmLead;
  customer?: PendingDirectCrmCustomer;
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
      /^(lina\s+)?(?:yeni\s+)?(?:crm|musteri)\s+(?:kaydi|kayit|girisi|giris)\s+(?:yapalim|olusturalim|acalim|ekleyelim|olustur|ac|yap)$/.test(
        normalized,
      ) ||
      /^(lina\s+)?(?:crm|musteri)\s+(?:girisi|giris)\s+(?:yapalim|baslatalim|yap|baslat)$/.test(
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
      mode: "select-role",
      sourceModule,
    });

    this.audit(user, sourceModule, "crm_customer_create_prepare", "success");

    return {
      handled: true,
      success: true,
      action: "crm_customer_create",
      message: this.buildCrmRoleSelectionMessage(),
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

    const transactionSignal =
      /(satin almak istiyor|kiralamak istiyor|yatirim yapmak istiyor|satmak istiyor|kiraya vermek istiyor|satisa cikarmak istiyor|kat karsiligi vermek istiyor|daire ariyor|villa ariyor|arsa ariyor|gayrimenkul ariyor)/.test(
        normalized,
      );
    const ownershipSignal =
      /(arsasi var|tarlasi var|dairesi var|villasi var|dukkanı var|dukkani var|ofisi var|gayrimenkulu var|mulku var)/.test(
        normalized,
      );
    const moneyAndPropertySignal =
      /(milyon|bin|tl|₺|butce|kadar|bedel|fiyat)/.test(normalized) &&
      /(daire|villa|rezidans|mustakil ev|arsa|tarla|dukkan|ofis|gayrimenkul)/.test(
        normalized,
      );

    return transactionSignal || ownershipSignal || moneyAndPropertySignal;
  }
  private async createCrmCustomerFromNaturalLead(
    message: string,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const pendingCrm = this.pendingCrmCreations.get(user.id);
    const selectedRoles = pendingCrm?.selectedRoles || [];
    const lead = this.parseNaturalCrmLead(message);

    if (!lead) {
      return {
        handled: true,
        success: false,
        message:
          "CRM bilgilerini ayıramadım. Müşterinin ad-soyadını, telefonunu ve seçtiğimiz role uygun gayrimenkul ayrıntılarını tek cümlede tekrar söyleyin.",
      };
    }

    if (selectedRoles.length > 0) {
      lead.customerRoles = [...selectedRoles];
      lead.customerRole = selectedRoles[0];

      if (this.isSupplySideCrmRoles(selectedRoles)) {
        lead.purchaseIntent = CustomerPurchaseIntent.BELIRSIZ;
        lead.statuses =
          /(kiraya vermek|kiralik)/.test(this.normalize(message))
            ? [UnitStatus.KIRALIK]
            : [UnitStatus.SATILIK];
      }
    }

    const existingCustomer = await this.findExistingCustomerForNaturalLead(
      lead,
      user,
    );
    const isSupplySide = this.isSupplySideCrmRoles(
      lead.customerRoles,
    );

    if (existingCustomer && !isSupplySide) {
      const duplicateInterest = this.findDuplicateNaturalLeadInterest(
        existingCustomer,
        lead,
      );

      if (duplicateInterest) {
        this.pendingCrmCreations.delete(user.id);

        return {
          handled: true,
          success: true,
          action: "crm_customer_create_with_interest",
          message: `${this.customerFullName(existingCustomer)} için aynı konum ve özelliklerde aktif bir CRM talebi zaten bulunuyor. Tekrar kayıt oluşturmadım.`,
          data: {
            customerId: existingCustomer.id,
            interestId: duplicateInterest.id,
            crmUrl: "/crm",
            reusedCustomer: true,
          },
        };
      }
    }

    const now = Date.now();

    this.pendingCrmCreations.set(user.id, {
      userId: user.id,
      createdAt: now,
      expiresAt: now + PENDING_CRM_CREATION_TTL_MS,
      mode: "confirm-natural",
      sourceModule,
      selectedRoles: lead.customerRoles,
      lead,
    });

    this.audit(
      user,
      sourceModule,
      isSupplySide
        ? "crm_owner_customer_create_prepare"
        : "crm_customer_create_with_interest_prepare",
      "success",
    );

    return {
      handled: true,
      success: true,
      action: isSupplySide
        ? "crm_customer_create"
        : "crm_customer_create_with_interest",
      requiresConfirmation: true,
      message: this.buildNaturalLeadConfirmationMessage(
        lead,
        existingCustomer
          ? this.customerFullName(existingCustomer)
          : undefined,
      ),
      data: {
        confirmationType: isSupplySide
          ? "crm_customer_create"
          : "crm_customer_create_with_interest",
        confirmLabel: "Kaydı Onayla",
        cancelLabel: "İptal Et",
        reusedCustomer: Boolean(existingCustomer),
        draft: {
          fullName: lead.fullName,
          phone: lead.phone,
          email: lead.email,
          roles: lead.customerRoles,
          city: lead.city,
          district: lead.district,
          neighborhood: lead.neighborhood,
          minBudget: lead.minBudget,
          maxBudget: lead.maxBudget,
          roomCounts: lead.roomCounts,
          propertyTypes: lead.propertyTypes,
          statuses: lead.statuses,
          purchaseIntent: lead.purchaseIntent,
        },
      },
    };
  }

  private async findExistingCustomerForNaturalLead(
    lead: ParsedNaturalCrmLead,
    user: LinaResolvedUser,
  ): Promise<CustomerLike | null> {
    const customers = (await this.crmService.getCustomers(
      user.id,
      user.role,
    )) as CustomerLike[];

    const existing = customers.find((customer) => {
      const sameName =
        this.normalize(this.customerFullName(customer)) ===
        this.normalize(lead.fullName);
      const samePhone =
        Boolean(lead.phone && customer.phone) &&
        this.onlyDigits(lead.phone || "") ===
          this.onlyDigits(customer.phone || "");
      const sameEmail =
        Boolean(lead.email && customer.email) &&
        String(lead.email).toLocaleLowerCase("tr-TR") ===
          String(customer.email).toLocaleLowerCase("tr-TR");

      return sameName || samePhone || sameEmail;
    });

    if (!existing) {
      return null;
    }

    return (await this.crmService.getCustomer(
      existing.id,
      user.id,
      user.role,
    )) as CustomerLike;
  }

  private findDuplicateNaturalLeadInterest(
    customer: CustomerLike,
    lead: ParsedNaturalCrmLead,
  ) {
    return customer.interests?.find((interest) => {
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
  }

  private async executeNaturalCrmLeadCreation(
    lead: ParsedNaturalCrmLead,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    if (this.isSupplySideCrmRoles(lead.customerRoles)) {
      return this.executeSupplySideCrmCreation(
        lead,
        user,
        sourceModule,
      );
    }

    const existingCustomer = await this.findExistingCustomerForNaturalLead(
      lead,
      user,
    );

    if (existingCustomer) {
      const duplicateInterest = this.findDuplicateNaturalLeadInterest(
        existingCustomer,
        lead,
      );

      if (duplicateInterest) {
        return {
          handled: true,
          success: true,
          action: "crm_customer_create_with_interest",
          message: `${this.customerFullName(existingCustomer)} için aynı konum ve özelliklerde aktif bir CRM talebi zaten bulunuyor. Tekrar kayıt oluşturmadım.`,
          data: {
            customerId: existingCustomer.id,
            interestId: duplicateInterest.id,
            crmUrl: "/crm",
            reusedCustomer: true,
          },
        };
      }
    }

    let customer: CustomerLike;
    let interest: { id?: string } | undefined;
    const reusedCustomer = Boolean(existingCustomer);

    if (existingCustomer) {
      const mergedRoles = Array.from(
        new Set([
          ...(existingCustomer.roles || []),
          ...lead.customerRoles,
        ]),
      );

      customer = (await this.crmService.updateCustomer(
        existingCustomer.id,
        user.id,
        user.role,
        { roles: mergedRoles },
      )) as CustomerLike;

      interest = await this.crmService.addCustomerInterest(
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
          minBudget: lead.minBudget,
          maxBudget: lead.maxBudget,
          priceCurrency: "TRY",
          roomCounts: lead.roomCounts,
          purchaseIntent: lead.purchaseIntent,
          priority: CustomerInterestPriority.NORMAL,
          notes: lead.originalText,
          isActive: true,
        },
      );
    } else {
      customer = (await this.crmService.createCustomer(user.id, {
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        budget: lead.maxBudget || lead.minBudget,
        interestedArea: [lead.city, lead.district, lead.neighborhood]
          .filter(Boolean)
          .join(" / "),
        interestedType:
          lead.propertyTypes
            .map((type) => this.propertyTypeLabel(type))
            .join(", ") || undefined,
        source: "LINA",
        status: CustomerStatus.YENI_LEAD,
        roles: lead.customerRoles,
        notes: lead.originalText,
        interestAreas:
          lead.city && lead.district
            ? [
                {
                  city: lead.city,
                  district: lead.district,
                  neighborhood: lead.neighborhood || "",
                },
              ]
            : [],
        minBudget: lead.minBudget,
        maxBudget: lead.maxBudget,
        propertyTypes: lead.propertyTypes,
        interestStatuses: lead.statuses,
        roomCounts: lead.roomCounts,
        purchaseIntent: lead.purchaseIntent,
        priority: CustomerInterestPriority.NORMAL,
        interestTitle: this.buildNaturalLeadTitle(lead),
        interestNotes: lead.originalText,
      })) as CustomerLike;

      interest = customer.interests?.[0];
    }

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
    const budgetText = this.formatBudgetRange(
      lead.minBudget,
      lead.maxBudget,
    );
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
        `${this.customerFullName(customer)} için CRM kaydı ve müşteri talebi oluşturuldu.`,
        `Rol: ${this.crmRoleListLabel(lead.customerRoles)}`,
        locationText ? `Konum: ${locationText}` : null,
        `Talep: ${roomText} ${propertyText || "gayrimenkul"}`,
        `Bütçe: ${budgetText}`,
      ]
        .filter(Boolean)
        .join("\n"),
      data: {
        customerId: customer.id,
        interestId: interest?.id,
        crmUrl: "/crm",
        reusedCustomer,
      },
    };
  }

  private async executeSupplySideCrmCreation(
    lead: ParsedNaturalCrmLead,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const existingCustomer = await this.findExistingCustomerForNaturalLead(
      lead,
      user,
    );
    const mergedRoles = Array.from(
      new Set([
        ...(existingCustomer?.roles || []),
        ...lead.customerRoles,
      ]),
    );
    const mergedNotes = [
      existingCustomer?.notes,
      lead.originalText,
    ]
      .filter(Boolean)
      .join("\n");

    let customer: CustomerLike;

    if (existingCustomer) {
      customer = (await this.crmService.updateCustomer(
        existingCustomer.id,
        user.id,
        user.role,
        {
          roles: mergedRoles,
          phone: lead.phone || existingCustomer.phone,
          email: lead.email || existingCustomer.email,
          city: lead.city || existingCustomer.city,
          budget:
            lead.maxBudget ||
            lead.minBudget ||
            existingCustomer.budget,
          notes: mergedNotes,
        },
      )) as CustomerLike;
    } else {
      customer = (await this.crmService.createCustomer(user.id, {
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        budget: lead.maxBudget || lead.minBudget,
        source: "LINA",
        status: CustomerStatus.YENI_LEAD,
        roles: lead.customerRoles,
        notes: lead.originalText,
      })) as CustomerLike;
    }

    this.audit(
      user,
      sourceModule,
      "crm_owner_customer_create",
      "success",
    );

    const locationText = [
      lead.city,
      lead.district,
      lead.neighborhood,
    ]
      .filter(Boolean)
      .join(" / ");
    const propertyText =
      lead.propertyTypes
        .map((type) => this.propertyTypeLabel(type))
        .join(", ") || "Gayrimenkul";
    const transactionText = lead.statuses.includes(UnitStatus.KIRALIK)
      ? "Kiraya verilecek"
      : "Satılacak";

    return {
      handled: true,
      success: true,
      action: "crm_customer_create",
      message: [
        `${this.customerFullName(customer)} için CRM kaydı oluşturuldu.`,
        `Rol: ${this.crmRoleListLabel(lead.customerRoles)}`,
        `Gayrimenkul: ${transactionText} ${propertyText}`,
        locationText ? `Konum: ${locationText}` : null,
        `İstenen Bedel: ${this.formatBudgetRange(
          lead.minBudget,
          lead.maxBudget,
        )}`,
        "Gayrimenkul bilgileri müşteri notlarına eklendi; alıcı talebi oluşturulmadı.",
      ]
        .filter(Boolean)
        .join("\n"),
      data: {
        customerId: customer.id,
        crmUrl: "/crm",
        reusedCustomer: Boolean(existingCustomer),
      },
    };
  }

  private buildNaturalLeadConfirmationMessage(
    lead: ParsedNaturalCrmLead,
    reusedCustomerName?: string,
  ): string {
    const isSupplySide = this.isSupplySideCrmRoles(
      lead.customerRoles,
    );
    const locationText = [
      lead.city,
      lead.district,
      lead.neighborhood,
    ]
      .filter(Boolean)
      .join(" / ");
    const propertyText =
      lead.propertyTypes
        .map((type) => this.propertyTypeLabel(type))
        .join(", ") || "Belirtilmedi";
    const roomText =
      lead.roomCounts.length > 0
        ? lead.roomCounts.join(", ")
        : "Belirtilmedi";

    return [
      "CRM kayıt taslağı hazır.",
      `Ad Soyad: ${lead.fullName}`,
      lead.phone ? `Telefon: ${lead.phone}` : null,
      lead.email ? `E-posta: ${lead.email}` : null,
      `Rol: ${this.crmRoleListLabel(lead.customerRoles)}`,
      `Kayıt Türü: ${
        isSupplySide
          ? "Gayrimenkul sahibi / satıcı kaydı"
          : "Gayrimenkul talebi"
      }`,
      `Konum: ${locationText || "Belirtilmedi"}`,
      `${
        isSupplySide ? "İstenen Bedel" : "Bütçe"
      }: ${this.formatBudgetRange(lead.minBudget, lead.maxBudget)}`,
      `Mülk Tipi: ${propertyText}`,
      !isSupplySide ? `Oda Sayısı: ${roomText}` : null,
      reusedCustomerName
        ? `Mevcut CRM kaydı güncellenecek: ${reusedCustomerName}`
        : "Yeni CRM kaydı oluşturulacak.",
      "Bilgiler doğruysa “Kaydı Onayla”, vazgeçmek için “İptal Et” seçeneğini kullanın.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private extractCrmCustomerRoles(message: string): CustomerRole[] {
    const normalized = this.normalize(message);
    const mappings: Array<[RegExp, CustomerRole]> = [
      [/\binsaat firmasi\b/, CustomerRole.INSAAT_FIRMASI],
      [/\bmuteahhit\b/, CustomerRole.MUTEAHHIT],
      [/\barsa sahibi\b/, CustomerRole.ARSA_SAHIBI],
      [
        /\bmal sahibi\b|\bmulk sahibi\b|\bev sahibi\b|\bkiraya veren\b/,
        CustomerRole.MAL_SAHIBI,
      ],
      [
        /\bsatici\b|\bsatmak istiyor\b|\bsatisa cikarmak istiyor\b/,
        CustomerRole.SATICI,
      ],
      [/\bkiraci\b|\bkiralamak istiyor\b/, CustomerRole.KIRACI],
      [
        /\byatirimci\b|\byatirim yapmak istiyor\b/,
        CustomerRole.YATIRIMCI,
      ],
      [/\balici\b|\bsatin almak istiyor\b/, CustomerRole.ALICI],
    ];

    return Array.from(
      new Set(
        mappings
          .filter(([pattern]) => pattern.test(normalized))
          .map(([, role]) => role),
      ),
    );
  }

  private buildCrmRoleSelectionMessage(): string {
    return [
      "Önce CRM kaydı yapılacak kişinin rolünü belirleyelim.",
      "Bir kişi birden fazla role sahip olabilir.",
      "Roller: Alıcı, Satıcı, Kiracı, Mal Sahibi / Kiraya Veren, Yatırımcı, Müteahhit, İnşaat Firması, Arsa Sahibi.",
      "Müşterinin rolü veya rolleri nedir?",
    ].join("\n");
  }

  private buildCrmRoleDetailPrompt(roles: CustomerRole[]): string {
    const roleText = this.crmRoleListLabel(roles);

    if (this.isSupplySideCrmRoles(roles)) {
      return [
        `Rol kaydedildi: ${roleText}.`,
        "Şimdi ad-soyadını, varsa telefonunu; sahip olduğu gayrimenkulün türünü, il-ilçe-mahalleyi, satılık mı kiralık mı olduğunu, istenen bedeli ve varsa m² bilgisini tek cümlede söyleyin.",
      ].join("\n");
    }

    if (
      roles.includes(CustomerRole.MUTEAHHIT) ||
      roles.includes(CustomerRole.INSAAT_FIRMASI)
    ) {
      return [
        `Rol kaydedildi: ${roleText}.`,
        "Şimdi kişi veya firma adını, telefonu, faaliyet bölgesini ve CRM'e kaydedilecek proje, arsa, iş birliği veya talep ayrıntılarını tek cümlede söyleyin.",
      ].join("\n");
    }

    return [
      `Rol kaydedildi: ${roleText}.`,
      "Şimdi ad-soyadını, varsa telefonunu; aradığı il-ilçe-mahalleyi, satılık mı kiralık mı olduğunu, gayrimenkul türünü, oda sayısını ve bütçesini tek cümlede söyleyin.",
    ].join("\n");
  }

  private isSupplySideCrmRoles(roles: CustomerRole[]): boolean {
    const supplySideRoles = new Set<CustomerRole>([
      CustomerRole.SATICI,
      CustomerRole.MAL_SAHIBI,
      CustomerRole.ARSA_SAHIBI,
    ]);

    return roles.some((role) => supplySideRoles.has(role));
  }

  private crmRoleListLabel(roles: CustomerRole[]): string {
    if (roles.length === 0) {
      return "Belirtilmedi";
    }

    return roles.map((role) => this.crmRoleLabel(role)).join(", ");
  }

  private crmRoleLabel(role: CustomerRole): string {
    const labels: Record<CustomerRole, string> = {
      [CustomerRole.ALICI]: "Alıcı",
      [CustomerRole.SATICI]: "Satıcı",
      [CustomerRole.KIRACI]: "Kiracı",
      [CustomerRole.MAL_SAHIBI]: "Mal Sahibi / Kiraya Veren",
      [CustomerRole.YATIRIMCI]: "Yatırımcı",
      [CustomerRole.MUTEAHHIT]: "Müteahhit",
      [CustomerRole.INSAAT_FIRMASI]: "İnşaat Firması",
      [CustomerRole.ARSA_SAHIBI]: "Arsa Sahibi",
    };

    return labels[role] || role;
  }
  private formatBudgetRange(
    minBudget?: number,
    maxBudget?: number,
  ): string {
    const format = (value: number) =>
      `${new Intl.NumberFormat("tr-TR").format(value)} ₺`;

    if (minBudget && maxBudget) {
      return `${format(minBudget)} – ${format(maxBudget)}`;
    }

    if (maxBudget) {
      return `En fazla ${format(maxBudget)}`;
    }

    if (minBudget) {
      return `En az ${format(minBudget)}`;
    }

    return "Belirtilmedi";
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
    const customerFields = this.extractCustomerFields(text);
    const locationMatch = text.match(
      /,\s*([A-Za-zÇĞİÖŞÜçğıöşü-]+)\s+([A-Za-zÇĞİÖŞÜçğıöşü\s-]+?)\s+ilçesi\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9\s-]+?)\s+mahallesi(?:nde|nda|de|da)?\b/i,
    );
    const budgetRangeMatch = text.match(
      /([\d.,]+)\s*(milyon|bin)?\s*(?:-|–|ile)\s*([\d.,]+)\s*(milyon|bin)?\s*(?:tl|₺|türk lirası)?/i,
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
      phone: customerFields.phone,
      email: customerFields.email,
      city: locationMatch?.[1]?.trim() || customerFields.city,
      district: locationMatch?.[2]?.trim(),
      neighborhood: locationMatch?.[3]?.trim(),
      minBudget: budgetRangeMatch
        ? this.parseTurkishMoney(
            budgetRangeMatch[1],
            budgetRangeMatch[2] || budgetRangeMatch[4],
          )
        : undefined,
      maxBudget: budgetRangeMatch
        ? this.parseTurkishMoney(
            budgetRangeMatch[3],
            budgetRangeMatch[4] || budgetRangeMatch[2],
          )
        : budgetMatch
          ? this.parseTurkishMoney(budgetMatch[1], budgetMatch[2])
          : customerFields.budget,
      roomCounts: roomMatch
        ? [roomMatch[1].replace(/\s+/g, "").replace(",", ".")]
        : [],
      propertyTypes,
      statuses,
      purchaseIntent,
      customerRole,
      customerRoles: [customerRole],
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

    const roles = this.extractCrmCustomerRoles(message);
    const draft: PendingDirectCrmCustomer = {
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      phone: fields.phone,
      email: fields.email,
      city: fields.city,
      budget: fields.budget,
      notes: fields.notes,
      roles,
    };
    const now = Date.now();

    if (roles.length === 0) {
      this.pendingCrmCreations.set(user.id, {
        userId: user.id,
        createdAt: now,
        expiresAt: now + PENDING_CRM_CREATION_TTL_MS,
        mode: "select-role",
        sourceModule,
        customer: draft,
      });

      return {
        handled: true,
        success: true,
        action: "crm_customer_create",
        message: [
          `${draft.firstName} ${draft.lastName} için temel bilgileri aldım.`,
          this.buildCrmRoleSelectionMessage(),
        ].join("\n"),
      };
    }

    const duplicate = await this.findDuplicateDirectCustomer(draft, user);

    if (duplicate) {
      return {
        handled: true,
        success: false,
        message: `${this.customerFullName(duplicate)} adına ait veya aynı telefon/e-posta bilgisine sahip bir CRM kaydı zaten bulunuyor. Tekrar kayıt oluşturmadım.`,
        data: {
          customerId: duplicate.id,
          crmUrl: "/crm",
        },
      };
    }

    this.pendingCrmCreations.set(user.id, {
      userId: user.id,
      createdAt: now,
      expiresAt: now + PENDING_CRM_CREATION_TTL_MS,
      mode: "confirm-direct",
      sourceModule,
      selectedRoles: roles,
      customer: draft,
    });

    this.audit(
      user,
      sourceModule,
      "crm_customer_create_prepare",
      "success",
    );

    return this.buildDirectCrmConfirmationResponse(draft);
  }

  private buildDirectCrmConfirmationResponse(
    draft: PendingDirectCrmCustomer,
  ): LinaActionExecutionResult {
    const fullName = `${draft.firstName} ${draft.lastName}`.trim();

    return {
      handled: true,
      success: true,
      action: "crm_customer_create",
      requiresConfirmation: true,
      message: [
        "CRM kayıt taslağı hazır.",
        `Ad Soyad: ${fullName}`,
        `Rol: ${this.crmRoleListLabel(draft.roles || [])}`,
        draft.phone ? `Telefon: ${draft.phone}` : null,
        draft.email ? `E-posta: ${draft.email}` : null,
        draft.city ? `Şehir: ${draft.city}` : null,
        draft.budget
          ? `Bütçe / Bedel: ${new Intl.NumberFormat("tr-TR").format(draft.budget)} ₺`
          : null,
        "Bilgiler doğruysa “Kaydı Onayla”, vazgeçmek için “İptal Et” seçeneğini kullanın.",
      ]
        .filter(Boolean)
        .join("\n"),
      data: {
        confirmationType: "crm_customer_create",
        confirmLabel: "Kaydı Onayla",
        cancelLabel: "İptal Et",
        draft: {
          fullName,
          roles: draft.roles || [],
          phone: draft.phone,
          email: draft.email,
          city: draft.city,
          budget: draft.budget,
          notes: draft.notes,
        },
      },
    };
  }

  private async findDuplicateDirectCustomer(
    draft: PendingDirectCrmCustomer,
    user: LinaResolvedUser,
  ): Promise<CustomerLike | null> {
    const customers = (await this.crmService.getCustomers(
      user.id,
      user.role,
    )) as CustomerLike[];
    const fullName = `${draft.firstName} ${draft.lastName}`.trim();

    return (
      customers.find((customer) => {
        const sameName =
          this.normalize(this.customerFullName(customer)) ===
          this.normalize(fullName);
        const samePhone =
          Boolean(draft.phone && customer.phone) &&
          this.onlyDigits(draft.phone || "") ===
            this.onlyDigits(customer.phone || "");
        const sameEmail =
          Boolean(draft.email && customer.email) &&
          String(draft.email).toLocaleLowerCase("tr-TR") ===
            String(customer.email).toLocaleLowerCase("tr-TR");

        return sameName || samePhone || sameEmail;
      }) || null
    );
  }

  private async executeDirectCrmCustomerCreation(
    draft: PendingDirectCrmCustomer,
    user: LinaResolvedUser,
    sourceModule: LinaActionSourceModule,
  ): Promise<LinaActionExecutionResult> {
    const duplicate = await this.findDuplicateDirectCustomer(draft, user);

    if (duplicate) {
      return {
        handled: true,
        success: false,
        message: `${this.customerFullName(duplicate)} adına ait veya aynı telefon/e-posta bilgisine sahip bir CRM kaydı zaten bulunuyor. Tekrar kayıt oluşturmadım.`,
        data: {
          customerId: duplicate.id,
          crmUrl: "/crm",
        },
      };
    }

    const created = (await this.crmService.createCustomer(user.id, {
      firstName: draft.firstName,
      lastName: draft.lastName,
      phone: draft.phone,
      email: draft.email,
      city: draft.city,
      budget: draft.budget,
      notes: draft.notes,
      roles: draft.roles || [],
      source: "LINA",
      status: CustomerStatus.YENI_LEAD,
    })) as CustomerLike;

    this.audit(user, sourceModule, "crm_customer_create", "success");

    return {
      handled: true,
      success: true,
      action: "crm_customer_create",
      message: [
        `${this.customerFullName(created)} CRM’e başarıyla eklendi.`,
        `Rol: ${this.crmRoleListLabel(draft.roles || [])}`,
      ].join("\n"),
      data: {
        customerId: created.id,
        crmUrl: "/crm",
      },
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
    const pendingCrm = this.pendingCrmCreations.get(user.id);

    if (pendingCrm) {
      if (pendingCrm.expiresAt < Date.now()) {
        this.pendingCrmCreations.delete(user.id);

        if (
          this.isConfirmationWord(message) ||
          this.isCancellationWord(message)
        ) {
          return {
            handled: true,
            success: false,
            message:
              "Bekleyen CRM kayıt taslağının onay süresi doldu. Kaydı yeniden başlatın.",
          };
        }
      } else if (this.isCancellationWord(message)) {
        this.pendingCrmCreations.delete(user.id);
        this.audit(
          user,
          pendingCrm.sourceModule || sourceModule,
          "crm_customer_create_cancel",
          "success",
        );

        return {
          handled: true,
          success: true,
          action: "confirmation_cancelled",
          message: "Bekleyen CRM kayıt taslağı iptal edildi.",
        };
      } else if (pendingCrm.mode === "select-role") {
        if (this.isConfirmationWord(message)) {
          return {
            handled: true,
            success: false,
            message:
              "Henüz müşteri rolü seçilmedi. Önce Alıcı, Satıcı, Kiracı, Mal Sahibi, Yatırımcı, Müteahhit, İnşaat Firması veya Arsa Sahibi rollerinden birini söyleyin.",
          };
        }

        const selectedRoles = this.extractCrmCustomerRoles(message);

        if (selectedRoles.length === 0) {
          return {
            handled: true,
            success: false,
            action: "crm_customer_create",
            message: this.buildCrmRoleSelectionMessage(),
          };
        }

        pendingCrm.selectedRoles = selectedRoles;
        pendingCrm.expiresAt =
          Date.now() + PENDING_CRM_CREATION_TTL_MS;

        if (pendingCrm.customer) {
          pendingCrm.customer.roles = selectedRoles;
          pendingCrm.mode = "confirm-direct";
          this.pendingCrmCreations.set(user.id, pendingCrm);

          return this.buildDirectCrmConfirmationResponse(
            pendingCrm.customer,
          );
        }

        pendingCrm.mode = "collecting";
        this.pendingCrmCreations.set(user.id, pendingCrm);

        return {
          handled: true,
          success: true,
          action: "crm_customer_create",
          message: this.buildCrmRoleDetailPrompt(selectedRoles),
          data: {
            selectedRoles,
          },
        };
      } else if (pendingCrm.mode === "collecting") {
        if (this.isConfirmationWord(message)) {
          return {
            handled: true,
            success: false,
            message:
              "Henüz onaylanacak CRM taslağı oluşmadı. Önce seçilen role uygun müşteri ve gayrimenkul bilgilerini söyleyin.",
          };
        }

        if (!pendingCrm.selectedRoles?.length) {
          pendingCrm.mode = "select-role";
          this.pendingCrmCreations.set(user.id, pendingCrm);

          return {
            handled: true,
            success: false,
            message: this.buildCrmRoleSelectionMessage(),
          };
        }
      } else {
        if (!this.isConfirmationWord(message)) {
          return {
            handled: true,
            success: true,
            action:
              pendingCrm.mode === "confirm-natural"
                ? this.isSupplySideCrmRoles(
                    pendingCrm.lead?.customerRoles || [],
                  )
                  ? "crm_customer_create"
                  : "crm_customer_create_with_interest"
                : "crm_customer_create",
            requiresConfirmation: true,
            message:
              "Bekleyen CRM kayıt taslağı henüz onaylanmadı. Devam etmek için “Kaydı Onayla”, vazgeçmek için “İptal Et” seçeneğini kullanın.",
          };
        }

        this.pendingCrmCreations.delete(user.id);
        const originalSourceModule =
          pendingCrm.sourceModule || sourceModule;

        if (
          pendingCrm.mode === "confirm-natural" &&
          pendingCrm.lead
        ) {
          return this.executeNaturalCrmLeadCreation(
            pendingCrm.lead,
            user,
            originalSourceModule,
          );
        }

        if (
          pendingCrm.mode === "confirm-direct" &&
          pendingCrm.customer
        ) {
          return this.executeDirectCrmCustomerCreation(
            pendingCrm.customer,
            user,
            originalSourceModule,
          );
        }

        return {
          handled: true,
          success: false,
          message:
            "CRM kayıt taslağı okunamadı. Kaydı yeniden başlatın.",
        };
      }
    }

    const pending = this.pendingActions.get(user.id);

    if (!pending) {
      return { handled: false };
    }

    if (pending.expiresAt < Date.now()) {
      this.pendingActions.delete(user.id);

      if (
        this.isConfirmationWord(message) ||
        this.isCancellationWord(message)
      ) {
        return {
          handled: true,
          success: false,
          message:
            "Bekleyen işlem onay süresi doldu. İşlemi yeniden söyleyin.",
        };
      }

      return { handled: false };
    }

    if (this.isCancellationWord(message)) {
      this.pendingActions.delete(user.id);
      this.audit(
        user,
        sourceModule,
        "lina_action_cancel",
        "success",
      );

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
      this.audit(
        user,
        sourceModule,
        "crm_customer_delete",
        "success",
        undefined,
        3,
      );

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
    return /^(onayla|kaydi onayla|kaydı onayla|onayliyorum|evet|tamam|devam et)$/i.test(
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
