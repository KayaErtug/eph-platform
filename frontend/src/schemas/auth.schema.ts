import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(2, "Ad en az 2 karakter olmali"),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmali"),
  email: z.string().email("Gecerli bir email girin"),
  phone: z.string().regex(/^\+90\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/, "Gecerli bir telefon girin (+90 5xx xxx xx xx)"),
  password: z.string().min(6, "Sifre en az 6 karakter olmali"),
  inviteCode: z.string().min(1, "Davet kodu zorunludur"),
});

export const loginSchema = z.object({
  email: z.string().email("Gecerli bir email girin"),
  password: z.string().min(6, "Sifre en az 6 karakter olmali"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
