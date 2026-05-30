"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Sparkles,
  Tag,
  UsersRound,
  WalletCards,
} from "lucide-react";

import EphAppShell from "@/components/EphAppShell";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type NetworkUser = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
  role: string;
};

type NetworkPost = {
  id: string;
  userId: string;
  User?: NetworkUser;
  user?: NetworkUser;
  type: string;
  title: string;
  description?: string;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  urgency?: string | null;
  visibility?: string;
  tags: string[];
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type EditPostForm = {
  type: string;
  title: string;
  description: string;
  city: string;
  district: string;
  neighborhood: string;
  budget: string;
  urgency: string;
  visibility: string;
  tags: string;
  validFor: string;
};

type NetworkPostUpdateLog = {
  id: string;
  summary: string;
  changes: {
    field: string;
    label: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};

type NetworkPostStats = {
  postId: string;
  postTitle: string;
  total: number;
  byTitle: {
    title: string;
    count: number;
  }[];
  latest: {
    id: string;
    title: string;
    updatedAt: string;
    participants: string[];
    lastMessage?: {
      id: string;
      body: string;
      createdAt: string;
      sender: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
      };
    } | null;
  }[];
};

type RoleTheme = {
  primary: string;
  secondary: string;
  soft: string;
  border: string;
  text: string;
  gradient: string;
  label: string;
  emoji: string;
};

type MarketplaceActionSet = {
  primary: string;
  secondary: string;
  tertiary: string;
  note: string;
};

function getRoleGroup(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  ) {
    return "construction";
  }

  if (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT"
  ) {
    return "contractor";
  }

  if (normalizedRole === "ADMIN" || normalizedRole === "DENETCI_ADMIN") {
    return "admin";
  }

  return "realtor";
}

function getMarketplaceActions(
  viewerRole?: string | null,
  ownerRole?: string | null,
): MarketplaceActionSet {
  const viewer = getRoleGroup(viewerRole);
  const owner = getRoleGroup(ownerRole);

  if (viewer === "realtor" && owner === "contractor") {
    return {
      primary: "Mesaj Gönder",
      secondary: "Uygun Müşterim Var",
      tertiary: "Talebe Çözüm Sun",
      note: "Bu müteahhit talebi için hazır müşterin veya çözümün varsa görüşme başlatabilirsin.",
    };
  }

  if (viewer === "realtor" && owner === "construction") {
    return {
      primary: "Mesaj Gönder",
      secondary: "Satış Ağına Katıl",
      tertiary: "Müşteri Havuzu Sun",
      note: "Bu inşaat firmasıyla proje satışı veya müşteri yönlendirme için bağlantı kurabilirsin.",
    };
  }

  if ((viewer === "contractor" || viewer === "construction") && owner === "realtor") {
    return {
      primary: "Mesaj Gönder",
      secondary: "Proje Teklif Et",
      tertiary: "İş Birliği Kur",
      note: "Bu emlakçıyla proje, portföy veya satış ortaklığı için görüşme başlatabilirsin.",
    };
  }

  if (viewer === "contractor" && owner === "construction") {
    return {
      primary: "Mesaj Gönder",
      secondary: "Proje İş Birliği",
      tertiary: "Kurumsal Görüşme Talep Et",
      note: "İnşaat firmasıyla proje, satış veya çözüm ortaklığı için profesyonel görüşme başlatabilirsin.",
    };
  }

  if (viewer === "construction" && owner === "contractor") {
    return {
      primary: "Mesaj Gönder",
      secondary: "Proje Görüşmesi Başlat",
      tertiary: "Çözüm Ortaklığı Kur",
      note: "Bu müteahhitle proje, saha veya çözüm ortaklığı için görüşme başlatabilirsin.",
    };
  }

  if (viewer === owner && owner === "realtor") {
    return {
      primary: "Mesaj Gönder",
      secondary: "Portföy Paylaş",
      tertiary: "Müşteri Eşleştir",
      note: "Meslektaşınla portföy veya müşteri eşleştirmesi için iletişime geçebilirsin.",
    };
  }

  if (viewer === owner && owner === "contractor") {
    return {
      primary: "Mesaj Gönder",
      secondary: "Proje Karşılaştır",
      tertiary: "Ortak Çalışma",
      note: "Müteahhitler arası proje, ekip veya saha iş birliği için görüşme başlatabilirsin.",
    };
  }

  if (viewer === owner && owner === "construction") {
    return {
      primary: "Mesaj Gönder",
      secondary: "Proje Ortaklığı",
      tertiary: "Kurumsal Görüşme",
      note: "İnşaat firmaları arası kurumsal iş birliği için bağlantı kurabilirsin.",
    };
  }

  return {
    primary: "Mesaj Gönder",
    secondary: "Çözüm Sun",
    tertiary: "İş Birliği Teklif Et",
    note: "Bu paylaşım için profesyonel bir görüşme başlatabilirsin.",
  };
}


function createPresetMessage(actionTitle: string, postTitle?: string) {
  if (actionTitle === "Uygun Müşterim Var") {
    return `Merhaba,

"${postTitle || "paylaşımınız"}" için uygun müşterilerim bulunuyor.

Detayları paylaşabilirim.`;
  }

  if (actionTitle === "Talebe Çözüm Sun") {
    return `Merhaba,

"${postTitle || "paylaşımınız"}" için uygun bir çözümüm olduğunu düşünüyorum.

Detayları görüşebiliriz.`;
  }

  if (actionTitle === "Proje Teklif Et") {
    return `Merhaba,

Portföyünüze uygun olabileceğini düşündüğüm bir projem bulunuyor.

Görüşebilir miyiz?`;
  }

  if (actionTitle === "İş Birliği Kur") {
    return `Merhaba,

Bu paylaşımınız için iş birliği fırsatlarını değerlendirmek isterim.

Uygun olduğunuzda görüşebilir miyiz?`;
  }

  if (actionTitle === "Proje İş Birliği") {
    return `Merhaba,

Bu proje için iş birliği fırsatlarını değerlendirmek isterim.

Uygun olduğunuzda görüşebilir miyiz?`;
  }

  if (actionTitle === "Kurumsal Görüşme Talep Et") {
    return `Merhaba,

Bu paylaşımınız hakkında kurumsal bir görüşme yapmak isterim.

Uygun olduğunuzda detayları paylaşabilir misiniz?`;
  }

  if (actionTitle === "Satış Ağına Katıl") {
    return `Merhaba,

Projenizin satış ağına katılmak ve müşteri yönlendirmek isterim.

Detayları görüşebilir miyiz?`;
  }

  if (actionTitle === "Müşteri Havuzu Sun") {
    return `Merhaba,

Bu proje için uygun müşteri havuzum olduğunu düşünüyorum.

Detayları paylaşabilirim.`;
  }

  if (actionTitle === "Proje Görüşmesi Başlat") {
    return `Merhaba,

Bu paylaşımınızla ilgili proje görüşmesi başlatmak isterim.

Uygun olduğunuzda görüşebilir miyiz?`;
  }

  if (actionTitle === "Çözüm Ortaklığı Kur") {
    return `Merhaba,

Bu paylaşımınız için çözüm ortaklığı fırsatlarını değerlendirmek isterim.

Detayları görüşebiliriz.`;
  }

  if (actionTitle === "Portföy Paylaş") {
    return `Merhaba,

Bu paylaşımınızla ilgili portföy paylaşımı yapmak isterim.

Detayları görüşebilir miyiz?`;
  }

  if (actionTitle === "Müşteri Eşleştir") {
    return `Merhaba,

Bu paylaşımınız için uygun müşteri eşleştirmesi yapabileceğimi düşünüyorum.

Detayları paylaşabilirim.`;
  }

  if (actionTitle === "Proje Karşılaştır") {
    return `Merhaba,

Bu paylaşımınızla ilgili proje karşılaştırması yapmak isterim.

Detayları görüşebilir miyiz?`;
  }

  if (actionTitle === "Ortak Çalışma") {
    return `Merhaba,

Bu paylaşımınız için ortak çalışma fırsatlarını değerlendirmek isterim.

Uygun olduğunuzda görüşebilir miyiz?`;
  }

  if (actionTitle === "Proje Ortaklığı") {
    return `Merhaba,

Bu paylaşımınız için proje ortaklığı fırsatlarını değerlendirmek isterim.

Detayları görüşebiliriz.`;
  }

  if (actionTitle === "Kurumsal Görüşme") {
    return `Merhaba,

Bu paylaşımınız hakkında kurumsal bir görüşme yapmak isterim.

Uygun olduğunuzda görüşebilir miyiz?`;
  }

  if (actionTitle === "Çözüm Sun") {
    return `Merhaba,

Bu paylaşımınız için uygun bir çözüm sunabileceğimi düşünüyorum.

Detayları paylaşabilirim.`;
  }

  if (actionTitle === "İş Birliği Teklif Et") {
    return `Merhaba,

Bu paylaşımınız için iş birliği teklif etmek isterim.

Detayları görüşebilir miyiz?`;
  }

  return `Merhaba,

Bu paylaşımınız hakkında görüşmek isterim.

Uygun olduğunuzda detayları paylaşabilir misiniz?`;
}

function normalizeActionTitle(actionTitle: string) {
  return actionTitle.toLocaleUpperCase("tr-TR");
}

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function getRoleTheme(role?: string | null): RoleTheme {
  const normalizedRole = normalizeRole(role);

  if (
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  ) {
    return {
      primary: "#C9A84C",
      secondary: "#0B1F44",
      soft: "#FFFBEB",
      border: "#FDE68A",
      text: "#0B1F44",
      gradient: "from-[#0B1F44] via-[#172554] to-[#C9A84C]",
      label: "İnşaat Firması",
      emoji: "🏢",
    };
  }

  if (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT"
  ) {
    return {
      primary: "#EA580C",
      secondary: "#FDBA74",
      soft: "#FFF7ED",
      border: "#FED7AA",
      text: "#9A3412",
      gradient: "from-orange-700 via-orange-600 to-amber-500",
      label: "Müteahhit",
      emoji: "🏗️",
    };
  }

  if (normalizedRole === "ADMIN" || normalizedRole === "DENETCI_ADMIN") {
    return {
      primary: "#0F172A",
      secondary: "#38BDF8",
      soft: "#F8FAFC",
      border: "#CBD5E1",
      text: "#0F172A",
      gradient: "from-slate-950 via-slate-900 to-blue-950",
      label: "EPH Admin",
      emoji: "🛡️",
    };
  }

  return {
    primary: "#2563EB",
    secondary: "#4F46E5",
    soft: "#EFF6FF",
    border: "#BFDBFE",
    text: "#1D4ED8",
    gradient: "from-[#2563EB] via-[#4F46E5] to-[#7C3AED]",
    label: "Emlakçı",
    emoji: "🏠",
  };
}

function getPostUser(post?: NetworkPost | null) {
  return post?.User || post?.user;
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  return (
    date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }) +
    " · " +
    date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

function formatMoney(value?: string | number | null) {
  if (value == null || value === "") return "Belirtilmedi";

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));

  if (!numeric) return String(value);

  return `${numeric.toLocaleString("tr-TR")} TL`;
}

function relativeTime(value?: string) {
  if (!value) return "-";

  const diff = Date.now() - new Date(value).getTime();
  const minute = Math.floor(diff / 60000);
  const hour = Math.floor(minute / 60);
  const day = Math.floor(hour / 24);

  if (minute < 1) return "Az önce";
  if (minute < 60) return `${minute} dk önce`;
  if (hour < 24) return `${hour} saat önce`;

  return `${day} gün önce`;
}


const shareTypes = [
  "Talep",
  "Portföy",
  "Ortak Satış",
  "Arsa",
  "Müteahhit Projesi",
  "Yatırımcı Arıyor",
];

const validOptions = ["1 gün", "3 gün", "7 gün", "30 gün"];
const urgencyOptions = ["Normal", "Sıcak Talep", "Acil", "Hazır Müşteri"];

const visibilityOptions = [
  { label: "Tüm EPH", value: "TUM_EPH" },
  { label: "Sadece emlakçılar", value: "SADECE_EMLAKCILAR" },
  {
    label: "Sadece müteahhitler / inşaat firmaları",
    value: "SADECE_MUTEAHHITLER",
  },
  { label: "Sadece bağlantılarım", value: "SADECE_BAGLANTILARIM" },
];

function expiresAtFromValidFor(value: string) {
  const date = new Date();

  if (value === "1 gün") date.setDate(date.getDate() + 1);
  else if (value === "3 gün") date.setDate(date.getDate() + 3);
  else if (value === "7 gün") date.setDate(date.getDate() + 7);
  else date.setDate(date.getDate() + 30);

  return date.toISOString();
}

export default function NetworkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();

  const id = String(params?.id || "");

  const [post, setPost] = useState<NetworkPost | null>(null);
  const [stats, setStats] = useState<NetworkPostStats | null>(null);
  const [updateLogs, setUpdateLogs] = useState<NetworkPostUpdateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingConversation, setStartingConversation] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const postUser = getPostUser(post);
  const theme = useMemo(() => getRoleTheme(postUser?.role), [postUser?.role]);
  const actions = useMemo(
    () => getMarketplaceActions(user?.role, postUser?.role),
    [user?.role, postUser?.role],
  );
  const isOwnPost = Boolean(user?.id && post?.userId === user.id);

  useEffect(() => {
    if (!id) return;

    fetchPost();
    fetchStats();
    fetchUpdateLogs();
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);

    try {
      const res = await api.get(`/network/posts/${id}`);
      setPost(res.data);
    } catch {
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!id) return;

    try {
      const res = await api.get(`/network/posts/${id}/stats`);
      setStats(res.data);
    } catch {
      setStats(null);
    }
  };

  const fetchUpdateLogs = async () => {
    if (!id) return;

    try {
      const res = await api.get(`/network/posts/${id}/update-logs`);
      setUpdateLogs(res.data || []);
    } catch {
      setUpdateLogs([]);
    }
  };

  const startConversation = async (actionTitle: string, presetMessage: string) => {
    if (!post) return;

    if (!user?.id) {
      alert("Lütfen tekrar giriş yapın.");
      router.push("/giris");
      return;
    }

    if (isOwnPost) {
      alert("Bu paylaşım sana ait.");
      return;
    }

    try {
      setStartingConversation(true);

      const res = await api.post("/conversations/start", {
        creatorId: user.id,
        participantId: post.userId,
        postId: post.id,
        title: normalizeActionTitle(actionTitle),
      });

      const search = new URLSearchParams({
        title: normalizeActionTitle(actionTitle),
        draft: presetMessage,
      });

      router.push(`/messages/${res.data.id}?${search.toString()}`);
    } catch {
      alert("Görüşme başlatılamadı.");
    } finally {
      setStartingConversation(false);
    }
  };

  const updatePost = async (form: EditPostForm) => {
    if (!post || !user?.id) return;

    try {
      setSavingEdit(true);

      const customTags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const locationTags = [
        form.city,
        form.district,
        form.neighborhood,
      ].filter(Boolean);

      await api.patch(`/network/posts/${post.id}`, {
        userId: user.id,
        type: form.type,
        title: form.title,
        description: form.description,
        city: form.city || null,
        district: form.district || null,
        neighborhood: form.neighborhood || null,
        budget: form.budget ? Number(form.budget.replace(/\D/g, "")) : null,
        urgency: form.urgency,
        visibility: form.visibility,
        tags: [...locationTags, ...customTags].slice(0, 8),
        expiresAt: expiresAtFromValidFor(form.validFor),
      });

      await fetchPost();
      await fetchStats();
      await fetchUpdateLogs();
      setEditOpen(false);
    } catch {
      alert("Paylaşım güncellenemedi.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <EphAppShell title="Pazaryeri Detayı">
        <div className="mx-auto max-w-4xl rounded-[32px] bg-white p-10 text-center text-sm font-black text-slate-500">
          Paylaşım yükleniyor...
        </div>
      </EphAppShell>
    );
  }

  if (!post) {
    return (
      <EphAppShell title="Pazaryeri Detayı">
        <div className="mx-auto max-w-4xl rounded-[32px] bg-white p-10 text-center">
          <h1 className="text-2xl font-black text-slate-900">
            Paylaşım bulunamadı
          </h1>

          <p className="mt-3 text-sm font-semibold text-slate-500">
            Bu paylaşım kaldırılmış veya süresi dolmuş olabilir.
          </p>

          <button
            onClick={() => router.push("/network")}
            className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
          >
            Pazaryerine Dön
          </button>
        </div>
      </EphAppShell>
    );
  }

  const authorName = postUser
    ? `${postUser.firstName} ${postUser.lastName}`
    : "EPH Üyesi";

  return (
    <EphAppShell title="Pazaryeri Detayı">
      <div className="mx-auto w-full max-w-6xl">
        <button
          onClick={() => router.push("/network")}
          className="mb-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm"
        >
          <ArrowLeft size={18} />
          Pazaryerine Dön
        </button>

        <section
          className={`overflow-hidden rounded-[38px] bg-gradient-to-br ${theme.gradient} text-white shadow-2xl`}
        >
          <div className="p-7 md:p-9">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[30px] bg-white/15 text-4xl backdrop-blur">
                {theme.emoji}
              </div>

              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white backdrop-blur">
                  <CheckCircle2 size={16} />
                  {theme.label}
                </div>

                <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
                  {post.title}
                </h1>

                <p className="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/80 md:text-base">
                  {post.description}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-4">
              <DetailHeroStat icon={<UsersRound size={20} />} label="Paylaşan" value={authorName} />
              <DetailHeroStat icon={<Tag size={20} />} label="Tip" value={post.type} />
              <DetailHeroStat icon={<WalletCards size={20} />} label="Bütçe" value={formatMoney(post.budget)} />
              <DetailHeroStat icon={<Clock size={20} />} label="Yayın" value={relativeTime(post.createdAt)} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
          <main className="space-y-5">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h2 className="text-2xl font-black text-slate-900">
                Paylaşım Detayları
              </h2>

              <p className="mx-auto mt-3 max-w-3xl whitespace-pre-line text-[15px] font-semibold leading-8 text-slate-600">
                {post.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailInfoCard
                icon={<MapPin size={22} />}
                label="Lokasyon"
                value={[
                  post.city,
                  post.district,
                  post.neighborhood,
                ]
                  .filter(Boolean)
                  .join(" / ") || "Belirtilmedi"}
                theme={theme}
              />

              <DetailInfoCard
                icon={<CalendarDays size={22} />}
                label="Geçerlilik"
                value={formatDateTime(post.expiresAt)}
                theme={theme}
              />

              <DetailInfoCard
                icon={<Sparkles size={22} />}
                label="Aciliyet"
                value={post.urgency || "Normal"}
                theme={theme}
              />

              <DetailInfoCard
                icon={<Building2 size={22} />}
                label="Görünürlük"
                value={post.visibility || "TUM_EPH"}
                theme={theme}
              />
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h2 className="text-2xl font-black text-slate-900">Etiketler</h2>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {post.tags.length > 0 ? (
                  post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-4 py-2 text-xs font-black"
                      style={{
                        backgroundColor: theme.soft,
                        color: theme.text,
                      }}
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-semibold text-slate-500">
                    Etiket eklenmemiş.
                  </span>
                )}
              </div>
            </div>
          </main>

          <aside className="space-y-5">
            <div
              className="rounded-[32px] border bg-white p-6 text-center shadow-sm"
              style={{ borderColor: theme.border }}
            >
              <div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-[30px] text-4xl"
                style={{
                  backgroundColor: theme.soft,
                  color: theme.primary,
                }}
              >
                {theme.emoji}
              </div>

              <h3 className="mt-4 text-xl font-black text-slate-900">
                {authorName}
              </h3>

              <p
                className="mx-auto mt-2 inline-flex rounded-full px-4 py-2 text-xs font-black"
                style={{
                  backgroundColor: theme.soft,
                  color: theme.text,
                }}
              >
                {theme.label}
              </p>

              <div
                className="mt-5 rounded-[24px] border p-4 text-center"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.soft,
                }}
              >
                <p className="text-xs font-black leading-5" style={{ color: theme.text }}>
                  {isOwnPost
                    ? "Bu paylaşım sana ait. Gelen dönüşleri takip edebilir veya paylaşımı güncelleyebilirsin."
                    : actions.note}
                </p>

                <div className="mt-4 grid gap-3">
                  <button
                    onClick={() =>
                      startConversation(
                        actions.primary,
                        createPresetMessage(actions.primary, post.title),
                      )
                    }
                    disabled={isOwnPost || startingConversation}
                    className="flex h-13 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white disabled:opacity-50"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <MessageCircle size={18} />
                    {isOwnPost
                      ? "Kendi Paylaşımın"
                      : startingConversation
                        ? "Açılıyor..."
                        : actions.primary}
                  </button>

                  <button
                    onClick={() => {
                      if (isOwnPost) {
                        setEditOpen(true);
                        return;
                      }

                      startConversation(
                        actions.secondary,
                        createPresetMessage(actions.secondary, post.title),
                      );
                    }}
                    className="rounded-2xl border bg-white px-5 py-4 text-sm font-black"
                    style={{
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  >
                    {isOwnPost ? "Güncelle" : actions.secondary}
                  </button>

                  <button
                    onClick={() => {
                      if (isOwnPost) {
                        document
                          .getElementById("gelen-talepler")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        return;
                      }

                      startConversation(
                        actions.tertiary,
                        createPresetMessage(actions.tertiary, post.title),
                      );
                    }}
                    className={`rounded-2xl bg-gradient-to-r ${theme.gradient} px-5 py-4 text-sm font-black text-white`}
                  >
                    {isOwnPost ? "Gelen Talepler" : actions.tertiary}
                  </button>
                </div>
              </div>
            </div>

            {isOwnPost && (
              <div
                id="gelen-talepler"
                className="rounded-[32px] border bg-white p-6 text-center shadow-sm"
                style={{ borderColor: theme.border }}
              >
                <h3 className="text-xl font-black text-slate-900">
                  Gelen Talepler
                </h3>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Bu paylaşım üzerinden açılan profesyonel görüşmeler.
                </p>

                <div
                  className="mx-auto mt-5 inline-flex rounded-3xl px-6 py-4 text-3xl font-black"
                  style={{
                    backgroundColor: theme.soft,
                    color: theme.text,
                  }}
                >
                  {stats?.total || 0}
                </div>

                <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">
                  Toplam İlgi
                </p>

                <div className="mt-5 space-y-3">
                  {stats?.byTitle && stats.byTitle.length > 0 ? (
                    stats.byTitle.map((item) => (
                      <div
                        key={item.title}
                        className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left"
                        style={{
                          borderColor: theme.border,
                          backgroundColor: theme.soft,
                        }}
                      >
                        <span
                          className="text-xs font-black"
                          style={{ color: theme.text }}
                        >
                          {item.title}
                        </span>

                        <span
                          className="rounded-full px-3 py-1 text-xs font-black text-white"
                          style={{ backgroundColor: theme.primary }}
                        >
                          {item.count}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
                      Bu paylaşıma henüz dönüş gelmedi.
                    </p>
                  )}
                </div>

                {stats?.latest && stats.latest.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-black text-slate-900">
                      Son Görüşmeler
                    </h4>

                    <div className="mt-3 space-y-2">
                      {stats.latest.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => router.push(`/messages/${item.id}`)}
                          className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
                        >
                          <div className="text-xs font-black text-slate-900">
                            {item.title}
                          </div>

                          <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">
                            {item.participants.join(" · ")}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              className="rounded-[32px] border bg-white p-6 text-center shadow-sm"
              style={{ borderColor: theme.border }}
            >
              <h3 className="text-xl font-black text-slate-900">
                Güncelleme Geçmişi
              </h3>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Bu paylaşımda yapılan önemli değişiklikler burada görünür.
              </p>

              <div className="mt-5 space-y-3">
                {updateLogs.length > 0 ? (
                  updateLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border px-4 py-4 text-left"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: theme.soft,
                      }}
                    >
                      <div className="text-sm font-black" style={{ color: theme.text }}>
                        {log.summary}
                      </div>

                      <div className="mt-1 text-[11px] font-bold text-slate-500">
                        {formatDateTime(log.createdAt)}
                      </div>

                      <div className="mt-3 space-y-2">
                        {log.changes.map((change) => (
                          <div
                            key={`${log.id}-${change.field}`}
                            className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                          >
                            <span className="font-black text-slate-900">
                              {change.label}:
                            </span>{" "}
                            {displayLogValue(change.oldValue)} → {displayLogValue(change.newValue)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
                    Bu paylaşımda henüz kayıtlı güncelleme yok.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-xl font-black text-slate-900">
                Tarih Bilgisi
              </h3>

              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <p>İlan tarihi: {formatDateTime(post.createdAt)}</p>
                {!isSameCreatedUpdated(post.createdAt, (post as any).updatedAt) && (
                  <p>Güncelleme: {formatDateTime((post as any).updatedAt)}</p>
                )}
                <p>Bitiş: {formatDateTime(post.expiresAt)}</p>
              </div>
            </div>
          </aside>
        </section>

        {editOpen && (
          <EditPostModal
            post={post}
            theme={theme}
            saving={savingEdit}
            onClose={() => setEditOpen(false)}
            onSave={updatePost}
          />
        )}
      </div>
    </EphAppShell>
  );
}



function displayLogValue(value: unknown) {
  if (value == null || value === '') return 'Boş';
  if (Array.isArray(value)) return value.join(', ') || 'Boş';

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return formatDateTime(text);
  }

  return text;
}

function isSameCreatedUpdated(createdAt?: string, updatedAt?: string) {
  if (!createdAt || !updatedAt) return true;

  return Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) < 2000;
}

function validForFromExpiresAt(value?: string) {
  if (!value) return "7 gün";

  const diff = new Date(value).getTime() - Date.now();
  const day = Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));

  if (day <= 1) return "1 gün";
  if (day <= 3) return "3 gün";
  if (day <= 7) return "7 gün";

  return "30 gün";
}

function EditPostModal({
  post,
  theme,
  saving,
  onClose,
  onSave,
}: {
  post: NetworkPost;
  theme: RoleTheme;
  saving: boolean;
  onClose: () => void;
  onSave: (form: EditPostForm) => void;
}) {
  const [form, setForm] = useState<EditPostForm>({
    type: post.type || "Talep",
    title: post.title || "",
    description: post.description || "",
    city: post.city || "",
    district: post.district || "",
    neighborhood: post.neighborhood || "",
    budget: post.budget ? String(post.budget) : "",
    urgency: post.urgency || "Normal",
    visibility: post.visibility || "TUM_EPH",
    tags: (post.tags || []).join(", "),
    validFor: validForFromExpiresAt(post.expiresAt),
  });

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) {
      alert("Başlık ve açıklama zorunludur.");
      return;
    }

    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-black/50 p-4 backdrop-blur">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[32px] bg-white shadow-2xl">
        <header className="border-b border-slate-100 p-6 text-center">
          <h2 className="text-2xl font-black" style={{ color: theme.text }}>
            Paylaşımı Güncelle
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Güncel bilgiler, paylaşımı görüntüleyen tüm üyelerde görünür.
          </p>
        </header>

        <div className="grid gap-4 p-6">
          <EditField label="Paylaşım tipi">
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
            >
              {shareTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </EditField>

          <EditField label="Başlık">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
            />
          </EditField>

          <EditField label="Açıklama">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm font-semibold leading-6 outline-none"
            />
          </EditField>

          <div className="grid gap-4 md:grid-cols-3">
            <EditField label="İl">
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({ ...current, city: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
              />
            </EditField>

            <EditField label="İlçe">
              <input
                value={form.district}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    district: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
              />
            </EditField>

            <EditField label="Mahalle">
              <input
                value={form.neighborhood}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    neighborhood: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
              />
            </EditField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <EditField label="Bütçe / Değer">
              <input
                value={form.budget}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    budget: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
              />
            </EditField>

            <EditField label="Aciliyet">
              <select
                value={form.urgency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    urgency: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
              >
                {urgencyOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </EditField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <EditField label="Geçerlilik süresi">
              <select
                value={form.validFor}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    validFor: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
              >
                {validOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </EditField>

            <EditField label="Görünürlük">
              <select
                value={form.visibility}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    visibility: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
              >
                {visibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </EditField>
          </div>

          <EditField label="Etiketler">
            <input
              value={form.tags}
              onChange={(event) =>
                setForm((current) => ({ ...current, tags: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
            />
          </EditField>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 p-6 md:flex-row md:justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 disabled:opacity-60"
          >
            Vazgeç
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`h-12 rounded-2xl bg-gradient-to-r ${theme.gradient} px-5 text-sm font-black text-white shadow-xl disabled:opacity-60`}
          >
            {saving ? "Kaydediliyor..." : "Güncellemeyi Kaydet"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-center text-sm font-black text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}


function DetailHeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] bg-white/12 p-4 text-center backdrop-blur">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white">
        {icon}
      </div>

      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function DetailInfoCard({
  icon,
  label,
  value,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  theme: RoleTheme;
}) {
  return (
    <div
      className="rounded-[28px] border bg-white p-5 text-center shadow-sm"
      style={{ borderColor: theme.border }}
    >
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: theme.soft,
          color: theme.primary,
        }}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}
