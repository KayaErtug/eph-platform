import { CustomerRole, UnitType } from "@prisma/client";

export const CRM_ROLLER = ["alıcı", "satıcı", "kiracı", "kiraya veren"] as const;
export type CrmRolEtiketi = (typeof CRM_ROLLER)[number];

export const CRM_ROL_ESLEME: Record<CrmRolEtiketi, CustomerRole> = {
  "alıcı": CustomerRole.ALICI,
  "satıcı": CustomerRole.SATICI,
  "kiracı": CustomerRole.KIRACI,
  "kiraya veren": CustomerRole.MAL_SAHIBI,
};

export const AMACLAR = ["SATILIK", "KIRALIK"] as const;
export type CrmAmac = (typeof AMACLAR)[number];

export const MULK_TIPLERI = Object.values(UnitType) as string[];

// Taslağın kalıcı alanları. null = bilinmiyor (uydurulmaz).
export type CrmTaslakAlanlari = {
  adSoyad: string | null;
  telefon: string | null;
  email: string | null;
  rol: CrmRolEtiketi | null;
  amac: CrmAmac | null;
  mulkTipi: string | null;
  il: string | null;
  ilce: string | null;
  mahalleler: string[];
  butceMin: number | null;
  butceMax: number | null;
  m2Min: number | null;
  m2Max: number | null;
  odaSayisi: string | null;
  odaEnAz: boolean;
  ozellikler: string[];
  not: string | null;
};

export const bosAlanlar = (): CrmTaslakAlanlari => ({
  adSoyad: null,
  telefon: null,
  email: null,
  rol: null,
  amac: null,
  mulkTipi: null,
  il: null,
  ilce: null,
  mahalleler: [],
  butceMin: null,
  butceMax: null,
  m2Min: null,
  m2Max: null,
  odaSayisi: null,
  odaEnAz: false,
  ozellikler: [],
  not: null,
});

// LLM'in tek turda döndürdüğü ham çıkarım (maskeli jetonlar henüz çözülmemiş).
export type HamCikarim = {
  niyet: "crm_kayit" | "duzeltme_veya_bilgi" | "onay" | "iptal" | "diger";
  adSoyad: string | null;
  telefon: string | null;
  email: string | null;
  rol: CrmRolEtiketi | null;
  amac: CrmAmac | null;
  mulkTipi: string | null;
  il: string | null;
  ilce: string | null;
  mahalleler: string[];
  mahalleDegistir: boolean;
  butceMin: number | null;
  butceMax: number | null;
  m2Min: number | null;
  m2Max: number | null;
  odaSayisi: string | null;
  odaEnAz: boolean | null;
  ozellikler: string[];
  ozellikCikar: string[];
  not: string | null;
};

export type TaslakDurumu = "AKTIF" | "ONAY_BEKLIYOR" | "KAYDEDILDI" | "IPTAL" | "SURESI_DOLDU";
