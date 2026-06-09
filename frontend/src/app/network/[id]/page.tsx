"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  HeartHandshake,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Sparkles,
  Tag,
  ThumbsDown,
  ThumbsUp,
  UserRound,
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

const CATEGORY_IMAGES: Record<string, string> = {
  "Tüm Talepler": "/talep-merkezi/tum-talepler.jpg",
  "Portföy Arıyorum": "/talep-merkezi/portfoy-ariyorum.jpg",
  "Kat Karşılığı Arsa Arıyorum": "/talep-merkezi/kat-karsiligi-arsa.jpg",
  "Bölgesel Satış Ofisi Arıyorum": "/talep-merkezi/bolgesel-satis-ofisi.jpg",
  "İş Ortağı Arıyorum": "/talep-merkezi/is-ortagi.jpg",
  "Yatırımcı Arıyorum": "/talep-merkezi/yatirimci.jpg",
  "Sektörel İhtiyaçlar": "/talep-merkezi/sektorel-ihtiyaclar.jpg",
  Duyuru: "/talep-merkezi/duyuru.jpg",
  Diğer: "/talep-merkezi/diger.jpg",
};

function normalizeText(value?: string | null) {
  return String(value || "").toLocaleLowerCase("tr-TR").trim();
}

function normalizeRole(role?: string | null) {
  const raw = String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim()
    .replaceAll("İ", "I")
    .replaceAll("Ü", "U")
    .replaceAll("Ğ", "G")
    .replaceAll("Ş", "S")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C")
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (raw.includes("SUPER")) return "SUPER_ADMIN";
  if (raw.includes("ADMIN")) return "ADMIN";
  if (raw.includes("INSAAT")) return "İNŞAAT FİRMASI";
  if (raw.includes("MUTEAHHIT") || raw.includes("MUTEAHIT") || raw.includes("MUTAAHHIT")) return "MÜTEAHHİT";
  if (raw.includes("EMLAK")) return "EMLAKÇI";

  return "EMLAKÇI";
}

function getPostUser(post?: NetworkPost | null) {
  return post?.user || post?.User || null;
}

function getUserName(user?: NetworkUser | null) {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  return full || user?.email?.split("@")[0] || "EPH Üyesi";
}

function categoryFamily(value?: string | null) {
  const text = normalizeText(value);

  if (text.includes("portföy") || text.includes("portfoy")) return "Portföy Arıyorum";
  if (text.includes("kat") || text.includes("arsa")) return "Kat Karşılığı Arsa Arıyorum";
  if (text.includes("satış") || text.includes("satis") || text.includes("ofis")) return "Bölgesel Satış Ofisi Arıyorum";
  if (text.includes("iş ortağı") || text.includes("is ortagi") || text.includes("ortak")) return "İş Ortağı Arıyorum";
  if (text.includes("yatırım") || text.includes("yatirim")) return "Yatırımcı Arıyorum";
  if (text.includes("sektör") || text.includes("sektor") || text.includes("ihtiyaç") || text.includes("ihtiyac")) return "Sektörel İhtiyaçlar";
  if (text.includes("duyuru") || text.includes("kampanya")) return "Duyuru";

  return "Diğer";
}

function categoryLabel(value?: string | null) {
  return categoryFamily(value);
}

function getCategoryImage(value?: string | null) {
  const family = categoryFamily(value);

  return CATEGORY_IMAGES[family] || CATEGORY_IMAGES["Tüm Talepler"];
}

function categoryBadgeClass(value?: string | null) {
  const family = categoryFamily(value);

  if (family === "Kat Karşılığı Arsa Arıyorum") return "border-orange-200 bg-orange-50 text-orange-600";
  if (family === "Portföy Arıyorum") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (family === "Bölgesel Satış Ofisi Arıyorum") return "border-violet-200 bg-violet-50 text-violet-700";
  if (family === "İş Ortağı Arıyorum") return "border-blue-200 bg-blue-50 text-blue-700";
  if (family === "Yatırımcı Arıyorum") return "border-amber-200 bg-amber-50 text-amber-700";
  if (family === "Sektörel İhtiyaçlar") return "border-purple-200 bg-purple-50 text-purple-700";
  if (family === "Duyuru") return "border-red-200 bg-red-50 text-red-600";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatMoney(value?: string | number | null, currency = "TRY") {
  if (value == null || value === "") return "Belirtilmemiş";

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));

  if (!numeric) return "Belirtilmemiş";

  return `${numeric.toLocaleString("tr-TR")} ${currency === "TRY" ? "TL" : currency}`;
}

function budgetCurrencyFromPost(post: NetworkPost) {
  const tag = (post.tags || []).find((item) => String(item || "").startsWith("Döviz:"));
  const currency = String(tag || "").replace("Döviz:", "").trim();

  return currency || "TRY";
}

function getRequestIntentFromPost(post: NetworkPost) {
  const tag = (post.tags || []).find((item) => String(item || "").startsWith("Talep Türü:"));
  const value = String(tag || "").replace("Talep Türü:", "").trim();

  if (value) return value;

  const text = normalizeText([post.title, post.description, ...(post.tags || [])].join(" "));

  if (text.includes("kiralık") || text.includes("kiralik")) return "Kiralık Arıyorum";
  if (text.includes("satılık") || text.includes("satilik")) return "Satılık Arıyorum";

  return "Arıyorum";
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

function visibilityLabel(value?: string | null) {
  if (value === "SADECE_EMLAKCILAR") return "Sadece emlakçılar";
  if (value === "SADECE_MUTEAHHITLER") return "Müteahhit / İnşaat";
  if (value === "SADECE_BAGLANTILARIM") return "Bağlantılarım";

  return "Tüm EPH";
}

function buildPresetMessage(post: NetworkPost) {
  return `Merhaba,\n\n"${post.title}" talebiyle ilgileniyorum.\n\nDetayları görüşebilir miyiz?`;
}

function criteriaFromPost(post: NetworkPost) {
  const text = normalizeText([post.title, post.description, ...(post.tags || [])].join(" "));
  const items: string[] = [];

  if (text.includes("villa")) items.push("Villa arsası");
  if (text.includes("arsa")) items.push("Arsa uygun");
  if (post.city || post.district) items.push(`${[post.city, post.district].filter(Boolean).join(" / ")}`);
  if (post.budget) items.push(`${formatMoney(post.budget, budgetCurrencyFromPost(post))}`);
  if (text.includes("tap")) items.push("Tapu uygun");
  if (text.includes("acil") || text.includes("hafta")) items.push("Hızlı dönüş");

  return items.length ? items.slice(0, 4) : ["Konum uygunluğu", "Hızlı iletişim", "Portföy netliği"];
}

export default function NetworkPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const postId = String(params?.id || "");
  const [post, setPost] = useState<NetworkPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [interestLoading, setInterestLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const owner = useMemo(() => getPostUser(post), [post]);
  const category = useMemo(() => categoryLabel(post?.type), [post?.type]);
  const image = useMemo(() => getCategoryImage(post?.type), [post?.type]);
  const location = useMemo(() => [post?.city, post?.district, post?.neighborhood].filter(Boolean).join(" / "), [post]);
  const criteria = useMemo(() => (post ? criteriaFromPost(post) : []), [post]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;

      try {
        setLoading(true);
        const res = await api.get(`/network/posts/${postId}`);
        setPost(res.data || null);
      } catch {
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;

    setSaved(localStorage.getItem(`eph-saved-network-${postId}`) === "1");
  }, [postId]);

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    localStorage.setItem(`eph-saved-network-${postId}`, next ? "1" : "0");
  };

  const handleShare = async () => {
    if (!post) return;

    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.description || post.title,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      alert("Talep bağlantısı kopyalandı.");
    } catch {
      alert("Paylaşım tamamlanamadı.");
    }
  };

  const handleInterest = async () => {
    if (!post) return;

    if (!user?.id) {
      alert("Lütfen tekrar giriş yapın.");
      router.push("/giris");
      return;
    }

    const participantId = post.userId || owner?.id;

    if (!participantId) {
      alert("Talep sahibi bulunamadı.");
      return;
    }

    if (participantId === user.id) {
      alert("Bu talep size ait.");
      return;
    }

    try {
      setInterestLoading(true);

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
    } finally {
      setInterestLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-[#F4F8FF] px-3 pb-20 text-[#06194A]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={32} />
          <p className="mt-3 text-center text-[13px] font-black text-[#64748B]">Talep detayı yükleniyor...</p>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-[#F4F8FF] px-3 pb-20 text-[#06194A]">
        <div className="mx-auto max-w-[320px] rounded-[28px] border border-white bg-white p-5 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <Bell className="mx-auto text-[#1557D6]" size={34} />
          <h1 className="mt-3 text-center text-[22px] font-black">Talep bulunamadı</h1>
          <button
            type="button"
            onClick={() => router.push("/network")}
            className="mt-4 h-11 rounded-[22px] bg-[#1557D6] px-5 text-[13px] font-black text-white"
          >
            Pazaryerine Dön
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-[#F4F8FF] px-2 pb-[76px] pt-2 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] space-y-1.5">
        <section className="rounded-[22px] border border-white bg-white/95 p-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.07)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/network")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-[#DDE7F3] bg-[#F8FBFF] text-[#06194A]"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-left text-[19px] font-black tracking-[-0.04em] text-[#06194A]">Pazaryeri Detayı</h1>
              <p className="truncate text-left text-[10px] font-bold text-[#64748B]">{location || "Konum belirtilmedi"}</p>
            </div>

            <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] border border-[#DDE7F3] bg-white text-[#06194A]">
              <Bell size={17} />
            </button>

            <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] border border-[#DDE7F3] bg-white text-[#06194A]">
              <MessageCircle size={17} />
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-white bg-white shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-[112px_1fr] gap-0">
            <div className="relative min-h-[138px] bg-[#EEF5FF]">
              <Image src={image} alt={category} fill sizes="112px" className="object-cover" priority />
              {(post.urgency === "Acil" || normalizeText(post.title).includes("acil")) && (
                <span className="absolute left-2 top-2 rounded-[9px] bg-red-500 px-2 py-0.5 text-[9px] font-black uppercase text-white">Acil</span>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center p-2.5">
              <span className={`mb-1.5 inline-flex w-fit max-w-full rounded-full border px-2 py-0.5 text-[8.5px] font-black uppercase leading-3 ${categoryBadgeClass(post.type)}`}>
                <span className="truncate">{category}</span>
              </span>

              <h2 className="line-clamp-2 text-left text-[18px] font-black leading-[21px] tracking-[-0.05em] text-[#06194A]">{post.title}</h2>

              <p className="mt-1 flex items-center gap-1 text-left text-[10.5px] font-bold leading-4 text-[#64748B]">
                <MapPin size={12} className="shrink-0 text-[#6D5DFB]" />
                <span className="line-clamp-1">{location || "Konum belirtilmedi"}</span>
              </p>

              <p className="mt-0.5 text-left text-[9.5px] font-black text-[#64748B]">No: #{post.id.slice(0, 8).toUpperCase()}</p>

              <div className="mt-2 grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className={`flex h-9 items-center justify-center gap-1 rounded-[14px] border px-1 text-[9.5px] font-black ${
                    saved ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]" : "border-[#DDE7F3] bg-white text-[#06194A]"
                  }`}
                >
                  <Bookmark size={13} />
                  Kaydet
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-9 items-center justify-center gap-1 rounded-[14px] border border-[#DDE7F3] bg-white px-1 text-[9.5px] font-black text-[#06194A]"
                >
                  <Share2 size={13} />
                  Paylaş
                </button>

                <button
                  type="button"
                  onClick={handleInterest}
                  disabled={interestLoading}
                  className="flex h-9 items-center justify-center gap-1 rounded-[14px] bg-[#1557D6] px-1 text-[9.5px] font-black text-white shadow-[0_8px_16px_rgba(21,87,214,0.22)] disabled:opacity-70"
                >
                  {interestLoading ? <Loader2 size={13} className="animate-spin" /> : <HeartHandshake size={13} />}
                  İlgilen
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-[#E7EEF8] p-2">
            <div className="rounded-[18px] border border-[#DDE7F3] bg-[#F8FBFF] p-2.5">
              <div className="flex gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-white text-[20px] shadow-[0_6px_14px_rgba(15,23,42,0.07)]">
                  🎯
                </div>
                <p className="line-clamp-3 text-left text-[13px] font-extrabold leading-[18px] text-[#27364F]">
                  {post.description || "Talep açıklaması henüz girilmemiş."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-4 gap-1.5">
          <InfoCard icon={<Tag size={14} />} label="Tür" value={category} />
          <InfoCard icon={<UserRound size={14} />} label="Sahip" value={getUserName(owner)} badge={normalizeRole(owner?.role)} />
          <InfoCard icon={<Building2 size={14} />} label="Bütçe" value={formatMoney(post.budget, budgetCurrencyFromPost(post))} />
          <InfoCard icon={<Clock3 size={14} />} label="Süre" value={remainingTime(post.expiresAt)} />
        </section>

        <section className="grid grid-cols-4 gap-1.5">
          <InfoCard icon={<Bell size={14} />} label="Aciliyet" value={post.urgency || "Normal"} danger={post.urgency === "Acil"} />
          <InfoCard icon={<CalendarDays size={14} />} label="Tarih" value={formatDateTime(post.createdAt)} />
          <InfoCard icon={<Eye size={14} />} label="Görünürlük" value={visibilityLabel(post.visibility)} />
          <InfoCard icon={<FileText size={14} />} label="İçerik" value={getRequestIntentFromPost(post)} />
        </section>

        <section className="rounded-[20px] border border-white bg-white px-2.5 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#EFF6FF] text-[#1557D6]">
              <CheckCircle2 size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-left text-[12.5px] font-black text-[#06194A]">Aranan Kriterler</h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {criteria.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"
                  >
                    <CheckCircle2 size={11} />
                    <span className="max-w-[132px] truncate">{item}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-[1.1fr_0.9fr] gap-1.5">
          <div className="rounded-[20px] border border-white bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <h3 className="text-left text-[12.5px] font-black text-[#06194A]">İletişim</h3>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleInterest}
                disabled={interestLoading}
                className="flex h-10 items-center justify-center gap-1 rounded-[16px] bg-[#1557D6] px-2 text-[10px] font-black text-white disabled:opacity-70"
              >
                {interestLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                Mesaj
              </button>
              <button
                type="button"
                className="flex h-10 items-center justify-center gap-1 rounded-[16px] border border-emerald-100 bg-emerald-50 px-2 text-[10px] font-black text-emerald-700"
              >
                <Phone size={14} />
                Telefon
              </button>
            </div>
          </div>

          <div className="rounded-[20px] border border-white bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <h3 className="text-left text-[12.5px] font-black text-[#06194A]">Değerlendir</h3>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button type="button" className="flex h-10 flex-col items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                <ThumbsUp size={17} />
                <span className="text-[9px] font-black">Uygun</span>
              </button>
              <button type="button" className="flex h-10 flex-col items-center justify-center rounded-[16px] bg-red-50 text-red-600">
                <ThumbsDown size={17} />
                <span className="text-[9px] font-black">Değil</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => router.push("/lina")}
        className="fixed bottom-[76px] right-4 z-30 flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-[0_14px_28px_rgba(79,70,229,0.30)]"
      >
        <Sparkles size={20} fill="white" />
        <span className="mt-0.5 text-[10px] font-black">Lina</span>
      </button>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
  badge,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
  danger?: boolean;
}) {
  return (
    <div className="min-h-[58px] rounded-[18px] border border-white bg-white px-1.5 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.055)]">
      <div className="flex flex-col items-center justify-center text-center">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[12px] ${danger ? "bg-red-50 text-red-600" : "bg-[#EFF6FF] text-[#1557D6]"}`}>
          {icon}
        </div>

        <p className="mt-1 text-center text-[8.5px] font-black leading-3 text-[#64748B]">{label}</p>
        <p className={`mt-0.5 line-clamp-1 text-center text-[10px] font-black leading-3 ${danger ? "text-red-600" : "text-[#06194A]"}`}>{value}</p>
        {badge && <span className="mt-0.5 inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7.5px] font-black text-emerald-700">{badge}</span>}
      </div>
    </div>
  );
}