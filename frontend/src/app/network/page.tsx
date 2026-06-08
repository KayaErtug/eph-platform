"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  Clock3,
  Flame,
  Handshake,
  Inbox,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Target,
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
  | "BOLGE_ORTAGI_ARIYORUM"
  | "PORTFOY_ORTAGI_ARIYORUM"
  | "SATIS_OFISI_ARIYORUM"
  | "KAMPANYA_DUYURULARI"
  | "KAT_KARSILIGI_ARSA_ARIYORUM"
  | "MUTEAHHIT_YUKLENICI_ARIYORUM"
  | "ULUSAL_BOLGESEL_SATIS_PARTNERI_ARIYORUM"
  | "YATIRIMCI_ARIYORUM"
  | "PLATFORM_DUYURUSU"
  | "SISTEM_GUNCELLEMESI"
  | "EGITIM_BILGILENDIRME"
  | "SEKTOREL_SORU"
  | "DIGER";

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
  detail: string;
  urgency: string;
  validFor: string;
  visibility: string;
};

const ALL_CATEGORY_OPTIONS: ForumCategoryOption[] = [
  { value: "PORTFOY_ARIYORUM", label: "Portföy Arıyorum", hint: "Hazır müşteriniz veya talebiniz için uygun portföy arayın.", group: "Talep" },
  { value: "BOLGE_ORTAGI_ARIYORUM", label: "Bölge Ortağı Arıyorum", hint: "Belirli şehir/ilçede aktif çalışan bölge ortağı bulun.", group: "Ortaklık" },
  { value: "PORTFOY_ORTAGI_ARIYORUM", label: "Portföy Ortağı Arıyorum", hint: "Yetkili portföy sahibi veya paylaşım ortağı arayın.", group: "Ortaklık" },
  { value: "SATIS_OFISI_ARIYORUM", label: "Satış Ofisi Arıyorum", hint: "Proje ya da portföy satışını yönetecek ofis arayın.", group: "Ortaklık" },
  { value: "KAMPANYA_DUYURULARI", label: "Kampanya Duyuruları", hint: "Kampanya, lansman veya dönemsel bilgilendirme paylaşın.", group: "Duyuru" },
  { value: "KAT_KARSILIGI_ARSA_ARIYORUM", label: "Kat Karşılığı Arsa Arıyorum", hint: "Kat karşılığı değerlendirilecek arsa talebi açın.", group: "Talep" },
  { value: "MUTEAHHIT_YUKLENICI_ARIYORUM", label: "Müteahhit / Yüklenici Arıyorum", hint: "Uygulama, yapım veya geliştirme ortağı arayın.", group: "Ortaklık" },
  { value: "ULUSAL_BOLGESEL_SATIS_PARTNERI_ARIYORUM", label: "Ulusal/Bölgesel Satış Partneri Arıyorum", hint: "Proje veya portföy için satış partneri ağı kurun.", group: "Ortaklık" },
  { value: "YATIRIMCI_ARIYORUM", label: "Yatırımcı Arıyorum", hint: "Finansman, yatırım veya proje ortağı arayın.", group: "Talep" },
  { value: "PLATFORM_DUYURUSU", label: "Platform Duyurusu", hint: "EPH yönetim duyurusu yayınlayın.", group: "Duyuru" },
  { value: "SISTEM_GUNCELLEMESI", label: "Sistem Güncellemesi", hint: "Sistem değişiklikleri ve bakım bilgisi paylaşın.", group: "Duyuru" },
  { value: "EGITIM_BILGILENDIRME", label: "Eğitim / Bilgilendirme", hint: "Eğitim, kullanım ve bilgilendirme konusu açın.", group: "Duyuru" },
  { value: "SEKTOREL_SORU", label: "Sektörel Soru", hint: "Tapu, imar, ifraz, değerleme veya süreç sorusu sorun.", group: "Soru" },
  { value: "DIGER", label: "Diğer", hint: "Listede olmayan profesyonel ihtiyacınızı paylaşın.", group: "Diğer" },
];

const ROLE_CATEGORY_MAP: Record<string, ForumCategory[]> = {
  EMLAKCI: ["PORTFOY_ARIYORUM", "BOLGE_ORTAGI_ARIYORUM", "PORTFOY_ORTAGI_ARIYORUM", "SEKTOREL_SORU", "DIGER"],
  MUTEAHHIT: ["SATIS_OFISI_ARIYORUM", "KAMPANYA_DUYURULARI", "KAT_KARSILIGI_ARSA_ARIYORUM", "SEKTOREL_SORU", "DIGER"],
  INSAAT_FIRMASI: ["KAT_KARSILIGI_ARSA_ARIYORUM", "MUTEAHHIT_YUKLENICI_ARIYORUM", "ULUSAL_BOLGESEL_SATIS_PARTNERI_ARIYORUM", "KAMPANYA_DUYURULARI", "YATIRIMCI_ARIYORUM", "SEKTOREL_SORU", "DIGER"],
  ADMIN: ["PLATFORM_DUYURUSU", "SISTEM_GUNCELLEMESI", "EGITIM_BILGILENDIRME", "SEKTOREL_SORU"],
  SUPER_ADMIN: ["PLATFORM_DUYURUSU", "SISTEM_GUNCELLEMESI", "EGITIM_BILGILENDIRME", "SEKTOREL_SORU"],
};

const FLOW_FILTERS = ["Tümü", "Talep", "Ortaklık", "Duyuru", "Soru", "Diğer"];
const VALID_OPTIONS = ["3 gün", "7 gün", "15 gün", "30 gün"];
const URGENCY_OPTIONS = ["Normal", "Acil", "Müşteri Hazır", "Sıcak Talep"];
const VISIBILITY_OPTIONS = [
  { label: "Tüm EPH", value: "TUM_EPH" },
  { label: "Sadece emlakçılar", value: "SADECE_EMLAKCILAR" },
  { label: "Sadece müteahhitler / inşaat firmaları", value: "SADECE_MUTEAHHITLER" },
  { label: "Sadece bağlantılarım", value: "SADECE_BAGLANTILARIM" },
];

const MAX_FORUM_DESCRIPTION_LENGTH = 600;

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
  if (text.includes("bölge") || text.includes("bolge")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "BOLGE_ORTAGI_ARIYORUM")!;
  if (text.includes("satış ofisi") || text.includes("satis ofisi")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "SATIS_OFISI_ARIYORUM")!;
  if (text.includes("kampanya")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "KAMPANYA_DUYURULARI")!;
  if (text.includes("kat") || text.includes("arsa")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "KAT_KARSILIGI_ARSA_ARIYORUM")!;
  if (text.includes("yüklenici") || text.includes("yuklenici") || text.includes("müteahhit") || text.includes("muteahhit")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "MUTEAHHIT_YUKLENICI_ARIYORUM")!;
  if (text.includes("yatırım") || text.includes("yatirim")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "YATIRIMCI_ARIYORUM")!;
  if (text.includes("soru")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "SEKTOREL_SORU")!;
  if (text.includes("duyuru")) return ALL_CATEGORY_OPTIONS.find((item) => item.value === "PLATFORM_DUYURUSU")!;

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

function formatMoney(value?: string | number | null) {
  if (value == null || value === "") return "";

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));

  if (!numeric) return String(value);

  return `${numeric.toLocaleString("tr-TR")} TL`;
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

function postMatchesFlowFilter(post: NetworkPost, filter: string) {
  if (filter === "Tümü") return true;
  return categoryGroup(post.type) === filter;
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
  return category !== "PLATFORM_DUYURUSU" && category !== "SISTEM_GUNCELLEMESI" && category !== "EGITIM_BILGILENDIRME" && category !== "SEKTOREL_SORU";
}

function isPropertyRequired(category?: ForumCategory | "") {
  return ["PORTFOY_ARIYORUM", "PORTFOY_ORTAGI_ARIYORUM", "KAT_KARSILIGI_ARSA_ARIYORUM"].includes(String(category));
}

function getOneLineDescription(post: NetworkPost) {
  const detail = String(post.description || "").trim();

  if (detail) return detail;

  const location = [post.city, post.district].filter(Boolean).join(" / ");
  const budget = post.budget ? formatMoney(post.budget) : "";

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
  const [flowFilter, setFlowFilter] = useState("Tümü");
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

    const tags = [selectedCategory.label, form.propertyType, form.urgency, form.city, form.district].filter(Boolean).slice(0, 8);

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
    <main className="min-h-[calc(100dvh-64px)] bg-[#F7FBFF] px-3 pb-4 pt-2 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] space-y-2">
        <SloganStrip />

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="grid grid-cols-4 overflow-hidden rounded-[19px] border border-[#DDE7F3] bg-[#FBFDFF]">
            <QuickItem icon={<Flame size={17} />} label="Acil" value={quickCounts.hot} tone="orange" />
            <QuickItem icon={<Target size={17} />} label="Talep" value={posts.length} tone="blue" />
            <QuickItem icon={<MessageCircle size={17} />} label="Mesaj" value={quickCounts.messages} tone="purple" onClick={() => router.push("/messages")} />
            <QuickItem icon={<Bell size={17} />} label="Bildirim" value={quickCounts.unread} tone="yellow" onClick={() => router.push("/messages")} />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="grid grid-cols-[1fr_44px] gap-2">
            <div className="flex h-11 items-center gap-2 rounded-[17px] bg-[#F7FBFF] px-3">
              <Search size={17} className="shrink-0 text-[#94A3B8]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
                placeholder="Talep, kategori, şehir ara..."
              />
            </div>

            <button type="button" className="flex h-11 items-center justify-center rounded-[17px] border border-[#DDE7F3] bg-white text-[#06194A]" aria-label="Filtre">
              <Settings2 size={18} />
            </button>
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {FLOW_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setFlowFilter(filter)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-black ${flowFilter === filter ? "bg-[#6D4AFF] text-white" : "border border-[#DDE7F3] bg-white text-[#27364F]"}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-between border-b border-[#EAF0F7] px-3 py-2">
            <div>
              <h1 className="text-center text-[17px] font-black tracking-[-0.03em] text-[#06194A]">Forum Talepleri</h1>
              <p className="text-[10px] font-bold text-[#64748B]">{filteredPosts.length} talep gösteriliyor</p>
            </div>

            <button type="button" onClick={() => setModalOpen(true)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[16px] bg-[#1557D6] px-3 text-[12px] font-black text-white shadow-[0_10px_22px_rgba(21,87,214,0.22)]">
              <Plus size={17} />
              Talep Aç
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={28} />
                <p className="mt-3 text-[12px] font-black text-[#64748B]">Forum yükleniyor...</p>
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <EmptyForumState onCreate={() => setModalOpen(true)} />
          ) : (
            <div className="divide-y divide-[#EAF0F7]">
              {filteredPosts.map((post, index) => (
                <ForumTopicRow key={post.id} post={post} index={index} onOpen={() => router.push(`/network/${post.id}`)} onMessage={() => startConversation(post)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {modalOpen && <CreateTopicModal creating={creating} userRole={user?.role} categories={roleCategories} onClose={() => setModalOpen(false)} onCreate={handleCreateTopic} />}
    </main>
  );
}

function SloganStrip() {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[#DDE7F3] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-center gap-2 text-center text-[12px] font-black text-[#27364F]">
        <Sparkles size={15} className="shrink-0 text-[#6D4AFF]" />
        <span>Elinizdekini değil, ihtiyacınızı paylaşın.</span>
      </div>
    </section>
  );
}

function QuickItem({ icon, label, value, tone, onClick }: { icon: ReactNode; label: string; value: number; tone: "orange" | "blue" | "purple" | "yellow"; onClick?: () => void }) {
  const tones = {
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-[#EFF6FF] text-[#1557D6]",
    purple: "bg-violet-50 text-violet-700",
    yellow: "bg-amber-50 text-amber-700",
  };

  return (
    <button type="button" onClick={onClick} className="flex min-h-[54px] flex-col items-center justify-center gap-1 border-r border-[#DDE7F3] px-1 text-center last:border-r-0">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</span>
      <span className="text-[10px] font-black leading-none text-[#06194A]">
        {label}
        {value > 0 ? ` ${value}` : ""}
      </span>
    </button>
  );
}

function ForumTopicRow({ post, index, onOpen, onMessage }: { post: NetworkPost; index: number; onOpen: () => void; onMessage: () => void }) {
  const postUser = getPostUser(post);
  const userName = getUserName(postUser);
  const role = roleLabel(postUser?.role);
  const location = [post.city, post.district].filter(Boolean).join(" / ");
  const hot = isHotPost(post);
  const group = categoryGroup(post.type);
  const meta = [formatDateTime(post.createdAt), remainingTime(post.expiresAt)].filter(Boolean).join(" · ");
  const description = getOneLineDescription(post);

  return (
    <article className="grid min-h-[86px] grid-cols-[42px_1fr_66px] items-center gap-2 px-2.5 py-2.5">
      <button type="button" onClick={onOpen} className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[13px] font-black text-[#1557D6]">
        {userName.slice(0, 1).toLocaleUpperCase("tr-TR")}
        {hot && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />}
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${categoryTone(post.type)}`}>{categoryLabel(post.type)}</span>
          {hot && <span className="shrink-0 rounded-md bg-orange-50 px-1.5 py-0.5 text-[9px] font-black text-orange-700">ACİL</span>}
          <span className="truncate text-[10px] font-bold text-[#94A3B8]">{group}</span>
        </div>

        <h2 className="mt-1 line-clamp-1 text-[13px] font-black leading-4 tracking-[-0.01em] text-[#06194A]">{post.title}</h2>
        <p className="mt-0.5 line-clamp-1 text-[11px] font-bold leading-4 text-[#64748B]">{description}</p>
        <p className="mt-0.5 line-clamp-1 text-[10px] font-black leading-4 text-[#94A3B8]">{location ? `${location} · ` : ""}{meta}</p>
        <span className="sr-only">{index + 1}. konu, {role}</span>
      </button>

      <div className="flex items-center justify-end gap-1 text-[#27364F]">
        <button type="button" onClick={onMessage} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7FBFF]" aria-label="Mesaj gönder">
          <MessageCircle size={15} />
        </button>
        <button type="button" onClick={onOpen} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7FBFF]" aria-label="Detay">
          <MoreVertical size={15} />
        </button>
      </div>
    </article>
  );
}

function EmptyForumState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#1557D6]">
        <Inbox size={24} />
      </div>
      <h2 className="mt-3 text-[16px] font-black text-[#06194A]">Uygun talep bulunamadı</h2>
      <p className="mx-auto mt-1 max-w-[280px] text-[12px] font-bold leading-5 text-[#64748B]">Filtreyi değiştirin veya yeni bir ihtiyaç talebi açın.</p>
      <button type="button" onClick={onCreate} className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-[16px] bg-[#1557D6] px-4 text-[12px] font-black text-white">
        <Plus size={16} />
        Talep Aç
      </button>
    </div>
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
    if (needsLocation && !form.city.trim()) items.push("Şehir seçimi zorunlu.");
    if (needsLocation && !form.district.trim()) items.push("İlçe seçimi zorunlu.");
    if (needsProperty && !form.propertyType.trim()) items.push("Konu alanı zorunlu.");
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

          <p className="mx-auto w-fit rounded-full bg-[#EFF6FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#1557D6]">Forum Talep Merkezi</p>
          <h2 className="mx-auto mt-2 text-center text-[22px] font-black tracking-[-0.04em] text-[#06194A]">Rol Bazlı Talep Aç</h2>
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
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="forum-input" placeholder="Talebinizi kısa bir başlıkla yazın" maxLength={90} />
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
                  <input value={form.propertyType} onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value }))} className="forum-input" placeholder="" maxLength={70} />
                </ForumField>

                <ForumField label="Bütçe">
                  <input value={form.budget} onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))} className="forum-input" placeholder="Opsiyonel" inputMode="numeric" />
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
            min-height: 46px;
            border-radius: 18px;
            border: 1px solid #dde7f3;
            background: #f7fbff;
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

function ForumField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-center">
      <span className="mb-1.5 block text-center text-[10px] font-black uppercase tracking-[0.1em] text-[#64748B]">{label}</span>
      {children}
    </label>
  );
}
