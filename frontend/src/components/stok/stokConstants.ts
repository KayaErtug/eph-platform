export const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık", KIRALIK: "Kiralık", GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık", DEVREN_KIRALIK: "Devren Kiralık",
  INSAAT_PROJESI: "İnşaat Projesi", KAT_KARSILIGI: "Kat Karşılığı",
  REZERVE: "Rezerve", SATILDI: "Satıldı", KIRALANDII: "Kiralandı", PASIF: "Pasif",
};

export const STATUS_COLORS: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  SATILIK: { color: "#067647", bg: "#ECFDF3", border: "#ABEFC6", dot: "#17B26A" },
  KIRALIK: { color: "#175CD3", bg: "#EFF8FF", border: "#B2DDFF", dot: "#2E90FA" },
  GUNLUK_KIRALIK: { color: "#175CD3", bg: "#EFF8FF", border: "#B2DDFF", dot: "#2E90FA" },
  DEVREN_SATILIK: { color: "#6941C6", bg: "#F4F3FF", border: "#D9D6FE", dot: "#7A5AF8" },
  DEVREN_KIRALIK: { color: "#6941C6", bg: "#F4F3FF", border: "#D9D6FE", dot: "#7A5AF8" },
  INSAAT_PROJESI: { color: "#B54708", bg: "#FFFAEB", border: "#FEDF89", dot: "#F79009" },
  KAT_KARSILIGI: { color: "#B54708", bg: "#FFFAEB", border: "#FEDF89", dot: "#F79009" },
  REZERVE: { color: "#93370D", bg: "#FFF6ED", border: "#FED7AA", dot: "#FB6514" },
  SATILDI: { color: "#344054", bg: "#F2F4F7", border: "#D0D5DD", dot: "#667085" },
  KIRALANDII: { color: "#344054", bg: "#F2F4F7", border: "#D0D5DD", dot: "#667085" },
  PASIF: { color: "#344054", bg: "#F2F4F7", border: "#D0D5DD", dot: "#667085" },
};

export const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire", VILLA: "Villa", REZIDANS: "Rezidans", MUSTAK_EV: "Müstakil Ev",
  KOSK_YALI: "Köşk/Yalı", CIFTLIK_EVI: "Çiftlik Evi", PREFABRIK_EV: "Prefabrik Ev",
  DUKKAN_MAGAZA: "Dükkan/Mağaza", OFIS_BURO: "Ofis/Büro", PLAZA_KATI: "Plaza Katı",
  DEPO_ANTREPO: "Depo/Antrepo", FABRIKA_ATOLYE: "Fabrika/Atölye",
  OTEL_PANSIYON: "Otel/Pansiyon", DUGUN_SALONU: "Düğün Salonu",
  ARSA: "Arsa", TARLA: "Tarla", BAHCE: "Bahçe", ZEYTINLIK: "Zeytinlik",
  ADA: "Ada", DEVRE_MULK: "Devre Mülk", TURISTIK_TESIS: "Turistik Tesis",
};

export const STATUS_GROUPS = [
  { label: "Satış", statuses: ["SATILIK","DEVREN_SATILIK","INSAAT_PROJESI","KAT_KARSILIGI"] },
  { label: "Kiralık", statuses: ["KIRALIK","GUNLUK_KIRALIK","DEVREN_KIRALIK"] },
  { label: "Diğer", statuses: ["REZERVE","SATILDI","KIRALANDII","PASIF"] },
];

export const CITIES = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Isparta","İçel","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"];
