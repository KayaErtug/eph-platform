import { Injectable } from "@nestjs/common";

@Injectable()
export class LinaNaturalCommandService {
  normalize(message?: string): string {
    const text = String(message || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      return text;
    }

    const taskCommand = this.normalizeTaskCommand(text);

    if (taskCommand) {
      return taskCommand;
    }

    const noteCommand = this.normalizeNoteCommand(text);

    if (noteCommand) {
      return noteCommand;
    }

    return text;
  }

  private normalizeTaskCommand(text: string): string | null {
    const normalized = this.normalizeText(text);
    const hasTaskSignal =
      /\bgorev(?:i|ini)?\b/.test(normalized) &&
      /\b(ekle|olustur|kaydet|hatirlat)\b/.test(normalized);

    if (!hasTaskSignal) {
      return null;
    }

    const nameMatch = text.match(
      /^(?:lina[,:;\s]+)?(.+?)\s+için\b/i,
    );
    const customerName = nameMatch?.[1]
      ?.replace(/[,:;.!?]+$/g, "")
      .trim();

    if (!customerName || customerName.split(/\s+/).length < 2) {
      return null;
    }

    const afterFor = text
      .slice(nameMatch?.[0]?.length || 0)
      .trim();
    const dueDate = this.extractRelativeDate(text);

    let taskText = afterFor
      .replace(
        /\b(?:\d+|bir|iki|üç|uc|dört|dort|beş|bes|altı|alti|yedi|sekiz|dokuz|on)\s+gün\s+sonra\b/gi,
        " ",
      )
      .replace(/\böbür\s+gün\b/gi, " ")
      .replace(/\bobur\s+gun\b/gi, " ")
      .replace(/\byarın\b/gi, " ")
      .replace(/\byarin\b/gi, " ")
      .replace(/\bbugün\b/gi, " ")
      .replace(/\bbugun\b/gi, " ")
      .replace(
        /\bgörev(?:i|ini)?\s*(?:ekle|oluştur|olustur|kaydet)?\b/gi,
        " ",
      )
      .replace(
        /\bgorev(?:i|ini)?\s*(?:ekle|olustur|kaydet)?\b/gi,
        " ",
      )
      .replace(/\b(?:ekle|oluştur|olustur|kaydet)\b/gi, " ")
      .replace(/[,:;.!?]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    taskText = this.professionalTaskTitle(taskText);

    if (!taskText) {
      taskText = "Müşteri takibi";
    }

    if (dueDate) {
      return `${customerName} için görev ekle tarih ${dueDate}: ${taskText}`;
    }

    return `${customerName} için görev ekle: ${taskText}`;
  }

  private normalizeNoteCommand(text: string): string | null {
    const normalized = this.normalizeText(text);

    if (!/\bnot(?:u|unu)?\b/.test(normalized) || !/\bekle\b/.test(normalized)) {
      return null;
    }

    const nameMatch = text.match(
      /^(?:lina[,:;\s]+)?(.+?)\s+için\b/i,
    );
    const customerName = nameMatch?.[1]
      ?.replace(/[,:;.!?]+$/g, "")
      .trim();

    if (!customerName || customerName.split(/\s+/).length < 2) {
      return null;
    }

    const afterFor = text
      .slice(nameMatch?.[0]?.length || 0)
      .trim();
    const noteMatch = afterFor.match(
      /(?:şu\s+)?not(?:u|unu)?\s+ekle\s*(?::|,|-)?\s*(.+)$/i,
    );
    const note = noteMatch?.[1]
      ?.replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!note) {
      return null;
    }

    return `${customerName} için not ekle: ${note}`;
  }

  private professionalTaskTitle(value: string): string {
    const normalized = this.normalizeText(value);

    if (/^(ara|arayalim|arayalım)$/.test(normalized)) {
      return "Müşteriyi ara";
    }

    if (/^(geri ara|tekrar ara|yeniden ara)$/.test(normalized)) {
      return "Müşteriyi tekrar ara";
    }

    if (/toplantiya davet/.test(normalized)) {
      return "Toplantıya davet et";
    }

    if (/whatsapp/.test(normalized)) {
      return "WhatsApp üzerinden iletişime geç";
    }

    const cleaned = value
      .replace(/\barayalım\b/gi, "ara")
      .replace(/\barayalim\b/gi, "ara")
      .replace(/\bdavet edelim\b/gi, "davet et")
      .replace(/\shatırlat$/i, "")
      .replace(/\shatirlat$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) {
      return "";
    }

    return cleaned.charAt(0).toLocaleUpperCase("tr-TR") + cleaned.slice(1);
  }

  private extractRelativeDate(text: string): string | null {
    const normalized = this.normalizeText(text);
    const relativeMatch = normalized.match(
      /\b(\d+|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on)\s+gun\s+sonra\b/,
    );

    if (relativeMatch) {
      const days = this.parseDayCount(relativeMatch[1]);

      if (days !== null) {
        return this.dateAfterDays(days);
      }
    }

    if (/\bobur gun\b/.test(normalized)) {
      return this.dateAfterDays(2);
    }

    if (/\byarin\b/.test(normalized)) {
      return this.dateAfterDays(1);
    }

    if (/\bbugun\b/.test(normalized)) {
      return this.dateAfterDays(0);
    }

    return null;
  }

  private parseDayCount(value: string): number | null {
    const numeric = Number(value);

    if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 365) {
      return numeric;
    }

    const map: Record<string, number> = {
      bir: 1,
      iki: 2,
      uc: 3,
      dort: 4,
      bes: 5,
      alti: 6,
      yedi: 7,
      sekiz: 8,
      dokuz: 9,
      on: 10,
    };

    return Object.prototype.hasOwnProperty.call(map, value)
      ? map[value]
      : null;
  }

  private dateAfterDays(days: number): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const date = new Date(Date.UTC(year, month - 1, day));

    date.setUTCDate(date.getUTCDate() + days);

    const dd = String(date.getUTCDate()).padStart(2, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getUTCFullYear());

    return `${dd}.${mm}.${yyyy}`;
  }

  private normalizeText(value: string): string {
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
