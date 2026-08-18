import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { LinaActionSourceModule } from "./lina-action.types";

export type LinaConfirmationRisk =
  | "WRITE"
  | "DELETE"
  | "FINANCIAL"
  | "AUTHORITY"
  | "BULK";

type LinaConfirmationStage = "FIRST" | "FINAL";

type PendingConfirmationPlan = {
  id: string;
  userId: string;
  sourceModule: LinaActionSourceModule;
  command: string;
  summary: string;
  risk: LinaConfirmationRisk;
  stage: LinaConfirmationStage;
  createdAt: number;
  expiresAt: number;
};

export type LinaConfirmationGateResult = {
  handled: boolean;
  success?: boolean;
  message?: string;
  requiresConfirmation?: boolean;
  executeMessage?: string;
  data?: {
    confirmation?: {
      id: string;
      risk: LinaConfirmationRisk;
      stage: LinaConfirmationStage;
      sourceModule: LinaActionSourceModule;
      moduleLabel: string;
      summary: string;
      confirmLabel: string;
      reviseLabel: string;
      cancelLabel: string;
    };
  };
};

const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class LinaConfirmationGateService {
  private readonly pendingPlans = new Map<string, PendingConfirmationPlan>();

  evaluate(
    rawMessage: string,
    userId: string,
    sourceModule: LinaActionSourceModule,
  ): LinaConfirmationGateResult {
    const message = String(rawMessage || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!message || !userId) {
      return { handled: false };
    }

    const pending = this.getLivePending(userId);

    if (this.isCancellationWord(message)) {
      if (!pending) {
        return { handled: false };
      }

      this.pendingPlans.delete(userId);

      return {
        handled: true,
        success: true,
        message: "Bekleyen işlem taslağı iptal edildi. Platformda herhangi bir değişiklik yapılmadı.",
        requiresConfirmation: false,
      };
    }

    if (this.isRevisionWord(message)) {
      if (!pending) {
        return { handled: false };
      }

      this.pendingPlans.delete(userId);

      return {
        handled: true,
        success: true,
        message:
          "Bekleyen işlem taslağını iptal ettim. Düzeltilmiş komutu yeniden yazın veya söyleyin; Lina yeni taslağı hazırlayıp tekrar onay isteyecek.",
        requiresConfirmation: false,
      };
    }

    if (this.isConfirmationWord(message)) {
      if (!pending) {
        // Lina Action Engine içinde zaten var olan özel onay akışlarının
        // (ör. CRM kayıt taslağı) çalışmasına izin ver.
        return { handled: false };
      }

      if (this.isCriticalRisk(pending.risk)) {
        if (pending.stage === "FIRST") {
          if (this.isFinalConfirmationWord(message)) {
            return {
              handled: true,
              success: false,
              message:
                "Bu kritik işlem için önce ilk onayı vermeniz gerekir. Devam etmek için “Onayla” deyin.",
              requiresConfirmation: true,
              data: this.buildConfirmationData(pending),
            };
          }

          pending.stage = "FINAL";
          pending.expiresAt = Date.now() + CONFIRMATION_TTL_MS;
          this.pendingPlans.set(userId, pending);

          return {
            handled: true,
            success: true,
            message: [
              "İlk onay alındı.",
              `İşlem: ${pending.summary}`,
              `Güvenlik seviyesi: ${this.riskLabel(pending.risk)}`,
              "Bu işlem yüksek etkili kabul edildiği için son kez kesin onay gerekiyor.",
              "Devam etmek için “Kesin Onayla”, vazgeçmek için “İptal” deyin.",
            ].join("\n"),
            requiresConfirmation: true,
            data: this.buildConfirmationData(pending),
          };
        }

        if (!this.isFinalConfirmationWord(message)) {
          return {
            handled: true,
            success: false,
            message:
              "Kritik işlem henüz kesin olarak onaylanmadı. Devam etmek için “Kesin Onayla”, vazgeçmek için “İptal” deyin.",
            requiresConfirmation: true,
            data: this.buildConfirmationData(pending),
          };
        }
      }

      this.pendingPlans.delete(userId);

      return {
        handled: true,
        success: true,
        executeMessage: pending.command,
        requiresConfirmation: false,
      };
    }

    if (pending) {
      // Kullanıcı bekleyen taslak varken yeni bir komut verirse eski taslak
      // geçersiz olur. Yeni komut kendi başına yeniden değerlendirilir.
      this.pendingPlans.delete(userId);
    }

    if (!this.looksLikeWriteCommand(message)) {
      return { handled: false };
    }

    const risk = this.classifyRisk(message);
    const now = Date.now();
    const plan: PendingConfirmationPlan = {
      id: randomUUID(),
      userId,
      sourceModule,
      command: message,
      summary: this.buildSummary(message),
      risk,
      stage: "FIRST",
      createdAt: now,
      expiresAt: now + CONFIRMATION_TTL_MS,
    };

    this.pendingPlans.set(userId, plan);

    const critical = this.isCriticalRisk(risk);

    return {
      handled: true,
      success: true,
      message: [
        "İşlem taslağı hazır.",
        `Modül: ${this.moduleLabel(sourceModule)}`,
        `İşlem: ${plan.summary}`,
        critical ? `Güvenlik seviyesi: ${this.riskLabel(risk)}` : null,
        "Henüz platformda herhangi bir değişiklik yapılmadı.",
        critical
          ? "İşlemi başlatmak için “Onayla”, değiştirmek için “Düzelt”, vazgeçmek için “İptal” deyin. Kritik işlem olduğu için ardından kesin onay da istenecek."
          : "Uygulamak için “Onayla”, değiştirmek için “Düzelt”, vazgeçmek için “İptal” deyin.",
      ]
        .filter(Boolean)
        .join("\n"),
      requiresConfirmation: true,
      data: this.buildConfirmationData(plan),
    };
  }

  private getLivePending(userId: string): PendingConfirmationPlan | null {
    const pending = this.pendingPlans.get(userId);

    if (!pending) {
      return null;
    }

    if (pending.expiresAt < Date.now()) {
      this.pendingPlans.delete(userId);
      return null;
    }

    return pending;
  }

  private looksLikeWriteCommand(message: string): boolean {
    const normalized = this.normalize(message);

    return /\b(ekle|olustur|kaydet|guncelle|degistir|duzelt|sil|kaldir|tamamla|yayinla|yayimla|gonder|cek|bagla|eslestir|ata|onayla|reddet|cevapla|yanit ver|yanitla|paylas|baslat|bitir|yenile|aktar|yukle)\b/.test(
      normalized,
    );
  }

  private classifyRisk(message: string): LinaConfirmationRisk {
    const normalized = this.normalize(message);

    if (
      /\b(kontor|odeme|ucret|tahsilat|bakiye|para|paket|satin al|fatura)\b/.test(
        normalized,
      )
    ) {
      return "FINANCIAL";
    }

    if (
      /\b(yetki|yetkilendir|rol|admin|moderator|super admin|kullanici yetkisi)\b/.test(
        normalized,
      )
    ) {
      return "AUTHORITY";
    }

    if (/\b(toplu|tumunu|tumu|hepsini|butun|secili kayitlar)\b/.test(normalized)) {
      return "BULK";
    }

    if (
      /\b(sil|kaldir|yayindan kaldir|havuzdan cek|iptal et|geri al)\b/.test(
        normalized,
      )
    ) {
      return "DELETE";
    }

    return "WRITE";
  }

  private isCriticalRisk(risk: LinaConfirmationRisk): boolean {
    return risk !== "WRITE";
  }

  private buildSummary(message: string): string {
    const cleaned = String(message || "")
      .replace(/\s+/g, " ")
      .replace(/[.!?]+$/g, "")
      .trim();

    if (!cleaned) {
      return "Platform verisi üzerinde değişiklik";
    }

    return cleaned.length > 220 ? `${cleaned.slice(0, 217).trim()}...` : cleaned;
  }

  private buildConfirmationData(plan: PendingConfirmationPlan) {
    return {
      confirmation: {
        id: plan.id,
        risk: plan.risk,
        stage: plan.stage,
        sourceModule: plan.sourceModule,
        moduleLabel: this.moduleLabel(plan.sourceModule),
        summary: plan.summary,
        confirmLabel:
          plan.stage === "FINAL" ? "Kesin Onayla" : "Onayla",
        reviseLabel: "Düzelt",
        cancelLabel: "İptal",
      },
    };
  }

  private moduleLabel(sourceModule: LinaActionSourceModule): string {
    const labels: Record<LinaActionSourceModule, string> = {
      dashboard: "Ana Panel",
      crm: "CRM",
      network: "Network",
      pool: "Havuz",
      notifications: "Bildirimler",
      general: "EPH Platform",
    };

    return labels[sourceModule] || "EPH Platform";
  }

  private riskLabel(risk: LinaConfirmationRisk): string {
    const labels: Record<LinaConfirmationRisk, string> = {
      WRITE: "Standart yazma işlemi",
      DELETE: "Silme / geri alma işlemi",
      FINANCIAL: "Finansal işlem",
      AUTHORITY: "Yetki / rol işlemi",
      BULK: "Toplu işlem",
    };

    return labels[risk];
  }

  private isConfirmationWord(message: string): boolean {
    const normalized = this.normalize(message);

    return /^(onayla|onayliyorum|evet|tamam|devam et|kesin onayla)$/.test(
      normalized,
    );
  }

  private isFinalConfirmationWord(message: string): boolean {
    return this.normalize(message) === "kesin onayla";
  }

  private isRevisionWord(message: string): boolean {
    return /^(duzelt|degistir|duzenle)$/.test(this.normalize(message));
  }

  private isCancellationWord(message: string): boolean {
    return /^(iptal|iptal et|vazgec|hayir)$/.test(this.normalize(message));
  }

  private normalize(value: string): string {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replaceAll("ı", "i")
      .replaceAll("ç", "c")
      .replaceAll("ğ", "g")
      .replaceAll("ö", "o")
      .replaceAll("ş", "s")
      .replaceAll("ü", "u")
      .replace(/\s+/g, " ");
  }
}
