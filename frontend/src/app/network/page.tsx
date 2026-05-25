"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

import {
  Bell,
  Building2,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  Flame,
  Inbox,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  UsersRound,
  Volume2,
  X,
} from "lucide-react";

type NetworkUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

type NetworkPost = {
  id: string;
  userId?: string;
  user?: NetworkUser;
  urgency: string | null;
  type: string;
  title: string;
  description?: string;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  visibility?: string;
  tags: string[];
  expiresAt?: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  unreadCount?: number;
};

const categories = [
  "Tüm Akış",
  "Satılık Talepleri",
  "Kiralık Talepleri",
  "Portföy Paylaşımı",
  "Ortak Satış",
  "Müteahhit & Proje",
  "Arsa & Kat Karşılığı",
];

const filters = [
  "En Yeni",
  "Sıcak Talepler",
  "Hazır Müşteri",
  "Bugün",
  "Trend",
];

const shareTypes = [
  "Talep",
  "Portföy",
  "Ortak Satış",
  "Arsa",
  "Müteahhit Projesi",
  "Yatırımcı Arıyor",
];

const validOptions = ["1 gün", "3 gün", "7 gün", "30 gün"];

const urgencyOptions = [
  "Normal",
  "Sıcak Talep",
  "Acil",
  "Hazır Müşteri",
];

const visibilityOptions = [
  { label: "Tüm EPH", value: "TUM_EPH" },
  { label: "Sadece emlakçılar", value: "SADECE_EMLAKCILAR" },
  {
    label: "Sadece müteahhitler / inşaat firmaları",
    value: "SADECE_MUTEAHHITLER",
  },
  { label: "Sadece bağlantılarım", value: "SADECE_BAGLANTILARIM" },
];

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

function expiresAtFromValidFor(value: string) {
  const date = new Date();

  if (value === "1 gün") date.setDate(date.getDate() + 1);
  else if (value === "3 gün") date.setDate(date.getDate() + 3);
  else if (value === "7 gün") date.setDate(date.getDate() + 7);
  else date.setDate(date.getDate() + 30);

  return date.toISOString();
}

function formatMoney(value?: string | number | null) {
  if (value == null || value === "") return "";

  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/\D/g, ""));

  if (!numeric) return String(value);

  return `${numeric.toLocaleString("tr-TR")} TL`;
}

function roleLabel(role?: string) {
  if (role === "EMLAKCI") return "Doğrulanmış Emlakçı";
  if (role === "MUTEAHHIT") return "Müteahhit";
  if (role === "INSAAT_FIRMASI") return "İnşaat Firması";
  if (role === "ADMIN") return "EPH Admin";

  return "EPH Üyesi";
}

export default function NetworkPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [conversationCount, setConversationCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(false);

  const lastUnreadRef = useRef(0);
  const firstUnreadCheckRef = useRef(true);

  const getSoundFile = () => {
    return (
      localStorage.getItem("ephNotificationSoundFile") ||
      "/sounds/universfield-new-notification-043-493471.mp3"
    );
  };

  const playNotificationSound = () => {
    const soundValue =
      localStorage.getItem("ephNotificationSound") || "notification";

    const soundFile = getSoundFile();

    if (!soundEnabled) return;
    if (soundValue === "off" || !soundFile) return;

    const audio = new Audio(soundFile);

    audio.volume = 0.6;

    audio.play().catch(() => {});
  };

  const enableSound = async () => {
    try {
      const audio = new Audio(getSoundFile());

      audio.volume = 0.35;

      await audio.play();

      localStorage.setItem("ephSoundEnabled", "true");

      setSoundEnabled(true);
    } catch {
      alert("Tarayıcı sesi engelledi.");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/giris");
  };

  const fetchPosts = async () => {
    try {
      const res = await api.get("/network/posts");

      setPosts(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationStats = async () => {
    if (!user?.id) return;

    try {
      const res = await api.get(`/conversations/my/${user.id}`);

      const conversations: Conversation[] = res.data || [];

      setConversationCount(conversations.length);

      const totalUnread = conversations.reduce(
        (total, item) => total + (item.unreadCount || 0),
        0
      );

      if (
        !firstUnreadCheckRef.current &&
        totalUnread > lastUnreadRef.current
      ) {
        playNotificationSound();
      }

      firstUnreadCheckRef.current = false;
      lastUnreadRef.current = totalUnread;

      setUnreadCount(totalUnread);
    } catch {
      setConversationCount(0);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    setSoundEnabled(localStorage.getItem("ephSoundEnabled") === "true");

    fetchPosts();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    fetchConversationStats();

    const interval = setInterval(() => {
      fetchConversationStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id, soundEnabled]);

  const handleCreatePost = async (form: any) => {
    if (!user?.id) return;

    const customTags = form.tags
      .split(",")
      .map((tag: string) => tag.trim())
      .filter(Boolean);

    const locationTags = [
      form.city,
      form.district,
      form.neighborhood,
    ].filter(Boolean);

    await api.post("/network/posts", {
      userId: user.id,
      type: form.type,
      title: form.title,
      description: form.desc,
      city: form.city || null,
      district: form.district || null,
      neighborhood: form.neighborhood || null,
      budget: form.budget
        ? Number(form.budget.replace(/\D/g, ""))
        : null,
      urgency: form.urgency,
      visibility: form.visibility,
      tags: [...locationTags, ...customTags].slice(0, 8),
      expiresAt: expiresAtFromValidFor(form.validFor),
    });

    await fetchPosts();

    setModalOpen(false);
  };

  const startConversation = async (post: NetworkPost) => {
    try {
      if (!user?.id) return;

      if (post.userId === user.id || post.user?.id === user.id) {
        alert("Bu paylaşım sana ait.");
        return;
      }

      const res = await api.post("/conversations/start", {
        senderId: user.id,
        postId: post.id,
        message: `${post.title} paylaşımı için görüşme başlatıldı.`,
      });

      router.push(`/messages/${res.data.id}`);
    } catch {
      alert("Görüşme başlatılamadı.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F3F6FB]">
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white shadow-xl">
              <UsersRound size={28} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[28px] font-black text-[#0F172A]">
                  EPH Network
                </h1>

                <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-[11px] font-black text-[#1D4ED8]">
                  PREMIUM
                </span>
              </div>

              <p className="text-sm font-medium text-slate-500">
                Emlak profesyonellerine özel paylaşım ve iş birliği ağı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!soundEnabled && (
              <button
                onClick={enableSound}
                className="flex h-11 items-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-white"
              >
                <Volume2 size={18} />
                Sesi Aç
              </button>
            )}

            <button
              onClick={() => router.push("/messages")}
              className="relative flex h-11 items-center gap-2 rounded-2xl bg-[#1D4ED8] px-4 text-sm font-black text-white shadow-lg"
            >
              <Inbox size={18} />

              Mesajlar

              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => router.push("/notification-settings")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white"
            >
              <Settings size={18} />
            </button>

            <button
              onClick={handleLogout}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
            >
              Çıkış
            </button>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[280px_1fr_320px]">
        <aside className="space-y-5">
          <div className="overflow-hidden rounded-[30px] bg-gradient-to-br from-[#2563EB] to-[#4F46E5] p-5 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 backdrop-blur">
                <CircleUserRound size={34} />
              </div>

              <div>
                <h2 className="text-lg font-black">
                  {user?.firstName} {user?.lastName}
                </h2>

                <p className="text-sm text-blue-100">
                  {roleLabel(user?.role)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat
                label="Paylaşım"
                value={String(posts.length)}
              />

              <MiniStat
                label="Mesaj"
                value={String(conversationCount)}
              />
            </div>
          </div>

          <div className="rounded-[30px] border border-white bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-black text-[#0F172A]">
              Kategoriler
            </h3>

            <div className="space-y-2">
              {categories.map((category, index) => (
                <button
                  key={category}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition-all ${
                    index === 0
                      ? "bg-[#2563EB] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {category}

                  {index === 0 && (
                    <Sparkles size={16} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-[32px] border border-white bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[#F8FAFC] px-4 py-4">
              <Search size={18} className="text-slate-400" />

              <input
                className="w-full bg-transparent text-sm font-semibold outline-none"
                placeholder="Talep, portföy, bölge veya kullanıcı ara..."
              />
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
              {filters.map((filter, index) => (
                <button
                  key={filter}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${
                    index === 0
                      ? "bg-[#2563EB] text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-sm font-black text-white shadow-xl"
            >
              <Plus size={20} />
              Yeni Paylaşım Oluştur
            </button>
          </div>

          {loading ? (
            <div className="rounded-[30px] bg-white p-10 text-center font-bold text-slate-500">
              Network yükleniyor...
            </div>
          ) : (
            posts.map((post) => (
              <PremiumPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onStartConversation={() =>
                  startConversation(post)
                }
              />
            ))
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-white bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#EEF2FF] text-[#4F46E5]">
              <ShieldCheck size={28} />
            </div>

            <h2 className="text-xl font-black text-[#0F172A]">
              Güvenli Profesyonel Ağ
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Paylaşımlar yalnızca EPH üyelerine görünür.
            </p>
          </div>

          <div className="rounded-[30px] border border-white bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-[#0F172A]">
              Hızlı Erişim
            </h2>

            <div className="space-y-3">
              <QuickLink
                icon={<Flame size={18} />}
                label="Sıcak Talepler"
              />

              <QuickLink
                icon={<TrendingUp size={18} />}
                label="Trend Paylaşımlar"
              />

              <QuickLink
                icon={<MessageCircle size={18} />}
                label="Mesajlar"
                onClick={() => router.push("/messages")}
              />

              <QuickLink
                icon={<Building2 size={18} />}
                label="Portföy Eşleştir"
              />
            </div>
          </div>
        </aside>
      </section>

      {modalOpen && (
        <CreatePostModal
          onClose={() => setModalOpen(false)}
          onCreate={handleCreatePost}
        />
      )}
    </main>
  );
}

function PremiumPostCard({
  post,
  currentUserId,
  onStartConversation,
}: {
  post: NetworkPost;
  currentUserId?: string;
  onStartConversation: () => void;
}) {
  const authorName = post.user
    ? `${post.user.firstName} ${post.user.lastName}`
    : "EPH Üyesi";

  const isOwnPost =
    post.userId === currentUserId ||
    post.user?.id === currentUserId;

  return (
    <article className="group overflow-hidden rounded-[32px] border border-white bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl">
      <div className="h-2 bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED]" />

      <div className="p-6">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-xl font-black text-white shadow-xl">
              {authorName[0]}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-black text-[#0F172A]">
                  {authorName}
                </h3>

                <CheckCircle2
                  size={18}
                  className="text-[#2563EB]"
                />
              </div>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                {roleLabel(post.user?.role)}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400">
                {relativeTime(post.createdAt)}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-[#FEF2F2] px-4 py-2 text-xs font-black text-[#DC2626]">
            🔥 {post.urgency || "Normal"}
          </span>
        </div>

        <div className="mb-4 inline-flex rounded-full bg-[#EEF2FF] px-4 py-2 text-xs font-black text-[#4F46E5]">
          {post.type}
        </div>

        <h2 className="text-[26px] font-black leading-tight text-[#0F172A]">
          {post.title}
        </h2>

        <p className="mt-4 text-[15px] leading-8 text-slate-600">
          {post.description}
        </p>

        {post.budget && (
          <div className="mt-5 inline-flex rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm font-black text-[#0F172A]">
            💰 {formatMoney(post.budget)}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#F1F5F9] px-3 py-2 text-xs font-bold text-slate-600"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            onClick={
              isOwnPost ? undefined : onStartConversation
            }
            disabled={isOwnPost}
            className={`rounded-2xl py-3 text-sm font-black transition-all ${
              isOwnPost
                ? "bg-slate-100 text-slate-400"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isOwnPost
              ? "Kendi Paylaşımın"
              : "Görüşme Başlat"}
          </button>

          <button className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
            Portföy Öner
          </button>

          <button className="rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] py-3 text-sm font-black text-white shadow-lg">
            İlgileniyorum
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-400">
          <span>
            Yayın: {formatDateTime(post.createdAt)}
          </span>

          <span>
            Bitiş: {formatDateTime(post.expiresAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

function CreatePostModal({
  onClose,
  onCreate,
}: any) {
  const [form, setForm] = useState({
    type: "Talep",
    title: "",
    desc: "",
    city: "Denizli",
    district: "",
    neighborhood: "",
    budget: "",
    urgency: "Sıcak Talep",
    validFor: "1 gün",
    visibility: "TUM_EPH",
    tags: "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-auto rounded-[32px] bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h2 className="text-[28px] font-black text-[#0F172A]">
              Yeni Paylaşım
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Premium network paylaşımı oluştur
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 p-6">
          <input
            placeholder="Başlık"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            className="h-14 rounded-2xl border border-slate-200 px-5 font-bold outline-none"
          />

          <textarea
            placeholder="Açıklama"
            value={form.desc}
            onChange={(e) =>
              setForm({ ...form, desc: e.target.value })
            }
            className="min-h-[180px] rounded-2xl border border-slate-200 p-5 outline-none"
          />

          <button
            onClick={() => onCreate(form)}
            className="h-14 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-sm font-black text-white shadow-xl"
          >
            Paylaşımı Yayınla
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-bold text-blue-100">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-[#F8FAFC] px-4 py-4 text-left text-sm font-black text-slate-700 transition-all hover:bg-slate-100"
    >
      <span className="text-[#4F46E5]">
        {icon}
      </span>

      {label}
    </button>
  );
}