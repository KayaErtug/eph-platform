export const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık",
  DEVREN_KIRALIK: "Devren Kiralık",
  INSAAT_PROJESI: "İnşaat Projesi",
  KAT_KARSILIGI: "Kat Karşılığı",
  REZERVE: "Rezerve",
  SATILDI: "Satıldı",
  KIRALANDII: "Kiralandı",
  PASIF: "Pasif",
};

export const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  SATILIK: { color: "#2D6A4F", bg: "#F0FAF4" },
  KIRALIK: { color: "#1A4A7A", bg: "#EEF4FF" },
  GUNLUK_KIRALIK: { color: "#1A4A7A", bg: "#EEF4FF" },
  DEVREN_SATILIK: { color: "#5B2D8E", bg: "#F5F0FF" },
  DEVREN_KIRALIK: { color: "#5B2D8E", bg: "#F5F0FF" },
  INSAAT_PROJESI: { color: "#B8560B", bg: "#FFF5ED" },
  KAT_KARSILIGI: { color: "#B8860B", bg: "#FFFBF0" },
  REZERVE: { color: "#B8860B", bg: "#FFFBF0" },
  SATILDI: { color: "#8A8A8A", bg: "#F5F5F5" },
  KIRALANDII: { color: "#8A8A8A", bg: "#F5F5F5" },
  PASIF: { color: "#8A8A8A", bg: "#F5F5F5" },
};

export const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  REZIDANS: "Rezidans",
  MUSTAK_EV: "Müstakil Ev",
  KOSK_YALI: "Köşk/Yalı",
  CIFTLIK_EVI: "Çiftlik Evi",
  PREFABRIK_EV: "Prefabrik Ev",
  DUKKAN_MAGAZA: "Dükkan/Mağaza",
  OFIS_BURO: "Ofis/Büro",
  PLAZA_KATI: "Plaza Katı",
  DEPO_ANTREPO: "Depo/Antrepo",
  FABRIKA_ATOLYE: "Fabrika/Atölye",
  OTEL_PANSIYON: "Otel/Pansiyon",
  DUGUN_SALONU: "Düğün Salonu",
  ARSA: "Arsa",
  TARLA: "Tarla",
  BAHCE: "Bahçe",
  ZEYTINLIK: "Zeytinlik",
  ADA: "Ada",
  DEVRE_MULK: "Devre Mülk",
  TURISTIK_TESIS: "Turistik Tesis",
};

export const STATUS_GROUPS = [
  { label: "Satış", statuses: ["SATILIK", "DEVREN_SATILIK", "INSAAT_PROJESI", "KAT_KARSILIGI"] },
  { label: "Kiralık", statuses: ["KIRALIK", "GUNLUK_KIRALIK", "DEVREN_KIRALIK"] },
  { label: "Diğer", statuses: ["REZERVE", "SATILDI", "KIRALANDII", "PASIF"] },
];

export const CITIES = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Isparta","İçel","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"];

export const getStatusStyle = (status: string) =>
  STATUS_COLORS[status] || { color: "#8A8A8A", bg: "#F5F5F5" };
