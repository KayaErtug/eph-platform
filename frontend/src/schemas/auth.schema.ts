import { z } from "zod";

export function normalizePhoneForSystem(value?: string | null) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  let local = digits;

  if (local.startsWith("0090")) {
    local = local.slice(4);
  }

  if (local.startsWith("90")) {
    local = local.slice(2);
  }

  if (local.startsWith("0")) {
    local = local.slice(1);
  }

  if (local.length > 10) {
    local = local.slice(-10);
  }

  if (local.length !== 10 || !local.startsWith("5")) {
    return raw;
  }

  return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
}

const phoneSchema = z
  .string()
  .min(1, "Telefon numarası zorunludur")
  .transform((value) => normalizePhoneForSystem(value))
  .refine(
    (value) => /^\+90 5\d{2} \d{3} \d{2} \d{2}$/.test(value),
    "Telefon numarası +90 532 282 88 75 formatına uygun olmalıdır",
  );

export const registerSchema = z.object({
  firstName: z.string().min(2, "Ad en az 2 karakter olmalıdır"),

  lastName: z.string().min(2, "Soyad en az 2 karakter olmalıdır"),

  email: z.string().email("Geçerli bir e-posta adresi girin"),

  phone: phoneSchema,

  city: z.string().trim().min(2, "Şehir seçimi zorunludur"),

  role: z.enum(
    [
      "EMLAKCI",
      "MUTEAHHIT",
      "INSAAT_FIRMASI",
      "MODERATOR",
      "ADMIN",
      "SUPER_ADMIN",
    ],
    {
      error: "Meslek seçimi zorunludur",
    },
  ),

  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),

  inviteCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),

  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export type LoginFormData = z.infer<typeof loginSchema>;
