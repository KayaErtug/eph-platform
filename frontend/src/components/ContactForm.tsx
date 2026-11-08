"use client";

import { useRef, useState, type FormEvent } from "react";
import { Phone } from "lucide-react";
import api from "@/lib/api";
import { registerSchema } from "@/schemas/auth.schema";

export const CONTACT_SUCCESS_MESSAGE = "Mesajınız alındı. EPH ekibi kısa süre içinde sizinle iletişime geçecek.";
export const CONTACT_ERROR_MESSAGE = "Şu an gönderilemedi, lütfen telefonla ulaşın.";

const FIELDS = [
  { name: "adSoyad", label: "Ad Soyad", type: "text", autoComplete: "name" },
  { name: "eposta", label: "E-posta adresiniz", type: "email", autoComplete: "email" },
  { name: "telefon", label: "Telefon (5XX XXX XX XX)", type: "tel", autoComplete: "tel-national" },
] as const;

/** Ortak doğrulama + POST /public/contact. Tüm iletişim/kayıt formları bunu kullanmalı. */
export async function submitContactForm(form: HTMLFormElement) {
  const data = new FormData(form);
  const adSoyad = String(data.get("adSoyad") || "").trim();
  const eposta = String(data.get("eposta") || "").trim();
  const telefon = String(data.get("telefon") || "").replace(/\s/g, "");
  const ofisDurumu = data.get("ofisDurumu") === "YOK" ? "YOK" : "VAR";
  const website = String(data.get("website") || "");
  const errors: Record<string, string> = {};
  if (!adSoyad) errors.adSoyad = "Adınızı ve soyadınızı girin.";
  if (!registerSchema.shape.email.safeParse(eposta).success) errors.eposta = "Geçerli bir e-posta adresi girin.";
  if (!/^5\d{9}$/.test(telefon)) errors.telefon = "Telefon 10 haneli olmalı ve 5 ile başlamalıdır.";
  if (Object.keys(errors).length) return { errors, ok: false as const };
  await api.post("/public/contact", { adSoyad, eposta, telefon, ofisDurumu, website }, { timeout: 15000 });
  return { errors, ok: true as const };
}

export function ContactForm({ whatsappUrl, whatsappNumber }: { whatsappUrl: string; whatsappNumber: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const submitting = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    setResult(null);
    submitting.current = true;
    setSending(true);
    try {
      const outcome = await submitContactForm(form);
      setErrors(outcome.errors);
      if (!outcome.ok) {
        form.querySelector<HTMLInputElement>(`[name="${Object.keys(outcome.errors)[0]}"]`)?.focus();
        return;
      }
      setResult("success");
      form.reset();
    } catch {
      setResult("error");
    } finally {
      submitting.current = false;
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={sending} className="mt-5 grid gap-3">
      {FIELDS.map((field) => (
        <div key={field.name}>
          <label htmlFor={`contact-${field.name}`} className="mb-1 block text-[13px] font-semibold text-white/80">{field.label}</label>
          <input
            id={`contact-${field.name}`} name={field.name} type={field.type}
            autoComplete={field.autoComplete} placeholder={field.label} required
            disabled={sending} aria-invalid={Boolean(errors[field.name])}
            aria-describedby={errors[field.name] ? `contact-${field.name}-error` : undefined}
            className="h-11 w-full min-w-0 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[16px] text-[#0F172A] outline-none placeholder:text-[#6B7280] focus:border-[#2563EB] disabled:opacity-60"
          />
          {errors[field.name] && <p id={`contact-${field.name}-error`} className="mt-1 text-sm text-red-300">{errors[field.name]}</p>}
        </div>
      ))}
      <div hidden aria-hidden="true">
        <label htmlFor="contact-website">Web siteniz</label>
        <input id="contact-website" name="website" type="text" placeholder="Web siteniz" defaultValue="" tabIndex={-1} autoComplete="off" />
      </div>
      <fieldset disabled={sending} className="grid grid-cols-2 gap-3">
        <legend className="sr-only">Ofis durumu</legend>
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-white/12 text-[14px] text-white/80">
          <input type="radio" name="ofisDurumu" value="VAR" defaultChecked /> Ofisim Var
        </label>
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-white/12 text-[14px] text-white/80">
          <input type="radio" name="ofisDurumu" value="YOK" /> Yok
        </label>
      </fieldset>

      <button type="submit" disabled={sending} className="min-h-11 rounded-[10px] bg-[#2563EB] px-4 text-[14px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">{sending ? "Gönderiliyor…" : "Gönder"}</button>
      <p role="status" aria-live="polite" className={`text-sm ${result === "error" ? "text-red-300" : "text-blue-200"}`}>
        {result === "success" ? CONTACT_SUCCESS_MESSAGE : result === "error" ? CONTACT_ERROR_MESSAGE : ""}
      </p>
      <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-white/12 text-[13px] font-medium text-white/76">
        <Phone size={16} /> {whatsappNumber}
      </a>
    </form>
  );
}
