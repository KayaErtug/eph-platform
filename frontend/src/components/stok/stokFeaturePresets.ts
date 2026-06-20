export const STOK_FEATURE_PRESETS: Record<string, string[]> = {
  DAIRE: ["interior", "exterior", "location", "transport", "front", "view", "accessibility"],
  REZIDANS: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury"],
  VILLA: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury"],
  YAZLIK: ["interior", "exterior", "location", "transport", "front", "view", "luxury"],
  MUSTAK_EV: ["interior", "exterior", "location", "transport", "front", "view", "accessibility"],
  KOY_EVI: ["interior", "exterior", "location", "transport", "front", "view", "landInfrastructure"],
  DAG_EVI_YAYLA_EVI: ["interior", "exterior", "location", "transport", "front", "view", "landInfrastructure", "luxury"],

  APARTMAN: ["exterior", "location", "transport", "front", "view", "accessibility", "commercial"],
  KOMPLE_BINA: ["exterior", "location", "transport", "front", "view", "accessibility", "commercial"],
  IS_HANI: ["commercial", "location", "transport", "front", "accessibility"],
  PLAZA_BINA: ["commercial", "exterior", "location", "transport", "front", "view", "accessibility", "luxury"],
  REZIDANS_BINA: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury"],
  OTEL_BINASI: ["tourism", "commercial", "exterior", "location", "transport", "front", "view", "luxury"],

  FABRIKA_URETIM_TESISI: ["commercial", "transport", "front", "exterior"],
  ATOLYE: ["commercial", "transport", "front", "exterior"],
  TICARI_ISLETME: ["commercial", "location", "transport", "front"],
  DEPO_ANTREPO: ["commercial", "transport", "front", "exterior"],
  DUKKAN_MAGAZA: ["commercial", "location", "transport", "front", "accessibility"],
  OFIS_BURO: ["interior", "commercial", "exterior", "location", "transport", "front", "accessibility"],
  BENZIN_ISTASYONU: ["commercial", "transport", "front", "exterior"],

  ARSA: ["location", "transport", "front", "view", "zoning", "landInfrastructure"],
  TARLA: ["location", "transport", "front", "view", "zoning", "landInfrastructure"],
  BAG: ["location", "transport", "front", "view", "zoning", "landInfrastructure"],
  BAHCE: ["location", "transport", "front", "view", "zoning", "landInfrastructure"],
  ZEYTINLIK: ["location", "transport", "front", "view", "zoning", "landInfrastructure"],

  KONUT_PROJESI: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury"],
  REZIDANS_PROJESI: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury"],
  VILLA_PROJESI: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury"],

  OTEL: ["tourism", "commercial", "location", "transport", "front", "view", "luxury"],
  PANSIYON: ["tourism", "commercial", "location", "transport", "front", "view"],
  KAMP_YERI: ["tourism", "location", "transport", "front", "view", "landInfrastructure"],
  TATIL_KOYU: ["tourism", "commercial", "location", "transport", "front", "view", "luxury"],
  DEVRE_MULK: ["tourism", "interior", "exterior", "location", "transport", "front", "view"],
};

export function getFeaturePresetKeys(type: string) {
  return STOK_FEATURE_PRESETS[type] || STOK_FEATURE_PRESETS.DAIRE;
}