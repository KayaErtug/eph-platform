import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type LinaMaskKind = "TEL" | "EPOSTA" | "TC" | "IBAN";

// Konuşma bazlı geri çözülebilir eşleme: jeton -> gerçek değer, tür başına sayaç.
export type LinaMaskState = {
  sayac: Partial<Record<LinaMaskKind, number>>;
  esleme: Record<string, string>;
};

export const emptyMaskState = (): LinaMaskState => ({ sayac: {}, esleme: {} });

const CURRENCY_AFTER = /^\s*(?:tl|₺|lira|try|milyon|bin)\b/i;
const MONEY_BEFORE = /(?:b[uü]t[cç]e|fiyat|[uü]cret|bedel)\s*[:=]?\s*$/i;

@Injectable()
export class LinaMaskingService {
  // Modele giden metni numaralı jetonlara çevirir. Aynı değer aynı jetonu alır.
  mask(text: string, state: LinaMaskState): { text: string; state: LinaMaskState } {
    const next: LinaMaskState = { sayac: { ...state.sayac }, esleme: { ...state.esleme } };
    const token = (kind: LinaMaskKind, value: string): string => {
      const existing = Object.keys(next.esleme).find(
        (key) => key.startsWith(`[${kind}_`) && next.esleme[key] === value,
      );
      if (existing) return existing;
      const n = (next.sayac[kind] || 0) + 1;
      next.sayac[kind] = n;
      const created = `[${kind}_${n}]`;
      next.esleme[created] = value;
      return created;
    };

    let out = String(text || "");
    out = out.replace(/\bTR\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/gi, (m) => token("IBAN", m));
    out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (m) => token("EPOSTA", m));
    out = out.replace(
      /(?<![\d.,])(?:\+?90[\s-]?|0)?\(?5\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}(?!\d)/g,
      (m, offset: number, whole: string) => {
        // "550 000 00 00 TL" gibi tutarlar telefon değildir.
        if (CURRENCY_AFTER.test(whole.slice(offset + m.length))) return m;
        if (MONEY_BEFORE.test(whole.slice(Math.max(0, offset - 16), offset))) return m;
        return token("TEL", m.trim());
      },
    );
    out = out.replace(/(?<![\d.,])[1-9]\d{10}(?![\d.,]?\d)/g, (m, offset: number, whole: string) => {
      if (CURRENCY_AFTER.test(whole.slice(offset + m.length))) return m;
      return token("TC", m);
    });
    return { text: out, state: next };
  }

  // Jetonları gerçek değerlere geri koyar.
  unmask(text: string, state: LinaMaskState): string {
    return String(text || "").replace(/\[(?:TEL|EPOSTA|TC|IBAN)_\d+\]/g, (m) => state.esleme[m] ?? m);
  }

  // Yalnızca tek bir alan değeri jetonsa gerçek değeri verir; jeton değilse null (modelin uydurduğu rakam kabul edilmez).
  resolveToken(value: unknown, kind: LinaMaskKind, state: LinaMaskState): string | null {
    const match = String(value ?? "").trim().match(/^\[([A-Z]+)_(\d+)\]$/);
    if (!match || match[1] !== kind) return null;
    return state.esleme[`[${match[1]}_${match[2]}]`] ?? null;
  }

  // Eşleme DB'de şifreli saklanır (AES-256-GCM). Anahtar: LINA_MASK_KEY veya JWT_SECRET.
  encrypt(state: LinaMaskState): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const body = Buffer.concat([cipher.update(JSON.stringify(state), "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64")).join(".");
  }

  decrypt(payload?: string | null): LinaMaskState {
    if (!payload) return emptyMaskState();
    try {
      const [iv, tag, body] = payload.split(".").map((part) => Buffer.from(part, "base64"));
      const decipher = createDecipheriv("aes-256-gcm", this.key(), iv);
      decipher.setAuthTag(tag);
      const json = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
      const parsed = JSON.parse(json) as LinaMaskState;
      return { sayac: parsed.sayac || {}, esleme: parsed.esleme || {} };
    } catch {
      return emptyMaskState();
    }
  }

  private key(): Buffer {
    const secret = process.env.LINA_MASK_KEY?.trim() || process.env.JWT_SECRET?.trim();
    if (!secret) throw new Error("LINA_MASK_KEY veya JWT_SECRET yapılandırılmamış.");
    return createHash("sha256").update(secret).digest();
  }
}
