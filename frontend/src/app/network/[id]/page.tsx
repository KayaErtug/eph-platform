"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
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
  Share2,
  Sparkles,
  Tag,
  UserRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import {
  playKontorHarcamaSound,
  registerKontorSoundUnlock,
} from "@/lib/kontorFeedback";
import { useAuthStore } from "@/store/auth.store";

type NetworkUser = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  email?: string | null;
};

type ForumActionType = "MESSAGE" | "INTEREST" | "HELP";

type KontorSuccessToastState = {
  title: string;
  message: string;
  spent: number;
  balance: number | null;
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
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .trim();
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
  if (
    raw.includes("MUTEAHHIT") ||
    raw.includes("MUTEAHIT") ||
    raw.includes("MUTAAHHIT")
  )
    return "MÜTEAHHİT";
  if (raw.includes("EMLAK")) return "EMLAKÇI";

  return "EMLAKÇI";
}

function getPostUser(post?: NetworkPost | null) {
  return post?.user || post?.User || null;
}

function getUserName(user?: NetworkUser | null) {
  const full = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return full || user?.email?.split("@")[0] || "EPH Üyesi";
}

function categoryFamily(value?: string | null) {
  const text = normalizeText(value);

  if (text.includes("portföy") || text.includes("portfoy"))
    return "Portföy Arıyorum";
  if (text.includes("kat") || text.includes("arsa"))
    return "Kat Karşılığı Arsa Arıyorum";
  if (text.includes("satış") || text.includes("satis") || text.includes("ofis"))
    return "Bölgesel Satış Ofisi Arıyorum";
  if (
    text.includes("iş ortağı") ||
    text.includes("is ortagi") ||
    text.includes("ortak")
  )
    return "İş Ortağı Arıyorum";
  if (text.includes("yatırım") || text.includes("yatirim"))
    return "Yatırımcı Arıyorum";
  if (
    text.includes("sektör") ||
    text.includes("sektor") ||
    text.includes("ihtiyaç") ||
    text.includes("ihtiyac")
  )
    return "Sektörel İhtiyaçlar";
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

  if (family === "Kat Karşılığı Arsa Arıyorum")
    return "border-orange-200 bg-orange-50 text-orange-600";
  if (family === "Portföy Arıyorum")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (family === "Bölgesel Satış Ofisi Arıyorum")
    return "border-violet-200 bg-violet-50 text-violet-700";
  if (family === "İş Ortağı Arıyorum")
    return "border-blue-200 bg-blue-50 text-blue-700";
  if (family === "Yatırımcı Arıyorum")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (family === "Sektörel İhtiyaçlar")
    return "border-purple-200 bg-purple-50 text-purple-700";
  if (family === "Duyuru") return "border-red-200 bg-red-50 text-red-600";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatMoney(value?: string | number | null, currency = "TRY") {
  if (value == null || value === "") return "Belirtilmemiş";

  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/\D/g, ""));

  if (!numeric) return "Belirtilmemiş";

  return `${numeric.toLocaleString("tr-TR")} ${currency === "TRY" ? "TL" : currency}`;
}

function budgetCurrencyFromPost(post: NetworkPost) {
  const tag = (post.tags || []).find((item) =>
    String(item || "").startsWith("Döviz:"),
  );
  const currency = String(tag || "")
    .replace("Döviz:", "")
    .trim();

  return currency || "TRY";
}

function getRequestIntentFromPost(post: NetworkPost) {
  const tag = (post.tags || []).find((item) =>
    String(item || "").startsWith("Talep Türü:"),
  );
  const value = String(tag || "")
    .replace("Talep Türü:", "")
    .trim();

  if (value) return value;

  const text = normalizeText(
    [post.title, post.description, ...(post.tags || [])].join(" "),
  );

  if (text.includes("kiralık") || text.includes("kiralik"))
    return "Kiralık Arıyorum";
  if (text.includes("satılık") || text.includes("satilik"))
    return "Satılık Arıyorum";

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


function getNumericValue(data: any, keys: string[]) {
  for (const key of keys) {
    const value = data?.[key];

    if (Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function getBalanceFromResponse(data: any) {
  return getNumericValue(data, [
    "remainingBalance",
    "balance",
    "bakiye",
    "kalanBakiye",
    "sonrakiBakiye",
  ]);
}

function getSpentFromResponse(data: any, fallback: number) {
  return (
    getNumericValue(data, ["spent", "cost", "miktar", "harcananKontor"]) ??
    fallback
  );
}


function criteriaFromPost(post: NetworkPost) {
  const text = normalizeText(
    [post.title, post.description, ...(post.tags || [])].join(" "),
  );
  const items: string[] = [];

  if (text.includes("villa")) items.push("Villa arsası");
  if (text.includes("arsa")) items.push("Arsa uygun");
  if (post.city || post.district)
    items.push(`${[post.city, post.district].filter(Boolean).join(" / ")}`);
  if (post.budget)
    items.push(`${formatMoney(post.budget, budgetCurrencyFromPost(post))}`);
  if (text.includes("tap")) items.push("Tapu uygun");
  if (text.includes("acil") || text.includes("hafta"))
    items.push("Hızlı dönüş");

  return items.length
    ? items.slice(0, 4)
    : ["Konum uygunluğu", "Hızlı iletişim", "Portföy netliği"];
}

export default function NetworkPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const postId = String(params?.id || "");
  const [post, setPost] = useState<NetworkPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAction, setSelectedAction] =
    useState<ForumActionType | null>(null);
  const [saved, setSaved] = useState(false);
  const [successToast, setSuccessToast] =
    useState<KontorSuccessToastState | null>(null);

  const owner = useMemo(() => getPostUser(post), [post]);
  const category = useMemo(() => categoryLabel(post?.type), [post?.type]);
  const image = useMemo(() => getCategoryImage(post?.type), [post?.type]);
  const location = useMemo(
    () =>
      [post?.city, post?.district, post?.neighborhood]
        .filter(Boolean)
        .join(" / "),
    [post],
  );
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

  useEffect(() => {
    return registerKontorSoundUnlock();
  }, []);
  useEffect(() => {
    if (!successToast) return;

    const timer = window.setTimeout(() => {
      setSuccessToast(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [successToast]);

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

  const openForumAction = (action: ForumActionType) => {
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
      alert("Kendi Forum paylaşımınız için bu işlemi yapamazsınız.");
      return;
    }

    setSelectedAction(action);
  };

  const confirmForumAction = async () => {
    const action = selectedAction;

    if (!post || !action || actionLoading) return;

    const endpoint =
      action === "MESSAGE"
        ? "message"
        : action === "INTEREST"
          ? "interest"
          : "help";

    const payload =
      action === "MESSAGE"
        ? {
            message: `Merhaba, "${post.title}" başlıklı Forum paylaşımınız hakkında görüşmek istiyorum.`,
          }
        : {
            note:
              action === "INTEREST"
                ? `"${post.title}" başlıklı paylaşımınızla ilgileniyorum.`
                : `"${post.title}" başlıklı paylaşımınız için yardımcı olabilirim.`,
          };

    const fallbackSpent = action === "MESSAGE" ? 3 : 10;

    try {
      setActionLoading(true);

      const response = await api.post(
        `/network/posts/${post.id}/${endpoint}`,
        payload,
      );

      const spent = getSpentFromResponse(response.data, fallbackSpent);
      const remainingBalance = getBalanceFromResponse(response.data);

      const actionLabel =
        action === "MESSAGE"
          ? "Mesaj Başlatıldı"
          : action === "INTEREST"
            ? "İlgileniyorum Bildirildi"
            : "Yardımcı Olabilirim Bildirildi";

      void playKontorHarcamaSound();

      setSuccessToast({
        title: actionLabel,
        message:
          remainingBalance === null
            ? `${spent} kontör harcandı.`
            : `${spent} kontör harcandı. Kalan bakiyen ${remainingBalance} kontör.`,
        spent,
        balance: remainingBalance,
      });

      setSelectedAction(null);

      if (action === "MESSAGE") {
        const conversationId =
          response.data?.conversationId ||
          response.data?.conversation?.id;

        window.setTimeout(() => {
          router.push(
            conversationId
              ? `/messages/${conversationId}`
              : "/messages",
          );
        }, 2200);
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
          "Forum işlemi tamamlanamadı.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-[#FFF1D6] px-3 pb-20 text-[#3A2208]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#EA580C]" size={32} />
          <p className="mt-3 text-center text-[13px] font-black text-[#7C5A36]">
            Talep detayı yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-[#FFF1D6] px-3 pb-20 text-[#3A2208]">
        <div className="mx-auto max-w-[320px] rounded-[28px] border border-white bg-white p-5 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <Bookmark className="mx-auto text-[#EA580C]" size={34} />
          <h1 className="mt-3 text-center text-[22px] font-black">
            Talep bulunamadı
          </h1>
          <button
            type="button"
            onClick={() => router.push("/network")}
            className="mt-4 h-11 rounded-[22px] bg-[#EA580C] px-5 text-[13px] font-black text-white"
          >
            Foruma Dön
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-[calc(100dvh-64px)] bg-[#FFF1D6] px-2 pt-2 text-[#3A2208]"
      style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
    >
      {successToast && <KontorSuccessToast toast={successToast} />}

      <div className="mx-auto w-full max-w-[430px] space-y-1.5">
        <section className="rounded-[22px] border border-white bg-white/95 p-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.07)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/network")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-[#FED7AA] bg-[#FFF9F0] text-[#3A2208]"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-left text-[19px] font-black tracking-[-0.04em] text-[#3A2208]">
                Forum Talep Detayı
              </h1>
              <p className="truncate text-left text-[10px] font-bold text-[#7C5A36]">
                {location || "Konum belirtilmedi"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] border ${
                saved
                  ? "border-[#EA580C] bg-[#FFF1E8] text-[#EA580C]"
                  : "border-[#FED7AA] bg-white text-[#3A2208]"
              }`}
              aria-label="Talebi kaydet"
            >
              <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
            </button>

            <button
              type="button"
              onClick={() => openForumAction("MESSAGE")}
              disabled={actionLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] border border-[#FED7AA] bg-white text-[#3A2208] disabled:opacity-60"
              aria-label="Görüşme başlat"
            >
              {actionLoading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <MessageCircle size={17} />
              )}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-white bg-white shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-[112px_1fr] gap-0">
            <div className="relative min-h-[138px] bg-[#FFEDD5]">
              <Image
                src={image}
                alt={category}
                fill
                sizes="112px"
                className="object-cover"
                priority
              />
              {(post.urgency === "Acil" ||
                normalizeText(post.title).includes("acil")) && (
                <span className="absolute left-2 top-2 rounded-[9px] bg-red-500 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                  Acil
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center p-2.5">
              <span
                className={`mb-1.5 inline-flex w-fit max-w-full rounded-full border px-2 py-0.5 text-[8.5px] font-black uppercase leading-3 ${categoryBadgeClass(post.type)}`}
              >
                <span className="truncate">{category}</span>
              </span>

              <h2 className="line-clamp-2 text-left text-[18px] font-black leading-[21px] tracking-[-0.05em] text-[#3A2208]">
                {post.title}
              </h2>

              <p className="mt-1 flex items-center gap-1 text-left text-[10.5px] font-bold leading-4 text-[#7C5A36]">
                <MapPin size={12} className="shrink-0 text-[#F97316]" />
                <span className="line-clamp-1">
                  {location || "Konum belirtilmedi"}
                </span>
              </p>

              <p className="mt-0.5 text-left text-[9.5px] font-black text-[#7C5A36]">
                No: #{post.id.slice(0, 8).toUpperCase()}
              </p>

              <div className="mt-2 grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className={`flex h-9 items-center justify-center gap-1 rounded-[14px] border px-1 text-[9.5px] font-black ${
                    saved
                      ? "border-[#EA580C] bg-[#FFF1E8] text-[#EA580C]"
                      : "border-[#FED7AA] bg-white text-[#3A2208]"
                  }`}
                >
                  <Bookmark size={13} />
                  Kaydet
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-9 items-center justify-center gap-1 rounded-[14px] border border-[#FED7AA] bg-white px-1 text-[9.5px] font-black text-[#3A2208]"
                >
                  <Share2 size={13} />
                  Paylaş
                </button>

                <button
                  type="button"
                  onClick={() => openForumAction("INTEREST")}
                  disabled={actionLoading}
                  className="flex h-9 items-center justify-center gap-1 rounded-[14px] bg-[#EA580C] px-1 text-[9.5px] font-black text-white shadow-[0_8px_16px_rgba(234,88,12,0.24)] disabled:opacity-70"
                >
                  {actionLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <HeartHandshake size={13} />
                  )}
                  İlgilen
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-[#FDE1BF] p-2">
            <div className="rounded-[18px] border border-[#FED7AA] bg-[#FFF9F0] p-2.5">
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
          <InfoCard
            icon={<UserRound size={14} />}
            label="Sahip"
            value={getUserName(owner)}
            badge={normalizeRole(owner?.role)}
          />
          <InfoCard
            icon={<Building2 size={14} />}
            label="Bütçe"
            value={formatMoney(post.budget, budgetCurrencyFromPost(post))}
          />
          <InfoCard
            icon={<Clock3 size={14} />}
            label="Süre"
            value={remainingTime(post.expiresAt)}
          />
        </section>

        <section className="grid grid-cols-4 gap-1.5">
          <InfoCard
            icon={<Clock3 size={14} />}
            label="Aciliyet"
            value={post.urgency || "Normal"}
            danger={post.urgency === "Acil"}
          />
          <InfoCard
            icon={<CalendarDays size={14} />}
            label="Tarih"
            value={formatDateTime(post.createdAt)}
          />
          <InfoCard
            icon={<Eye size={14} />}
            label="Görünürlük"
            value={visibilityLabel(post.visibility)}
          />
          <InfoCard
            icon={<FileText size={14} />}
            label="İçerik"
            value={getRequestIntentFromPost(post)}
          />
        </section>

        <section className="rounded-[20px] border border-white bg-white px-2.5 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#FFF1E8] text-[#EA580C]">
              <CheckCircle2 size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-left text-[12.5px] font-black text-[#3A2208]">
                Aranan Kriterler
              </h3>
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

        <section className="grid grid-cols-1 gap-1.5">
          <div className="rounded-[20px] border border-white bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <h3 className="text-center text-[12.5px] font-black text-[#3A2208]">
              Forum İşlemleri
            </h3>

            <p className="mt-1 text-center text-[9.5px] font-bold text-[#7C5A36]">
              Okuma, paylaşım ve takip ücretsizdir.
            </p>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => openForumAction("MESSAGE")}
                disabled={actionLoading}
                className="flex min-h-11 items-center justify-center gap-1 rounded-[16px] bg-[#EA580C] px-2 text-[11px] font-black text-white disabled:opacity-60"
              >
                <MessageCircle size={14} />
                Mesaj 3K
              </button>

              <button
                type="button"
                onClick={() => openForumAction("INTEREST")}
                disabled={actionLoading}
                className="flex min-h-11 items-center justify-center gap-1 rounded-[16px] border-2 border-[#2563EB] bg-[#FFF1E8] px-2 text-[11px] font-black text-[#1D4ED8] disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                İlgilen 10K
              </button>

              <button
                type="button"
                onClick={() => openForumAction("HELP")}
                disabled={actionLoading}
                className="flex min-h-11 items-center justify-center gap-1 rounded-[16px] bg-emerald-600 px-2 text-[11px] font-black text-white disabled:opacity-60"
              >
                <HeartHandshake size={15} />
                Yardımcı Ol 10K
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={actionLoading}
                className={`flex min-h-11 items-center justify-center gap-1 rounded-[16px] border px-2 text-[11px] font-black disabled:opacity-60 ${
                  saved
                    ? "border-[#EA580C] bg-[#FFF1E8] text-[#EA580C]"
                    : "border-[#FED7AA] bg-[#FFF9F0] text-[#3A2208]"
                }`}
              >
                <Bookmark
                  size={14}
                  fill={saved ? "currentColor" : "none"}
                />
                {saved ? "Kaydedildi" : "Kaydet"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {selectedAction && post && (
        <ForumActionModal
          action={selectedAction}
          post={post}
          busy={actionLoading}
          onClose={() => setSelectedAction(null)}
          onConfirm={confirmForumAction}
        />
      )}

      <button
        type="button"
        onClick={() => router.push("/lina")}
        className="fixed right-4 z-30 flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-[0_14px_28px_rgba(79,70,229,0.30)]"
        style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
      >
        <Sparkles size={20} fill="white" />
        <span className="mt-0.5 text-[10px] font-black">Lina</span>
      </button>
    </main>
  );
}


function KontorSuccessToast({
  toast,
}: {
  toast: KontorSuccessToastState;
}) {
  return (
    <div role="status" aria-live="assertive" aria-atomic="true" className="fixed left-1/2 top-[78px] z-[90] w-[calc(100%-24px)] max-w-[410px] -translate-x-1/2">
      <section className="relative overflow-hidden rounded-[22px] border-2 border-[#35FF8A] bg-[#021B18] p-3 text-center text-white shadow-[0_0_0_1px_rgba(53,255,138,0.25),0_0_26px_rgba(53,255,138,0.52),0_18px_44px_rgba(15,23,42,0.32)]">
        <div className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-[#35FF8A]/25 blur-2xl" />
        <div className="pointer-events-none absolute -right-8 -bottom-14 h-32 w-32 rounded-full bg-[#00E5FF]/18 blur-2xl" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#35FF8A] to-transparent" />

        <div className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#8DFFB5] bg-[#052E26] text-[#8DFFB5] shadow-[0_0_20px_rgba(53,255,138,0.72)]">
          <CheckCircle2 size={22} />
        </div>

        <p className="relative mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8DFFB5] drop-shadow-[0_0_8px_rgba(53,255,138,0.85)]">
          İşlem Başarılı
        </p>

        <h3 className="relative mt-0.5 text-[15px] font-black tracking-[-0.02em] text-white">
          {toast.title}
        </h3>

        <p className="relative mt-1 break-words text-[12px] font-black leading-5 text-[#D9FFE8] [overflow-wrap:anywhere]">
          {toast.message}
        </p>
      </section>
    </div>
  );
}

function ForumActionModal({
  action,
  post,
  busy,
  onClose,
  onConfirm,
}: {
  action: ForumActionType;
  post: NetworkPost;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const config = {
    MESSAGE: {
      title: "Forum Mesajı",
      cost: 3,
      confirmText: "3 Kontör Harca ve Mesaj Gönder",
    },
    INTEREST: {
      title: "İlgileniyorum Bildirimi",
      cost: 10,
      confirmText: "10 Kontör Harca ve İlgilen",
    },
    HELP: {
      title: "Yardımcı Olabilirim",
      cost: 10,
      confirmText: "10 Kontör Harca ve Bildir",
    },
  }[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-4">
      <section className="w-[min(94vw,430px)] overflow-hidden rounded-[24px] border-2 border-[#C7D6E8] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
        <div className="relative px-14 pb-3 pt-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
            Forum Kontör İşlemi
          </p>

          <h2 className="mt-1 text-[19px] font-black leading-tight text-[#1F2937]">
            {config.title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-[#C7D6E8] bg-[#F8FAFC] text-[#2563EB] disabled:opacity-60"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pb-3">
          <div className="rounded-[18px] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
              Paylaşım
            </p>

            <p className="mt-1 break-words text-[12px] font-black leading-5 text-[#1F2937]">
              {post.title}
            </p>
          </div>

          <div className="mt-2 rounded-[18px] border-2 border-[#C7D6E8] bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
              İşlem Özeti
            </p>

            <p className="mt-1 text-[12px] font-bold leading-5 text-[#6F4E2B]">
              Bu işlem {config.cost} kontör harcar. Onaydan sonra paylaşım
              sahibine bildirim gönderilir ve işlem cüzdan hareketlerine
              kaydedilir.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-[#D7E3F2] p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-12 rounded-[16px] border-2 border-[#C7D6E8] bg-white px-2 text-[12px] font-black text-[#2563EB] disabled:opacity-60"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="min-h-12 rounded-[16px] bg-[#2563EB] px-2 text-[11px] font-black leading-4 text-white disabled:opacity-60"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-1">
                <Loader2 size={14} className="animate-spin" />
                İşleniyor
              </span>
            ) : (
              config.confirmText
            )}
          </button>
        </div>
      </section>
    </div>
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
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[12px] ${danger ? "bg-red-50 text-red-600" : "bg-[#FFF1E8] text-[#EA580C]"}`}
        >
          {icon}
        </div>

        <p className="mt-1 text-center text-[8.5px] font-black leading-3 text-[#7C5A36]">
          {label}
        </p>
        <p
          className={`mt-0.5 line-clamp-1 text-center text-[10px] font-black leading-3 ${danger ? "text-red-600" : "text-[#3A2208]"}`}
        >
          {value}
        </p>
        {badge && (
          <span className="mt-0.5 inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7.5px] font-black text-emerald-700">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
