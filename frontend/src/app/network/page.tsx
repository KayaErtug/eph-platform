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
  TimerReset,
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
  "Süresi Yaklaşan",
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
    typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));

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

  const [modalOpen, setModalOpen] = useState(false);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [conversationCount, setConversationCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const lastUnreadRef = useRef(0);
  const firstUnreadCheckRef = useRef(true);

  const getSoundFile = () => {
    return (
      localStorage.getItem("ephNotificationSoundFile") ||
      "/sounds/universfield-new-notification-036-485897.mp3"
    );
  };

  const playNotificationSound = () => {
    const soundValue = localStorage.getItem("ephNotificationSound") || "notification";
    const soundFile = getSoundFile();

    if (!soundEnabled) return;
    if (soundValue === "off" || !soundFile) return;

    const audio = new Audio(soundFile);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  };

  const enableSound = async () => {
    try {
      const soundFile = getSoundFile();
      const audio = new Audio(soundFile);
      audio.volume = 0.35;
      await audio.play();

      localStorage.setItem("ephSoundEnabled", "true");
      setSoundEnabled(true);
    } catch {
      alert("Tarayıcı sesi engelledi. Lütfen butona tekrar tıklayın.");
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
        (total, conversation) => total + (conversation.unreadCount || 0),
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

  const handleCreatePost = async (form: {
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
  }) => {
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
        alert("Bu paylaşım sana ait. Kendi paylaşımın için görüşme başlatamazsın.");
        return;
      }

      const res = await api.post("/conversations/start", {
        senderId: user.id,
        postId: post.id,
        message: `${post.title} paylaşımı için görüşme başlatıldı.`,
      });

      await fetchConversationStats();
      router.push(`/messages/${res.data.id}`);
    } catch (error) {
      console.error(error);
      alert("Görüşme başlatılamadı. Lütfen tekrar deneyin.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#111827]">
      <section className="mx-auto min-h-screen max-w-6xl px-5 py-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-black text-[#1D4ED8]">
              <LockKeyhole size={15} />
              Kapalı profesyonel ağ
            </div>

            <h1 className="text-[34px] font-black tracking-tight text-[#0B1F44]">
              EPH Network
            </h1>

            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-500">
              Meslektaşlarınızla talep, portföy, proje ve iş birliği
              fırsatlarını yalnızca EPH üyeleri içinde paylaşın.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!soundEnabled && (
              <button
                onClick={enableSound}
                className="flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white"
              >
                <Volume2 size={18} />
                Sesi Etkinleştir
              </button>
            )}

            <button
              onClick={() => router.push("/messages")}
              className="relative flex h-11 items-center gap-2 rounded-2xl bg-[#1D4ED8] px-4 text-sm font-black text-white shadow-sm"
            >
              <Inbox size={18} />
              Mesaj Kutusu

              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white ring-4 ring-[#F5F7FA]">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => router.push("/notification-settings")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
              title="Bildirim sesi ayarları"
            >
              <Settings size={19} />
            </button>

            <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600">
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-600" />
              )}
            </button>

            <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#1D4ED8]">
              <CircleUserRound size={24} />
            </button>

            <button
              onClick={handleLogout}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
            >
              Çıkış
            </button>
          </div>
        </header>

        {unreadCount > 0 && (
          <div className="mb-5 rounded-[24px] border border-red-100 bg-[#FEF2F2] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-[#991B1B]">
                  {unreadCount} okunmamış mesajın var.
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Yeni cevapları mesaj kutusundan takip edebilirsin.
                </p>
              </div>

              <button
                onClick={() => router.push("/messages")}
                className="shrink-0 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white"
              >
                Mesajlara Git
              </button>
            </div>
          </div>
        )}

        <section className="mb-5 grid gap-3 md:grid-cols-4">
          <InfoCard label="Bugünkü Paylaşım" value={String(posts.length)} note="Aktif kayıt" />
          <InfoCard
            label="Sıcak Talep"
            value={String(posts.filter((post) => post.urgency === "Sıcak Talep").length)}
            note="Hazır müşteri"
          />
          <InfoCard label="Okunmamış Mesaj" value={String(unreadCount)} note="Sesli bildirim" />
          <InfoCard label="Aktif Görüşme" value={String(conversationCount)} note="Mesaj kutusu" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[260px_1fr_300px]">
          <aside className="rounded-[26px] border border-slate-200 bg-white p-4">
            <h2 className="mb-4 text-[16px] font-black text-[#0B1F44]">
              Kategoriler
            </h2>

            <div className="space-y-2">
              {categories.map((category, index) => (
                <button
                  key={category}
                  className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-bold ${
                    index === 0
                      ? "bg-[#EEF4FF] text-[#1D4ED8]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-[#0B1F44]">
                <TimerReset size={17} className="text-[#1D4ED8]" />
                Geçerlilik süresi
              </div>

              <p className="text-sm leading-6 text-slate-500">
                Paylaşımlar 1 gün, 3 gün, 7 gün veya 30 gün geçerli olur.
                Süresi dolan talepler otomatik olarak akıştan kaldırılır.
              </p>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-[26px] border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
                <Search size={18} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  placeholder="Talep, portföy, mahalle veya meslektaş ara..."
                />
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {filters.map((filter, index) => (
                  <button
                    key={filter}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${
                      index === 0
                        ? "bg-[#1D4ED8] text-white"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setModalOpen(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] text-sm font-black text-white"
              >
                <Plus size={18} />
                Yeni paylaşım oluştur
              </button>
            </div>

            {loading ? (
              <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
                Network paylaşımları yükleniyor...
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center">
                <div className="text-lg font-black text-[#0B1F44]">
                  Henüz paylaşım yok
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  İlk talebi veya portföy fırsatını sen paylaşabilirsin.
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <NetworkPostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  onStartConversation={() => startConversation(post)}
                />
              ))
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-slate-200 bg-white p-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
                <ShieldCheck size={24} />
              </div>

              <h2 className="text-[17px] font-black text-[#0B1F44]">
                Sadece EPH üyeleri
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Bu akış Google’da görünmez. Paylaşımlar yalnızca giriş yapan
                doğrulanmış profesyoneller içindir.
              </p>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-[17px] font-black text-[#0B1F44]">
                Sıcak Bölümler
              </h2>

              <div className="space-y-2">
                <QuickLink icon={<Flame size={18} />} label="Sıcak Talepler" />
                <QuickLink icon={<TimerReset size={18} />} label="Süresi Yaklaşanlar" />
                <QuickLink
                  icon={<MessageCircle size={18} />}
                  label="Mesajlar"
                  onClick={() => router.push("/messages")}
                />
                <QuickLink icon={<UsersRound size={18} />} label="Meslektaşlar" />
                <QuickLink icon={<Building2 size={18} />} label="Portföy Eşleştir" />
              </div>
            </div>
          </aside>
        </section>
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

function NetworkPostCard({
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

  const authorRole = post.user ? roleLabel(post.user.role) : "EPH Üyesi";
  const isOwnPost =
    post.userId === currentUserId || post.user?.id === currentUserId;

  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] font-black text-[#1D4ED8]">
            {authorName[0]}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#0B1F44]">
                {authorName}
              </h3>
              <CheckCircle2 size={15} className="text-[#1D4ED8]" />
            </div>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              {authorRole}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-3 py-1 text-xs font-black text-[#B91C1C]">
            <Flame size={13} />
            {post.urgency || "Normal"}
          </span>

          <div className="mt-2 text-xs font-bold text-slate-400">
            {relativeTime(post.createdAt)}
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3 md:grid-cols-2">
        <TimeLine icon={<Clock3 size={15} />} label="Yayın" value={formatDateTime(post.createdAt)} />
        <TimeLine icon={<TimerReset size={15} />} label="Geçerlilik" value={formatDateTime(post.expiresAt)} />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
          {post.type}
        </span>
      </div>

      <h2 className="text-[20px] font-black tracking-tight text-[#111827]">
        {post.title}
      </h2>

      <p className="mt-2 text-[14px] leading-6 text-slate-600">
        {post.description}
      </p>

      {post.budget && (
        <p className="mt-3 text-sm font-black text-[#0B1F44]">
          Bütçe / Değer: {formatMoney(post.budget)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-1 text-xs font-bold text-slate-600"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={isOwnPost}
          onClick={isOwnPost ? undefined : onStartConversation}
          className={`rounded-2xl px-3 py-3 text-sm font-black ${
            isOwnPost
              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
              : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          {isOwnPost ? "Kendi Paylaşımın" : "Görüşme Başlat"}
        </button>

        <button className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">
          Portföy Öner
        </button>

        <button className="rounded-2xl bg-[#1D4ED8] px-3 py-3 text-sm font-black text-white">
          İlgileniyorum
        </button>
      </div>
    </article>
  );
}

function CreatePostModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (form: {
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
  }) => void;
}) {
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

  const handleSubmit = () => {
    if (!form.title.trim() || !form.desc.trim()) {
      alert("Başlık ve açıklama zorunludur.");
      return;
    }

    onCreate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[28px] border border-slate-200 bg-white">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-[24px] font-black tracking-tight text-[#0B1F44]">
              Yeni paylaşım oluştur
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Talep, portföy veya iş birliği fırsatınızı EPH ağı içinde
              paylaşın.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F1F5F9] text-slate-600"
          >
            <X size={20} />
          </button>
        </header>

        <div className="grid gap-4 p-5">
          <NetworkField label="Paylaşım tipi">
            <select
              value={form.type}
              onChange={(event) =>
                setForm((f) => ({ ...f, type: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
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
                setForm((f) => ({ ...f, title: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
              placeholder="Örn: Akkonak’ta 3+1 satılık daire aranıyor"
            />
          </NetworkField>

          <NetworkField label="Açıklama">
            <textarea
              value={form.desc}
              onChange={(event) =>
                setForm((f) => ({ ...f, desc: event.target.value }))
              }
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 outline-none focus:border-[#1D4ED8]"
              placeholder="Talep, portföy veya iş birliği detaylarını yazın..."
            />
          </NetworkField>

          <div className="grid gap-4 md:grid-cols-3">
            <NetworkField label="İl">
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((f) => ({ ...f, city: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
                placeholder="Denizli"
              />
            </NetworkField>

            <NetworkField label="İlçe">
              <input
                value={form.district}
                onChange={(event) =>
                  setForm((f) => ({ ...f, district: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
                placeholder="Merkezefendi"
              />
            </NetworkField>

            <NetworkField label="Mahalle">
              <input
                value={form.neighborhood}
                onChange={(event) =>
                  setForm((f) => ({ ...f, neighborhood: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
                placeholder="Akkonak"
              />
            </NetworkField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <NetworkField label="Bütçe / Değer">
              <input
                value={form.budget}
                onChange={(event) =>
                  setForm((f) => ({ ...f, budget: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
                placeholder="Örn: 15000000"
              />
            </NetworkField>

            <NetworkField label="Aciliyet">
              <select
                value={form.urgency}
                onChange={(event) =>
                  setForm((f) => ({ ...f, urgency: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
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
                  setForm((f) => ({ ...f, validFor: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
              >
                {validOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>

              <p className="mt-2 text-xs font-semibold text-slate-500">
                Süresi dolan paylaşım otomatik olarak akıştan kaldırılır.
              </p>
            </NetworkField>

            <NetworkField label="Görünürlük">
              <select
                value={form.visibility}
                onChange={(event) =>
                  setForm((f) => ({ ...f, visibility: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
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
                setForm((f) => ({ ...f, tags: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#1D4ED8]"
              placeholder="arsa, satılık, hazır müşteri"
            />
          </NetworkField>
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-200 p-5">
          <button
            onClick={onClose}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
          >
            Vazgeç
          </button>

          <button
            onClick={handleSubmit}
            className="h-12 rounded-2xl bg-[#1D4ED8] px-5 text-sm font-black text-white"
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
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-[26px] font-black leading-none text-[#0B1F44]">
        {value}
      </p>
      <p className="mt-2 text-xs font-bold text-slate-400">{note}</p>
    </div>
  );
}

function TimeLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[#1D4ED8]">{icon}</span>
      <span className="font-black text-slate-500">{label}:</span>
      <span className="font-bold text-slate-700">{value}</span>
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
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-bold text-slate-700"
    >
      <span className="text-[#1D4ED8]">{icon}</span>
      {label}
    </button>
  );
}