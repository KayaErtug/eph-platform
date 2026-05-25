"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "firebase/messaging";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { firebaseVapidKey, getFirebaseMessaging } from "@/lib/firebase";

import {
  Building2,
  CheckCircle2,
  CircleUserRound,
  Flame,
  Inbox,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
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

type CreatePostForm = {
  type: string;
  title: string;
  desc: string;
  city: string;
  district: string;
  neighborhood: string;
  budget: string;
  urgency: string;
  validFor: string;
  visibility: string;
  tags: string;
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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

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
      alert("Tarayıcı sesi engelledi. Lütfen tekrar deneyin.");
    }
  };

  const enablePushNotifications = async () => {
    try {
      setPushLoading(true);

      if (!("Notification" in window)) {
        alert("Bu tarayıcı bildirimleri desteklemiyor.");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        alert("Bu tarayıcı service worker desteklemiyor.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        alert("Bildirim izni verilmedi.");
        return;
      }

      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

      const messaging = await getFirebaseMessaging();

      if (!messaging) {
        alert("Bu cihazda Firebase bildirimleri desteklenmiyor.");
        return;
      }

      const token = await getToken(messaging, {
        vapidKey: firebaseVapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        alert("Bildirim tokeni alınamadı.");
        return;
      }

      localStorage.setItem("ephFirebaseToken", token);
      localStorage.setItem("ephPushEnabled", "true");

      setPushEnabled(true);

      alert("Bildirimler açıldı. Bir sonraki adımda bunu mesaj sistemine bağlayacağız.");
    } catch (error) {
      console.error(error);
      alert("Bildirim izni alınamadı. Tarayıcı ayarlarını kontrol edin.");
    } finally {
      setPushLoading(false);
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

      if (!firstUnreadCheckRef.current && totalUnread > lastUnreadRef.current) {
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
    setPushEnabled(localStorage.getItem("ephPushEnabled") === "true");

    fetchPosts();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    firstUnreadCheckRef.current = true;
    lastUnreadRef.current = 0;

    fetchConversationStats();

    const interval = setInterval(() => {
      fetchConversationStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id, soundEnabled]);

  const handleCreatePost = async (form: CreatePostForm) => {
    if (!user?.id) {
      alert("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      router.push("/giris");
      return;
    }

    const customTags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const locationTags = [form.city, form.district, form.neighborhood].filter(
      Boolean
    );

    await api.post("/network/posts", {
      userId: user.id,
      type: form.type,
      title: form.title,
      description: form.desc,
      city: form.city || null,
      district: form.district || null,
      neighborhood: form.neighborhood || null,
      budget: form.budget ? Number(form.budget.replace(/\D/g, "")) : null,
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
      if (!user?.id) {
        alert("Lütfen tekrar giriş yapın.");
        router.push("/giris");
        return;
      }

      if (post.userId === user.id || post.user?.id === user.id) {
        alert("Bu paylaşım sana ait.");
        return;
      }

      const res = await api.post("/conversations/start", {
        senderId: user.id,
        postId: post.id,
        message: `${post.title} paylaşımı için görüşme başlatıldı.`,
      });

      await fetchConversationStats();

      router.push(`/messages/${res.data.id}`);
    } catch {
      alert("Görüşme başlatılamadı.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F3F6FB]">
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-5 py-5 text-center lg:flex-row lg:justify-between">
          <div className="flex flex-col items-center text-center lg:flex-row lg:gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white shadow-xl">
              <UsersRound size={28} />
            </div>

            <div className="mt-3 lg:mt-0">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-[28px] font-black text-[#0F172A]">
                  EPH Network
                </h1>

                <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-[11px] font-black text-[#1D4ED8]">
                  EPH
                </span>
              </div>

              <p className="mt-2 text-sm font-medium text-slate-500">
                Emlak profesyonellerine özel paylaşım ve iş birliği ağı
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {!pushEnabled && (
              <button
                onClick={enablePushNotifications}
                disabled={pushLoading}
                className="flex h-11 items-center gap-2 rounded-2xl bg-[#0F172A] px-4 text-sm font-black text-white disabled:opacity-60"
              >
                <Volume2 size={18} />
                {pushLoading ? "Açılıyor..." : "Bildirimleri Aç"}
              </button>
            )}

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
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 backdrop-blur">
                <CircleUserRound size={34} />
              </div>

              <div className="mt-3">
                <h2 className="text-lg font-black">
                  {user?.firstName} {user?.lastName}
                </h2>

                <p className="mt-1 text-sm text-blue-100">
                  {roleLabel(user?.role)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Paylaşım" value={String(posts.length)} />
              <MiniStat label="Mesaj" value={String(conversationCount)} />
            </div>
          </div>

          <div className="rounded-[30px] border border-white bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-center text-lg font-black text-[#0F172A]">
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
                  {index === 0 && <Sparkles size={16} />}
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

            <div className="mb-5 flex justify-center gap-2 overflow-x-auto pb-2">
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
          ) : posts.length === 0 ? (
            <div className="rounded-[30px] bg-white p-10 text-center">
              <div className="text-lg font-black text-[#0F172A]">
                Henüz paylaşım yok
              </div>

              <p className="mt-2 text-sm text-slate-500">
                İlk talebi veya portföy fırsatını sen paylaşabilirsin.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PremiumPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onStartConversation={() => startConversation(post)}
              />
            ))
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-white bg-white p-5 text-center shadow-sm">
            <div className="mb-3 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#EEF2FF] text-[#4F46E5]">
                <ShieldCheck size={28} />
              </div>
            </div>

            <h2 className="text-xl font-black text-[#0F172A]">
              Güvenli Profesyonel Ağ
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Paylaşımlar yalnızca EPH üyelerine görünür.
            </p>
          </div>

          <div className="rounded-[30px] border border-white bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-center text-lg font-black text-[#0F172A]">
              Hızlı Erişim
            </h2>

            <div className="space-y-3">
              <QuickLink icon={<Flame size={18} />} label="Sıcak Talepler" />

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
    post.userId === currentUserId || post.user?.id === currentUserId;

  return (
    <article className="group overflow-hidden rounded-[32px] border border-white bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl">
      <div className="h-2 bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED]" />

      <div className="p-6">
        <div className="mb-5 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-xl font-black text-white shadow-xl">
            {authorName[0]}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-[16px] font-black text-[#0F172A]">
                {authorName}
              </h3>

              <CheckCircle2 size={18} className="text-[#2563EB]" />
            </div>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {roleLabel(post.user?.role)}
            </p>

            <p className="mt-1 text-xs font-bold text-slate-400">
              {relativeTime(post.createdAt)}
            </p>
          </div>

          <span className="mt-4 rounded-full bg-[#FEF2F2] px-4 py-2 text-xs font-black text-[#DC2626]">
            🔥 {post.urgency || "Normal"}
          </span>
        </div>

        <div className="mb-4 flex justify-center">
          <div className="inline-flex rounded-full bg-[#EEF2FF] px-4 py-2 text-xs font-black text-[#4F46E5]">
            {post.type}
          </div>
        </div>

        <h2 className="text-center text-[26px] font-black leading-tight text-[#0F172A]">
          {post.title}
        </h2>

        <p className="mt-4 text-center text-[15px] leading-8 text-slate-600">
          {post.description}
        </p>

        {post.budget && (
          <div className="mt-5 flex justify-center">
            <div className="inline-flex rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm font-black text-[#0F172A]">
              💰 {formatMoney(post.budget)}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#F1F5F9] px-3 py-2 text-xs font-bold text-slate-600"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            onClick={isOwnPost ? undefined : onStartConversation}
            disabled={isOwnPost}
            className={`rounded-2xl py-3 text-sm font-black transition-all ${
              isOwnPost
                ? "bg-slate-100 text-slate-400"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isOwnPost ? "Kendi Paylaşımın" : "Görüşme Başlat"}
          </button>

          <button className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
            Portföy Öner
          </button>

          <button className="rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] py-3 text-sm font-black text-white shadow-lg">
            İlgileniyorum
          </button>
        </div>

        <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-center text-xs font-bold text-slate-400 md:grid-cols-2">
          <span>Yayın: {formatDateTime(post.createdAt)}</span>
          <span>Bitiş: {formatDateTime(post.expiresAt)}</span>
        </div>
      </div>
    </article>
  );
}

function CreatePostModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (form: CreatePostForm) => void;
}) {
  const [form, setForm] = useState<CreatePostForm>({
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

  const handleSubmit = () => {
    if (!form.title.trim() || !form.desc.trim()) {
      alert("Başlık ve açıklama zorunludur.");
      return;
    }

    onCreate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[32px] bg-white">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div className="flex-1 text-center">
            <h2 className="text-[28px] font-black text-[#0F172A]">
              Yeni Paylaşım
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Ağ içerisinde paylaşım oluştur
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100"
          >
            <X size={20} />
          </button>
        </header>

        <div className="grid gap-4 p-6">
          <NetworkField label="Paylaşım tipi">
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#2563EB]"
            >
              {shareTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </NetworkField>

          <NetworkField label="Başlık">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none focus:border-[#2563EB]"
              placeholder="Örn: Akkonak’ta 3+1 satılık daire aranıyor"
            />
          </NetworkField>

          <NetworkField label="Açıklama">
            <textarea
              value={form.desc}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  desc: event.target.value,
                }))
              }
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm font-semibold leading-6 outline-none focus:border-[#2563EB]"
              placeholder="Talep, portföy veya iş birliği detaylarını yazın..."
            />
          </NetworkField>

          <div className="grid gap-4 md:grid-cols-3">
            <NetworkField label="İl">
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none focus:border-[#2563EB]"
                placeholder="Denizli"
              />
            </NetworkField>

            <NetworkField label="İlçe">
              <input
                value={form.district}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    district: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none focus:border-[#2563EB]"
                placeholder="Merkezefendi"
              />
            </NetworkField>

            <NetworkField label="Mahalle">
              <input
                value={form.neighborhood}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    neighborhood: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none focus:border-[#2563EB]"
                placeholder="Akkonak"
              />
            </NetworkField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <NetworkField label="Bütçe / Değer">
              <input
                value={form.budget}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    budget: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none focus:border-[#2563EB]"
                placeholder="Örn: 15000000"
              />
            </NetworkField>

            <NetworkField label="Aciliyet">
              <select
                value={form.urgency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    urgency: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none focus:border-[#2563EB]"
              >
                {urgencyOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </NetworkField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <NetworkField label="Geçerlilik süresi">
              <select
                value={form.validFor}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    validFor: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none focus:border-[#2563EB]"
              >
                {validOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </NetworkField>

            <NetworkField label="Görünürlük">
              <select
                value={form.visibility}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    visibility: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none focus:border-[#2563EB]"
              >
                {visibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </NetworkField>
          </div>

          <NetworkField label="Etiketler">
            <input
              value={form.tags}
              onChange={(event) =>
                setForm((current) => ({ ...current, tags: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none focus:border-[#2563EB]"
              placeholder="arsa, satılık, hazır müşteri"
            />
          </NetworkField>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 p-6 md:flex-row md:justify-end">
          <button
            onClick={onClose}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
          >
            Vazgeç
          </button>

          <button
            onClick={handleSubmit}
            className="h-12 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 text-sm font-black text-white shadow-xl"
          >
            Paylaşımı Yayınla
          </button>
        </footer>
      </section>
    </div>
  );
}

function NetworkField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-xs font-bold text-blue-100">{label}</p>

      <p className="mt-1 text-2xl font-black">{value}</p>
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
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-[#F8FAFC] px-4 py-4 text-center text-sm font-black text-slate-700 transition-all hover:bg-slate-100"
    >
      <span className="text-[#4F46E5]">{icon}</span>
      {label}
    </button>
  );
}