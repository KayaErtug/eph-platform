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

export default function NetworkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();

  const id = String(params?.id || "");

  const [post, setPost] = useState<NetworkPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingConversation, setStartingConversation] = useState(false);

  const postUser = getPostUser(post);
  const theme = useMemo(() => getRoleTheme(postUser?.role), [postUser?.role]);
  const isOwnPost = Boolean(user?.id && post?.userId === user.id);

  useEffect(() => {
    if (!id) return;

    fetchPost();
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

  const startConversation = async () => {
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
        title: post.title,
      });

      router.push(`/messages/${res.data.id}`);
    } catch {
      alert("Görüşme başlatılamadı.");
    } finally {
      setStartingConversation(false);
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

              <div className="mt-5 grid gap-3">
                <button
                  onClick={startConversation}
                  disabled={isOwnPost || startingConversation}
                  className="flex h-13 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white disabled:opacity-50"
                  style={{ backgroundColor: theme.primary }}
                >
                  <MessageCircle size={18} />
                  {isOwnPost
                    ? "Kendi Paylaşımın"
                    : startingConversation
                      ? "Açılıyor..."
                      : "Görüşme Başlat"}
                </button>

                <button
                  className="rounded-2xl border px-5 py-4 text-sm font-black"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.soft,
                    color: theme.text,
                  }}
                >
                  Portföy Öner
                </button>

                <button
                  className={`rounded-2xl bg-gradient-to-r ${theme.gradient} px-5 py-4 text-sm font-black text-white`}
                >
                  İlgileniyorum
                </button>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-xl font-black text-slate-900">
                Tarih Bilgisi
              </h3>

              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <p>Yayın: {formatDateTime(post.createdAt)}</p>
                <p>Bitiş: {formatDateTime(post.expiresAt)}</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </EphAppShell>
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
