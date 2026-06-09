"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  Bookmark,
  ChevronRight,
  Clock3,
  Construction,
  Flame,
  Handshake,
  Home,
  Inbox,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Wrench,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type NetworkUser = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  email?: string | null;
};

type NetworkPost = {
  id: string;
  userId?: string | null;
  user?: NetworkUser | null;
  User?: NetworkUser | null;
  urgency?: string | null;
  type?: string | null;
  title: string;
  description?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  visibility?: string | null;
  tags?: string[] | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  viewCount?: number | null;
  requestCount?: number | null;
  followerCount?: number | null;
};

type Conversation = {
  id: string;
  unreadCount?: number;
};

type ForumCategory =
  | "PORTFOY_ARIYORUM"
  | "KAT_KARSILIGI_ARSA_ARIYORUM"
  | "BOLGESEL_SATIS_OFISI_ARIYORUM"
  | "IS_ORTAGI_ARIYORUM"
  | "YATIRIMCI_ARIYORUM"
  | "SEKTOREL_IHTIYACLAR"
  | "DUYURU"
  | "KAMPANYA_DUYURU"
  | "DIGER"
  | "BOLGE_ORTAGI_ARIYORUM"
  | "PORTFOY_ORTAGI_ARIYORUM"
  | "SATIS_OFISI_ARIYORUM"
  | "KAMPANYA_DUYURULARI"
  | "MUTEAHHIT_YUKLENICI_ARIYORUM"
  | "ULUSAL_BOLGESEL_SATIS_PARTNERI_ARIYORUM"
  | "PLATFORM_DUYURUSU"
  | "SISTEM_GUNCELLEMESI"
  | "EGITIM_BILGILENDIRME"
  | "SEKTOREL_SORU";

type ForumCategoryOption = {
  value: ForumCategory;
  label: string;
  hint: string;
  group: "Talep" | "Ortaklık" | "Duyuru" | "Soru" | "Diğer";
};

type CreateTopicForm = {
  title: string;
  category: ForumCategory | "";
  city: string;
  district: string;
  propertyType: string;
  budget: string;
  currency: string;
  detail: string;
  urgency: string;
  validFor: string;
  visibility: string;
};

const ALL_CATEGORY_OPTIONS: ForumCategoryOption[] = [
  { value: "PORTFOY_ARIYORUM", label: "Portföy Arıyorum", hint: "Hazır müşteriniz veya talebiniz için uygun portföy arayın.", group: "Talep" },
  { value: "KAT_KARSILIGI_ARSA_ARIYORUM", label: "Kat Karşılığı Arsa Arıyorum", hint: "Arsa, müteahhit veya kat karşılığı geliştirme talebi açın.", group: "Talep" },
  { value: "BOLGESEL_SATIS_OFISI_ARIYORUM", label: "Bölgesel Satış Ofisi Arıyorum", hint: "Proje ya da portföy satışı için bölgesel satış ofisi arayın.", group: "Ortaklık" },
  { value: "IS_ORTAGI_ARIYORUM", label: "İş Ortağı Arıyorum", hint: "Mimar, satış partneri, yüklenici veya çözüm ortağı arayın.", group: "Ortaklık" },
  { value: "YATIRIMCI_ARIYORUM", label: "Yatırımcı Arıyorum", hint: "Finansman, yatırım veya proje ortağı arayın.", group: "Talep" },
  { value: "SEKTOREL_IHTIYACLAR", label: "Sektörel İhtiyaçlar", hint: "Tapu takipçisi, ekspertiz, drone, fotoğrafçı, mimar ve benzeri ihtiyaçları paylaşın.", group: "Soru" },
  { value: "DUYURU", label: "Duyuru", hint: "Sektörel veya platform odaklı kısa duyuru paylaşın.", group: "Duyuru" },
  { value: "KAMPANYA_DUYURU", label: "Kampanya & Duyuru", hint: "Kampanya, lansman veya dönemsel bilgilendirme paylaşın.", group: "Duyuru" },
  { value: "DIGER", label: "Diğer", hint: "Listede olmayan profesyonel ihtiyacınızı paylaşın.", group: "Diğer" },
  { value: "BOLGE_ORTAGI_ARIYORUM", label: "Bölge Ortağı Arıyorum", hint: "Eski kayıt kategorisi.", group: "Ortaklık" },
  { value: "PORTFOY_ORTAGI_ARIYORUM", label: "Portföy Ortağı Arıyorum", hint: "Eski kayıt kategorisi.", group: "Ortaklık" },
  { value: "SATIS_OFISI_ARIYORUM", label: "Satış Ofisi Arıyorum", hint: "Eski kayıt kategorisi.", group: "Ortaklık" },
  { value: "KAMPANYA_DUYURULARI", label: "Kampanya Duyuruları", hint: "Eski kayıt kategorisi.", group: "Duyuru" },
  { value: "MUTEAHHIT_YUKLENICI_ARIYORUM", label: "Müteahhit / Yüklenici Arıyorum", hint: "Eski kayıt kategorisi.", group: "Ortaklık" },
  { value: "ULUSAL_BOLGESEL_SATIS_PARTNERI_ARIYORUM", label: "Ulusal/Bölgesel Satış Partneri Arıyorum", hint: "Eski kayıt kategorisi.", group: "Ortaklık" },
  { value: "PLATFORM_DUYURUSU", label: "Platform Duyurusu", hint: "Eski kayıt kategorisi.", group: "Duyuru" },
  { value: "SISTEM_GUNCELLEMESI", label: "Sistem Güncellemesi", hint: "Eski kayıt kategorisi.", group: "Duyuru" },
  { value: "EGITIM_BILGILENDIRME", label: "Eğitim / Bilgilendirme", hint: "Eski kayıt kategorisi.", group: "Duyuru" },
  { value: "SEKTOREL_SORU", label: "Sektörel Soru", hint: "Eski kayıt kategorisi.", group: "Soru" },
];

const ROLE_CATEGORY_MAP: Record<string, ForumCategory[]> = {
  EMLAKCI: ["PORTFOY_ARIYORUM", "KAT_KARSILIGI_ARSA_ARIYORUM", "SEKTOREL_IHTIYACLAR", "DUYURU"],
  MUTEAHHIT: ["BOLGESEL_SATIS_OFISI_ARIYORUM", "KAT_KARSILIGI_ARSA_ARIYORUM", "KAMPANYA_DUYURU", "SEKTOREL_IHTIYACLAR", "DIGER"],
  INSAAT_FIRMASI: ["KAT_KARSILIGI_ARSA_ARIYORUM", "BOLGESEL_SATIS_OFISI_ARIYORUM", "IS_ORTAGI_ARIYORUM", "YATIRIMCI_ARIYORUM", "SEKTOREL_IHTIYACLAR", "KAMPANYA_DUYURU", "DIGER"],
  ADMIN: ["DUYURU", "SEKTOREL_IHTIYACLAR"],
  SUPER_ADMIN: ["DUYURU", "SEKTOREL_IHTIYACLAR", "DIGER"],
};

const REQUEST_TABS = [
  { key: "Tümü", label: "Tümü", shortLabel: "Tümü", icon: "target", tone: "violet" },
  { key: "Portföy Arıyorum", label: "Portföy Arıyorum", shortLabel: "Portföy", icon: "home", tone: "blue" },
  { key: "Kat Karşılığı Arsa Arıyorum", label: "Kat Karşılığı Arsa Arıyorum", shortLabel: "Kat Arsa", icon: "construction", tone: "green" },
  { key: "Bölgesel Satış Ofisi Arıyorum", label: "Bölgesel Satış Ofisi Arıyorum", shortLabel: "Satış Ofisi", icon: "sales", tone: "orange" },
  { key: "İş Ortağı Arıyorum", label: "İş Ortağı Arıyorum", shortLabel: "İş Ortağı", icon: "handshake", tone: "orange" },
  { key: "Yatırımcı Arıyorum", label: "Yatırımcı Arıyorum", shortLabel: "Yatırımcı", icon: "investor", tone: "violet" },
  { key: "Sektörel İhtiyaçlar", label: "Sektörel İhtiyaçlar", shortLabel: "Sektörel", icon: "wrench", tone: "orange" },
  { key: "Duyuru", label: "Duyuru", shortLabel: "Duyuru", icon: "megaphone", tone: "purple" },
  { key: "Diğer", label: "Diğer", shortLabel: "Diğer", icon: "other", tone: "violet" },
] as const;

const VALID_OPTIONS = ["3 gün", "7 gün", "15 gün", "30 gün"];
const URGENCY_OPTIONS = ["Normal", "Acil", "Müşteri Hazır", "Sıcak Talep"];
const VISIBILITY_OPTIONS = [
  { label: "Tüm EPH", value: "TUM_EPH" },
  { label: "Sadece emlakçılar", value: "SADECE_EMLAKCILAR" },
  { label: "Sadece müteahhitler / inşaat firmaları", value: "SADECE_MUTEAHHITLER" },
  { label: "Sadece bağlantılarım", value: "SADECE_BAGLANTILARIM" },
];

const MAX_FORUM_TITLE_LENGTH = 50;
const MAX_FORUM_TOPIC_LENGTH = 100;
const MAX_FORUM_DESCRIPTION_LENGTH = 200;

const CURRENCY_OPTIONS = ["TRY", "USD", "EUR", "GBP"];

const CITY_OPTIONS = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", "Kıbrıs", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
];

const DISTRICT_OPTIONS_BY_CITY: Record<string, string[]> = {
  Denizli: ["Acıpayam", "Babadağ", "Baklan", "Bekilli", "Beyağaç", "Bozkurt", "Buldan", "Çal", "Çameli", "Çardak", "Çivril", "Güney", "Honaz", "Kale", "Merkezefendi", "Pamukkale", "Sarayköy", "Serinhisar", "Tavas"],
  İstanbul: ["Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"],
  Ankara: ["Altındağ", "Ayaş", "Bala", "Beypazarı", "Çankaya", "Çubuk", "Elmadağ", "Etimesgut", "Gölbaşı", "Keçiören", "Kızılcahamam", "Mamak", "Nallıhan", "Polatlı", "Pursaklar", "Sincan", "Yenimahalle"],
  İzmir: ["Aliağa", "Balçova", "Bayındır", "Bayraklı", "Bergama", "Bornova", "Buca", "Çeşme", "Çiğli", "Dikili", "Foça", "Gaziemir", "Güzelbahçe", "Karabağlar", "Karaburun", "Karşıyaka", "Kemalpaşa", "Konak", "Menderes", "Menemen", "Narlıdere", "Seferihisar", "Selçuk", "Torbalı", "Urla"],
  Muğla: ["Bodrum", "Dalaman", "Datça", "Fethiye", "Kavaklıdere", "Köyceğiz", "Marmaris", "Menteşe", "Milas", "Ortaca", "Seydikemer", "Ula", "Yatağan"],
  Antalya: ["Akseki", "Alanya", "Aksu", "Döşemealtı", "Elmalı", "Finike", "Gazipaşa", "Kaş", "Kemer", "Kepez", "Konyaaltı", "Korkuteli", "Kumluca", "Manavgat", "Muratpaşa", "Serik"],
  Kıbrıs: ["Lefkoşa", "Girne", "Gazimağusa", "Güzelyurt", "İskele", "Lefke"],
};

function getDistrictOptions(city: string) {
  return DISTRICT_OPTIONS_BY_CITY[city] || ["Merkez"];
}

const DEFAULT_FORM: CreateTopicForm = {
  title: "",
  category: "",
  city: "",
  district: "",
  propertyType: "",
  budget: "",
  currency: "TRY",
  detail: "",
  urgency: "Normal",
  validFor: "7 gün",
  visibility: "TUM_EPH",
};

function normalizeText(value?: string | null) {
  return String(value || "").toLocaleLowerCase("tr-TR").trim();
}

function normalizeRole(role?: string | null) {
  return String(role || "").toLocaleUpperCase("tr-TR").trim();
}

function getUserName(user?: NetworkUser | null) {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return full || user?.email?.split("@")[0] || "EPH Üyesi";
}

function getPostUser(post: NetworkPost) {
  return post.user || post.User || null;
}

function roleLabel(role?: string | null) {
  const normalized = normalizeRole(role);

  if (normalized === "ADMIN" || normalized === "SUPER_ADMIN") return "Admin";
  if (["MUTEAHHIT", "MÜTEAHHİT", "MÜTAHHİT"].includes(normalized)) return "Müteahhit";
  if (["INSAAT_FIRMASI", "İNŞAAT_FİRMASI"].includes(normalized)) return "İnşaat Firması";

  return "Emlakçı";
}

function getCategoryOption(value?: string | null) {
  const normalized = String(value || "").trim();
  const byValue = ALL_CATEGORY_OPTIONS.find((item) => item.value === normalized);

  if (byValue) return byValue;

  const byLabel = ALL_CATEGORY_OPTIONS.find((item) => normalizeText(item.label) === normalizeText(normalized));

  if (byLabel) return byLabel;

  const text = normalizeText(normalized);

  if (text.includes("portföy") || text.includes("portfoy")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "PORTFOY_ARIYORUM")!;
  if (text.includes("bölge") || text.includes("bolge") || text.includes("satış ofisi") || text.includes("satis ofisi")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "BOLGESEL_SATIS_OFISI_ARIYORUM")!;
  if (text.includes("iş ortağı") || text.includes("is ortagi")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "IS_ORTAGI_ARIYORUM")!;
  if (text.includes("kampanya")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "KAMPANYA_DUYURU")!;
  if (text.includes("kat") || text.includes("arsa")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "KAT_KARSILIGI_ARSA_ARIYORUM")!;
  if (text.includes("yüklenici") || text.includes("yuklenici") || text.includes("müteahhit") || text.includes("muteahhit")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "MUTEAHHIT_YUKLENICI_ARIYORUM")!;
  if (text.includes("yatırım") || text.includes("yatirim")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "YATIRIMCI_ARIYORUM")!;
  if (text.includes("soru") || text.includes("sektörel") || text.includes("sektorel")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "SEKTOREL_IHTIYACLAR")!;
  if (text.includes("duyuru")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "DUYURU")!;

  return ALL_CATEGORY_OPTIONS.find((item) => item.value === "DIGER")!;
}

function categoryLabel(value?: string | null) {
  return getCategoryOption(value).label;
}

function categoryGroup(value?: string | null) {
  return getCategoryOption(value).group;
}

function categoryTone(value?: string | null) {
  const group = categoryGroup(value);

  if (group === "Ortaklık") return "bg-orange-50 text-orange-700";
  if (group === "Duyuru") return "bg-emerald-50 text-emerald-700";
  if (group === "Soru") return "bg-slate-100 text-slate-700";
  if (group === "Diğer") return "bg-violet-50 text-violet-700";

  return "bg-[#EFF6FF] text-[#1557D6]";
}

function formatMoney(value?: string | number | null, currency = "TRY") {
  if (value == null || value === "") return "";

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));

  if (!numeric) return String(value);

  const currencyLabel = currency === "TRY" ? "TL" : currency;

  return `${numeric.toLocaleString("tr-TR")} ${currencyLabel}`;
}

function formatBudgetInput(value: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 13);

  if (!digits) return "";

  return Number(digits).toLocaleString("tr-TR");
}

function budgetCurrencyFromPost(post: NetworkPost) {
  const tag = (post.tags || []).find((item) => String(item || "").startsWith("Döviz:"));
  const currency = String(tag || "").replace("Döviz:", "").trim();

  return currency || "TRY";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Yeni";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function remainingTime(value?: string | null) {
  if (!value) return "Süre yok";

  const diff = new Date(value).getTime() - Date.now();

  if (diff <= 0) return "Süre doldu";

  const day = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return `${day} gün kaldı`;
}

function expiresAtFromValidFor(value: string) {
  const date = new Date();

  if (value === "3 gün") date.setDate(date.getDate() + 3);
  else if (value === "7 gün") date.setDate(date.getDate() + 7);
  else if (value === "15 gün") date.setDate(date.getDate() + 15);
  else date.setDate(date.getDate() + 30);

  return date.toISOString();
}

function categoryFamily(value?: string | null) {
  const category = getCategoryOption(value).value;

  if (category === "PORTFOY_ARIYORUM") return "Portföy Arıyorum";
  if (category === "KAT_KARSILIGI_ARSA_ARIYORUM") return "Kat Karşılığı Arsa Arıyorum";
  if (["BOLGESEL_SATIS_OFISI_ARIYORUM", "SATIS_OFISI_ARIYORUM"].includes(category)) return "Bölgesel Satış Ofisi Arıyorum";
  if (["IS_ORTAGI_ARIYORUM", "BOLGE_ORTAGI_ARIYORUM", "PORTFOY_ORTAGI_ARIYORUM", "MUTEAHHIT_YUKLENICI_ARIYORUM", "ULUSAL_BOLGESEL_SATIS_PARTNERI_ARIYORUM"].includes(category)) return "İş Ortağı Arıyorum";
  if (category === "YATIRIMCI_ARIYORUM") return "Yatırımcı Arıyorum";
  if (["SEKTOREL_IHTIYACLAR", "SEKTOREL_SORU"].includes(category)) return "Sektörel İhtiyaçlar";
  if (["DUYURU", "KAMPANYA_DUYURU", "KAMPANYA_DUYURULARI", "PLATFORM_DUYURUSU", "SISTEM_GUNCELLEMESI", "EGITIM_BILGILENDIRME"].includes(category)) return "Duyuru";
  if (category === "DIGER") return "Diğer";

  return "Tümü";
}

function postMatchesFlowFilter(post: NetworkPost, filter: string) {
  if (filter === "Tümü" || filter === "Tüm Talepler") return true;
  return categoryFamily(post.type) === filter;
}

function tabCount(posts: NetworkPost[], key: string) {
  if (key === "Tümü" || key === "Tüm Talepler") return posts.length;
  return posts.filter((post) => categoryFamily(post.type) === key).length;
}

function toneClasses(tone: string) {
  if (tone === "green") return { tile: "from-emerald-50 to-white border-emerald-100 text-emerald-600 shadow-emerald-100/70", active: "border-emerald-300 shadow-emerald-200/80 ring-2 ring-emerald-100", pill: "bg-emerald-100 text-emerald-700", accent: "bg-emerald-500", button: "bg-emerald-50 text-emerald-700 border-emerald-100" };
  if (tone === "orange") return { tile: "from-orange-50 to-white border-orange-100 text-orange-600 shadow-orange-100/70", active: "border-orange-300 shadow-orange-200/80 ring-2 ring-orange-100", pill: "bg-orange-100 text-orange-700", accent: "bg-orange-500", button: "bg-orange-50 text-orange-700 border-orange-100" };
  if (tone === "purple") return { tile: "from-violet-50 to-white border-violet-100 text-violet-600 shadow-violet-100/70", active: "border-violet-300 shadow-violet-200/80 ring-2 ring-violet-100", pill: "bg-violet-100 text-violet-700", accent: "bg-violet-500", button: "bg-violet-50 text-violet-700 border-violet-100" };
  if (tone === "violet") return { tile: "from-purple-50 to-white border-purple-100 text-purple-600 shadow-purple-100/70", active: "border-purple-300 shadow-purple-200/80 ring-2 ring-purple-100", pill: "bg-purple-100 text-purple-700", accent: "bg-purple-500", button: "bg-purple-50 text-purple-700 border-purple-100" };

  return { tile: "from-blue-50 to-white border-blue-100 text-blue-600 shadow-blue-100/70", active: "border-blue-300 shadow-blue-200/80 ring-2 ring-blue-100", pill: "bg-blue-100 text-blue-700", accent: "bg-blue-500", button: "bg-blue-50 text-blue-700 border-blue-100" };
}

function RequestTabIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  if (icon === "home") return <Home size={size} strokeWidth={2.4} />;
  if (icon === "construction") return <Construction size={size} strokeWidth={2.4} />;
  if (icon === "sales") return <BriefcaseBusiness size={size} strokeWidth={2.4} />;
  if (icon === "handshake") return <Handshake size={size} strokeWidth={2.4} />;
  if (icon === "investor") return <Sparkles size={size} strokeWidth={2.4} />;
  if (icon === "wrench") return <Wrench size={size} strokeWidth={2.4} />;
  if (icon === "megaphone") return <Megaphone size={size} strokeWidth={2.4} />;
  if (icon === "other") return <Inbox size={size} strokeWidth={2.4} />;
  return <Target size={size} strokeWidth={2.4} />;
}

function isHotPost(post: NetworkPost) {
  const haystack = normalizeText([post.urgency, post.title, post.description].filter(Boolean).join(" "));
  return haystack.includes("acil") || haystack.includes("sıcak") || haystack.includes("sicak") || haystack.includes("hazır") || haystack.includes("hazir");
}

function buildPresetMessage(post: NetworkPost) {
  return `Merhaba,\n\n"${post.title}" konusuyla ilgileniyorum.\n\nDetayları görüşebilir miyiz?`;
}

function getRoleCategories(role?: string | null) {
  const normalized = normalizeRole(role);
  const values = ROLE_CATEGORY_MAP[normalized] || ROLE_CATEGORY_MAP.EMLAKCI;

  return values
    .map((value) => ALL_CATEGORY_OPTIONS.find((item) => item.value === value))
    .filter(Boolean) as ForumCategoryOption[];
}

function isCategoryLocationRequired(category?: ForumCategory | "") {
  return !["DUYURU", "KAMPANYA_DUYURU", "PLATFORM_DUYURUSU", "SISTEM_GUNCELLEMESI", "EGITIM_BILGILENDIRME"].includes(String(category));
}

function isPropertyRequired(category?: ForumCategory | "") {
  return ["PORTFOY_ARIYORUM", "KAT_KARSILIGI_ARSA_ARIYORUM"].includes(String(category));
}

function getOneLineDescription(post: NetworkPost) {
  const detail = String(post.description || "").trim();

  if (detail) return detail;

  const location = [post.city, post.district].filter(Boolean).join(" / ");
  const budget = post.budget ? formatMoney(post.budget, budgetCurrencyFromPost(post)) : "";

  return [location, budget].filter(Boolean).join(" · ") || "Detay için konuyu açın.";
}

export default function NetworkPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [flowFilter, setFlowFilter] = useState("Tüm Talepler");
  const [search, setSearch] = useState("");
  const lastUnreadRef = useRef(0);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/network/posts");
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationStats = async () => {
    if (!user?.id) return;

    try {
      const res = await api.get(`/conversations?userId=${user.id}`);
      const conversations: Conversation[] = Array.isArray(res.data) ? res.data : [];
      const unreadTotal = conversations.reduce((total, item) => total + (item.unreadCount || 0), 0);

      lastUnreadRef.current = unreadTotal;
      setConversationCount(conversations.length);
      setUnreadCount(unreadTotal);
    } catch {
      setConversationCount(0);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    fetchConversationStats();
    const interval = setInterval(fetchConversationStats, 7000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const roleCategories = useMemo(() => getRoleCategories(user?.role), [user?.role]);

  const filteredPosts = useMemo(() => {
    const keyword = normalizeText(search);

    return posts
      .filter((post) => postMatchesFlowFilter(post, flowFilter))
      .filter((post) => {
        if (!keyword) return true;

        const userName = getUserName(getPostUser(post));
        const haystack = normalizeText(
          [post.title, post.description, post.type, post.city, post.district, post.neighborhood, userName, ...(post.tags || [])]
            .filter(Boolean)
            .join(" "),
        );

        return haystack.includes(keyword);
      })
      .sort((a, b) => {
        if (isHotPost(a) !== isHotPost(b)) return isHotPost(a) ? -1 : 1;
        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      });
  }, [flowFilter, posts, search]);

  const quickCounts = useMemo(() => {
    const hot = posts.filter(isHotPost).length;
    const recent = posts.filter((post) => {
      if (!post.createdAt) return false;
      return Date.now() - new Date(post.createdAt).getTime() < 24 * 60 * 60 * 1000;
    }).length;

    return {
      hot,
      trend: Math.max(0, Math.min(posts.length, recent || hot || posts.length)),
      messages: conversationCount,
      unread: unreadCount,
    };
  }, [conversationCount, posts, unreadCount]);

  const handleCreateTopic = async (form: CreateTopicForm) => {
    if (!user?.id) {
      alert("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      router.push("/giris");
      return;
    }

    const selectedCategory = ALL_CATEGORY_OPTIONS.find((item) => item.value === form.category);

    if (!selectedCategory) {
      alert("Lütfen talep kategorisini seçin.");
      return;
    }

    if (form.detail.trim().length > MAX_FORUM_DESCRIPTION_LENGTH) {
      alert(`Açıklama en fazla ${MAX_FORUM_DESCRIPTION_LENGTH} karakter olabilir.`);
      return;
    }

    const tags = [selectedCategory.label, form.propertyType, form.urgency, form.city, form.district, form.budget ? `Döviz:${form.currency}` : ""].filter(Boolean).slice(0, 8);

    try {
      setCreating(true);

      await api.post("/network/posts", {
        userId: user.id,
        type: selectedCategory.value,
        title: form.title.trim(),
        description: form.detail.trim(),
        city: form.city.trim() || null,
        district: form.district.trim() || null,
        neighborhood: null,
        budget: form.budget ? Number(form.budget.replace(/\D/g, "")) : null,
        urgency: form.urgency,
        visibility: form.visibility,
        tags,
        expiresAt: expiresAtFromValidFor(form.validFor),
      });

      await fetchPosts();
      setModalOpen(false);
    } catch (error: any) {
      alert(error?.response?.data?.message || "Konu oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const startConversation = async (post: NetworkPost) => {
    if (!user?.id) {
      alert("Lütfen tekrar giriş yapın.");
      router.push("/giris");
      return;
    }

    const owner = getPostUser(post);
    const participantId = post.userId || owner?.id;

    if (!participantId) {
      alert("Konu sahibi bulunamadı.");
      return;
    }

    if (participantId === user.id) {
      alert("Bu konu sana ait.");
      return;
    }

    try {
      const res = await api.post("/conversations/start", {
        creatorId: user.id,
        participantId,
        postId: post.id,
        title: "İLGİLENİYORUM",
      });

      const searchParams = new URLSearchParams({
        title: "İLGİLENİYORUM",
        draft: buildPresetMessage(post),
      });

      router.push(`/messages/${res.data.id}?${searchParams.toString()}`);
    } catch {
      alert("Görüşme başlatılamadı.");
    }
  };

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-[#EAF1FA] px-3 pb-24 pt-2 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] space-y-3">
        <section className="rounded-[26px] border border-white/80 bg-gradient-to-b from-[#F9FBFF] to-[#EAF1FA] px-3 py-2.5 text-center shadow-[0_18px_44px_rgba(15,23,42,0.09)]">
          <h1 className="text-center text-[27px] font-black leading-none tracking-[-0.05em] text-[#06194A]">
            Talep Merkezi
          </h1>
          <p className="mx-auto mt-1 max-w-[320px] text-center text-[12px] font-extrabold leading-5 text-[#475569]">
            Elinizdekini değil, ihtiyacınızı paylaşın.
          </p>
        </section>

        <section className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {REQUEST_TABS.map((tab) => {
            const active = flowFilter === tab.key;
            const tone = toneClasses(tab.tone);

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFlowFilter(tab.key)}
                className={`relative min-h-[72px] w-[86px] shrink-0 rounded-[18px] border bg-gradient-to-b p-1.5 text-center shadow-[0_12px_26px_rgba(15,23,42,0.07)] transition active:scale-[0.98] ${tone.tile} ${active ? tone.active : ""}`}
              >
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-[14px] bg-white/70">
                  <RequestTabIcon icon={tab.icon} size={17} />
                </span>
                <span className="mt-1 block min-h-[18px] whitespace-nowrap text-center text-[9px] font-black leading-[10px] text-[#06194A]">
                  {tab.shortLabel}
                </span>
                <span className={`mx-auto mt-0.5 inline-flex min-h-[18px] min-w-[28px] items-center justify-center rounded-full px-1.5 text-center text-[9.5px] font-black ${tone.pill}`}>
                  {tabCount(posts, tab.key)}
                </span>
                {active && <span className={`absolute -bottom-1 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full ${tone.accent}`} />}
              </button>
            );
          })}
        </section>

        <section className="rounded-[24px] border border-white/80 bg-white/92 p-2.5 shadow-[0_16px_38px_rgba(15,23,42,0.09)] backdrop-blur-xl">
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div className="flex h-11 items-center gap-2 rounded-[18px] bg-[#F2F6FC] px-3">
              <Search size={17} className="shrink-0 text-[#64748B]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-left text-[13px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
                placeholder="Talep başlığı, şehir, ilçe..."
              />
            </div>
            <button type="button" className="flex h-11 min-w-[74px] items-center justify-center gap-1.5 rounded-[18px] border border-[#DDE7F3] bg-white px-3 text-[12px] font-black text-[#1557D6]" aria-label="Filtre">
              Filtrele
              <SlidersHorizontal size={15} />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-4 rounded-[24px] border border-white/80 bg-white/92 p-2.5 shadow-[0_14px_32px_rgba(15,23,42,0.075)]">
          <MiniMetric label="Toplam" value={posts.length} tone="blue" />
          <MiniMetric label="Kat K." value={tabCount(posts, "Kat Karşılığı Arsa Arıyorum")} tone="green" />
          <MiniMetric label="Sektörel" value={tabCount(posts, "Sektörel İhtiyaçlar")} tone="orange" />
          <MiniMetric label="Duyuru" value={tabCount(posts, "Duyuru")} tone="purple" />
        </section>

        {flowFilter === "Kat Karşılığı Arsa Arıyorum" && (
          <section className="rounded-[26px] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-3 text-center shadow-[0_16px_38px_rgba(16,185,129,0.12)]">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Kat Karşılığı Merkezi</p>
            <h2 className="mt-1 text-center text-[20px] font-black tracking-[-0.04em] text-[#06194A]">Yüksek değerli arsa talepleri</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <CenterStat label="Aktif Arsa" value={tabCount(posts, "Kat Karşılığı Arsa Arıyorum")} />
              <CenterStat label="Müteahhit" value={posts.filter((post) => normalizeText(categoryLabel(post.type)).includes("müteahhit")).length} />
              <CenterStat label="Yatırımcı" value={posts.filter((post) => normalizeText(categoryLabel(post.type)).includes("yatırım")).length} />
            </div>
          </section>
        )}

        <section className="rounded-[26px] border border-white/80 bg-white/92 shadow-[0_18px_44px_rgba(15,23,42,0.09)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 border-b border-[#E3ECF6] px-3 py-2.5">
            <div className="min-w-0 flex-1 text-center">
              <h2 className="truncate text-center text-[18px] font-black tracking-[-0.04em] text-[#06194A]">
                {flowFilter}
              </h2>
              <p className="text-center text-[10px] font-bold text-[#64748B]">{filteredPosts.length} talep gösteriliyor</p>
            </div>
            <button type="button" onClick={() => setModalOpen(true)} className="inline-flex min-h-[36px] items-center justify-center rounded-[16px] bg-[#1557D6] px-3 text-[11px] font-black text-white shadow-[0_10px_22px_rgba(21,87,214,0.22)]">
              Yeni Talep
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={28} />
                <p className="mt-3 text-center text-[12px] font-black text-[#64748B]">Talep merkezi yükleniyor...</p>
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <EmptyForumState onCreate={() => setModalOpen(true)} />
          ) : (
            <div className="space-y-2 p-2.5">
              {filteredPosts.map((post) => (
                <RequestCenterCard key={post.id} post={post} onOpen={() => router.push(`/network/${post.id}`)} />
              ))}
            </div>
          )}
        </section>
      </div>


      {modalOpen && <CreateTopicModal creating={creating} userRole={user?.role} categories={roleCategories} onClose={() => setModalOpen(false)} onCreate={handleCreateTopic} />}
    </main>
  );
}
function MiniMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  const classes = toneClasses(tone);

  return (
    <div className="min-h-[54px] border-r border-[#E3ECF6] px-1.5 text-center last:border-r-0">
      <p className="text-center text-[9px] font-black uppercase tracking-[0.08em] text-[#64748B]">{label}</p>
      <p className={`mx-auto mt-1 inline-flex min-h-[25px] min-w-[34px] items-center justify-center rounded-full px-2 text-center text-[15px] font-black ${classes.pill}`}>{value}</p>
    </div>
  );
}

function CenterStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-emerald-100 bg-white/78 px-2 py-2 text-center">
      <p className="text-center text-[16px] font-black leading-none text-emerald-700">{value}</p>
      <p className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.06em] text-[#64748B]">{label}</p>
    </div>
  );
}

function RequestCenterCard({ post, onOpen }: { post: NetworkPost; onOpen: () => void }) {
  const family = categoryFamily(post.type);
  const tab = REQUEST_TABS.find((item) => item.key === family) || REQUEST_TABS[0];
  const tone = toneClasses(tab.tone);
  const location = [post.city, post.district].filter(Boolean).join(" / ") || "Konum yok";
  const budget = post.budget ? formatMoney(post.budget, budgetCurrencyFromPost(post)) : "Bütçe yok";
  const hot = isHotPost(post);

  return (
    <article className="relative min-h-[100px] overflow-hidden rounded-[20px] border border-white bg-gradient-to-br from-white to-[#F6FAFF] p-2 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
      <span className={`absolute left-0 top-0 h-full w-1 ${tone.accent}`} />

      <div className="grid h-full grid-cols-[1fr_74px] items-center gap-2 pl-1.5">
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br ${tone.tile}`}>
              <RequestTabIcon icon={tab.icon} size={16} />
            </span>
            <p className={`line-clamp-1 text-left text-[9px] font-black uppercase tracking-[0.09em] ${tab.tone === "green" ? "text-emerald-700" : tab.tone === "orange" ? "text-orange-600" : tab.tone === "purple" ? "text-violet-700" : tab.tone === "violet" ? "text-purple-700" : "text-[#1557D6]"}`}>
              {categoryLabel(post.type)} {hot ? "• Acil" : ""}
            </p>
          </div>

          <h3 className="mt-1 line-clamp-1 text-left text-[15px] font-black leading-5 tracking-[-0.03em] text-[#06194A]">
            {post.title}
          </h3>

          <div className="mt-1 grid gap-0.5 text-left text-[10.5px] font-extrabold leading-4 text-[#64748B]">
            <p className="line-clamp-1 text-left"><MapPin size={11} className="mr-1 inline-block align-[-1px]" />{location}</p>
            <p className="line-clamp-1 text-left"><span className="font-black text-[#1557D6]">{budget}</span> <span className="text-[#94A3B8]">•</span> <span className="font-black text-[#16A34A]">{remainingTime(post.expiresAt)}</span></p>
          </div>
        </div>

        <button type="button" onClick={onOpen} className={`inline-flex min-h-[34px] w-full items-center justify-center rounded-[14px] border px-2 text-[11px] font-black ${tone.button}`}>
          İncele
        </button>
      </div>
    </article>
  );
}

function CreateTopicModal({ creating, userRole, categories, onClose, onCreate }: { creating: boolean; userRole?: string | null; categories: ForumCategoryOption[]; onClose: () => void; onCreate: (form: CreateTopicForm) => void }) {
  const [form, setForm] = useState<CreateTopicForm>(DEFAULT_FORM);
  const selectedCategory = categories.find((item) => item.value === form.category) || null;
  const needsLocation = isCategoryLocationRequired(form.category);
  const needsProperty = isPropertyRequired(form.category);
  const districtOptions = useMemo(() => getDistrictOptions(form.city), [form.city]);
  const remainingDescription = MAX_FORUM_DESCRIPTION_LENGTH - form.detail.length;

  const updateCity = (city: string) => {
    setForm((current) => ({
      ...current,
      city,
      district: "",
    }));
  };

  const errors = useMemo(() => {
    const items: string[] = [];

    if (!form.category) items.push("Kategori seçimi zorunlu.");
    if (!form.title.trim()) items.push("Talep başlığı zorunlu.");
    if (form.title.length > MAX_FORUM_TITLE_LENGTH) items.push(`Talep başlığı en fazla ${MAX_FORUM_TITLE_LENGTH} karakter olabilir.`);
    if (needsLocation && !form.city.trim()) items.push("Şehir seçimi zorunlu.");
    if (needsLocation && !form.district.trim()) items.push("İlçe seçimi zorunlu.");
    if (needsProperty && !form.propertyType.trim()) items.push("Konu alanı zorunlu.");
    if (form.propertyType.length > MAX_FORUM_TOPIC_LENGTH) items.push(`Konu en fazla ${MAX_FORUM_TOPIC_LENGTH} karakter olabilir.`);
    if (!form.validFor) items.push("Süre seçimi zorunlu.");
    if (form.detail.trim().length < 12) items.push("Açıklama en az 12 karakter olmalı.");
    if (form.detail.length > MAX_FORUM_DESCRIPTION_LENGTH) items.push(`Açıklama en fazla ${MAX_FORUM_DESCRIPTION_LENGTH} karakter olabilir.`);

    return items;
  }, [form.category, form.city, form.detail, form.district, form.propertyType, form.title, form.validFor, needsLocation, needsProperty]);

  const canSubmit = errors.length === 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#06194A]/52 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[94dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[32px] border border-[#DDE7F3] bg-[#F7FBFF] shadow-[0_28px_80px_rgba(15,23,42,0.24)] sm:rounded-[32px]" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-[#DDE7F3] bg-white/95 px-5 py-4 text-center backdrop-blur-xl">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#F7FBFF] text-[#06194A]">
            <X size={19} />
          </button>

          <p className="mx-auto w-fit rounded-full bg-[#EFF6FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#1557D6]">Talep Merkezi</p>
          <h2 className="mx-auto mt-2 text-center text-[22px] font-black tracking-[-0.04em] text-[#06194A]">Talep Aç</h2>
          <p className="mx-auto mt-1 max-w-[340px] text-center text-[12px] font-bold leading-5 text-[#64748B]">{roleLabel(userRole)} rolüne uygun kategoriler gösteriliyor. Fotoğraf yok; talep net, kısa ve iş odaklı kalır.</p>
        </div>

        <div className="space-y-4 p-4">
          <section className="rounded-[26px] border border-[#DDE7F3] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.045)]">
            <ForumField label="Talep Kategorisi *">
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, category: category.value }))}
                    className={`min-h-[88px] rounded-[20px] border px-3 py-3 text-center transition ${form.category === category.value ? "border-[#1557D6] bg-[#EFF6FF] shadow-[0_10px_24px_rgba(21,87,214,0.12)]" : "border-[#DDE7F3] bg-white hover:bg-[#F7FBFF]"}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${categoryTone(category.value)}`}>{category.group}</span>
                      <p className="text-[13px] font-black leading-4 text-[#06194A]">{category.label}</p>
                      <p className="line-clamp-2 text-[10px] font-bold leading-4 text-[#64748B]">{category.hint}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ForumField>
          </section>

          <section className="rounded-[26px] border border-[#DDE7F3] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.045)]">
            <div className="grid gap-3">
              <ForumField label="Talep Başlığı *">
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="forum-input" placeholder="Talebinizi kısa bir başlıkla yazın" maxLength={MAX_FORUM_TITLE_LENGTH} />
              </ForumField>

              <div className="grid grid-cols-2 gap-2">
                <ForumField label={needsLocation ? "Şehir *" : "Şehir"}>
                  <select value={form.city} onChange={(event) => updateCity(event.target.value)} className="forum-input">
                    <option value="">Şehir seçin</option>
                    {CITY_OPTIONS.map((city) => <option key={city} value={city}>{city}</option>)}
                  </select>
                </ForumField>

                <ForumField label={needsLocation ? "İlçe *" : "İlçe"}>
                  <select value={form.district} onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))} className="forum-input" disabled={!form.city}>
                    <option value="">İlçe seçin</option>
                    {districtOptions.map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
                </ForumField>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ForumField label={needsProperty ? "Konu *" : "Konu"}>
                  <input value={form.propertyType} onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value }))} className="forum-input" placeholder="" maxLength={MAX_FORUM_TOPIC_LENGTH} />
                </ForumField>

                <ForumField label="Bütçe">
                  <div className="grid grid-cols-[1fr_82px] gap-2">
                    <input
                      value={form.budget}
                      onChange={(event) => setForm((current) => ({ ...current, budget: formatBudgetInput(event.target.value) }))}
                      className="forum-input text-center"
                      placeholder="Opsiyonel"
                      inputMode="numeric"
                    />
                    <select
                      value={form.currency}
                      onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                      className="forum-input text-center"
                      aria-label="Döviz kodu"
                    >
                      {CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency === "TRY" ? "TL" : currency}</option>)}
                    </select>
                  </div>
                </ForumField>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ForumField label="Öncelik">
                  <select value={form.urgency} onChange={(event) => setForm((current) => ({ ...current, urgency: event.target.value }))} className="forum-input">
                    {URGENCY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </ForumField>

                <ForumField label="Süre *">
                  <select value={form.validFor} onChange={(event) => setForm((current) => ({ ...current, validFor: event.target.value }))} className="forum-input">
                    {VALID_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </ForumField>
              </div>

              <ForumField label="Görünürlük">
                <select value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))} className="forum-input">
                  {VISIBILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </ForumField>

              <ForumField label="Talep Açıklaması *">
                <textarea
                  value={form.detail}
                  onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value.slice(0, MAX_FORUM_DESCRIPTION_LENGTH) }))}
                  rows={5}
                  className="forum-input min-h-[126px] py-3 leading-5"
                  placeholder={`${selectedCategory?.label || "Talep"}: İhtiyacınızı birkaç satırla net anlatın. Kartta sadece ilk satır görünecek; detayda tamamı okunacak.`}
                />
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-black text-[#94A3B8]">
                  <span>Kartta 1 satır görünür, detayda tamamı açılır.</span>
                  <span className={remainingDescription < 60 ? "text-rose-600" : "text-[#94A3B8]"}>{form.detail.length}/{MAX_FORUM_DESCRIPTION_LENGTH}</span>
                </div>
              </ForumField>
            </div>
          </section>

          {errors.length > 0 && (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-3 text-center text-[12px] font-black leading-5 text-amber-800">
              {errors[0]}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 grid grid-cols-[1fr_1fr] gap-2 border-t border-[#DDE7F3] bg-white/96 p-4 backdrop-blur-xl">
          <button type="button" onClick={onClose} className="h-12 rounded-[18px] border border-[#DDE7F3] bg-white text-[13px] font-black text-[#64748B]">Vazgeç</button>
          <button type="button" disabled={creating || !canSubmit} onClick={() => onCreate(form)} className="h-12 rounded-[18px] bg-[#1557D6] text-[13px] font-black text-white shadow-[0_12px_24px_rgba(21,87,214,0.22)] disabled:opacity-45">
            {creating ? "Açılıyor..." : "Talebi Aç"}
          </button>
        </div>

        <style jsx global>{`
          .forum-input {
            width: 100%;
            min-height: 48px;
            border-radius: 18px;
            border: 1px solid #dde7f3;
            background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
            padding: 0 13px;
            font-size: 12px;
            font-weight: 800;
            color: #06194a;
            outline: none;
          }

          .forum-input:disabled {
            background: #f1f5f9;
            color: #94a3b8;
          }

          .forum-input::placeholder {
            color: #94a3b8;
          }

          .forum-input:focus {
            border-color: #1557d6;
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(21, 87, 214, 0.08);
          }
        `}</style>
      </div>
    </div>
  );
}

function EmptyForumState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mx-2.5 rounded-[24px] border border-dashed border-[#C9D8EA] bg-white/85 px-4 py-8 text-center shadow-[0_12px_28px_rgba(15,23,42,0.055)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#1557D6]">
        <Target size={22} />
      </div>
      <h3 className="mt-3 text-center text-[18px] font-black tracking-[-0.03em] text-[#06194A]">
        Bu sekmede talep yok
      </h3>
      <p className="mx-auto mt-1 max-w-[260px] text-center text-[12px] font-bold leading-5 text-[#64748B]">
        İlk talebi siz açın; kategori, şehir ve süre bilgisiyle Talep Merkezi dolmaya başlasın.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#1557D6] px-5 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(21,87,214,0.20)]"
      >
        Yeni Talep Aç
      </button>
    </div>
  );
}

function ForumField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-center">
      <span className="mb-1.5 block text-center text-[10px] font-black uppercase tracking-[0.1em] text-[#64748B]">{label}</span>
      {children}
    </label>
  );
}
