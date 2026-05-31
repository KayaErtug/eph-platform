"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "firebase/messaging";
import EphAppShell from "@/components/EphAppShell";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { firebaseVapidKey, getFirebaseMessaging } from "@/lib/firebase";
import {
  BarChart3,
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
  Star,
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

type PresenceStatus = "online" | "away" | "offline";

type PresenceUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  profileImageUrl?: string | null;
  status: PresenceStatus;
  lastSeenAt?: string | null;
  lastPage?: string | null;
  minutesAgo?: number | null;
};

type PresenceResponse = {
  online: PresenceUser[];
  away: PresenceUser[];
  offline: PresenceUser[];
};

type NetworkPost = {
  id: string;
  userId?: string;
  user?: NetworkUser;
  User?: NetworkUser;
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

type FollowedPost = {
  id: string;
  followedAt: string;
  post: NetworkPost;
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

  if (normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN") {
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

  if (
    (viewer === "contractor" || viewer === "construction") &&
    owner === "realtor"
  ) {
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

  if (normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN") {
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

function getPostUser(post: NetworkPost) {
  return post.user || post.User;
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
  return getRoleTheme(role).label;
}

function presenceLabel(status?: PresenceStatus) {
  if (status === "online") return "Online";
  if (status === "away") return "Uzakta";
  return "Çevrimdışı";
}

function presenceDotClass(status?: PresenceStatus) {
  if (status === "online") return "bg-emerald-500";
  if (status === "away") return "bg-amber-400";
  return "bg-slate-400";
}

function presenceBadgeStyle(status: PresenceStatus, theme: RoleTheme) {
  if (status === "online") {
    return {
      backgroundColor: "#ECFDF5",
      color: "#047857",
      borderColor: "#A7F3D0",
    };
  }

  if (status === "away") {
    return {
      backgroundColor: "#FFFBEB",
      color: "#B45309",
      borderColor: "#FDE68A",
    };
  }

  return {
    backgroundColor: theme.soft,
    color: "#64748B",
    borderColor: theme.border,
  };
}

function isHotPost(post: NetworkPost) {
  const value = `${post.urgency || ""} ${post.title || ""}`.toLocaleLowerCase(
    "tr-TR",
  );

  return (
    value.includes("sıcak") ||
    value.includes("sicak") ||
    value.includes("acil") ||
    value.includes("hazır")
  );
}

export default function NetworkPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const currentUserTheme = getRoleTheme(user?.role);

  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [followedPosts, setFollowedPosts] = useState<FollowedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedLoading, setFollowedLoading] = useState(false);
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [presence, setPresence] = useState<PresenceResponse>({
    online: [],
    away: [],
    offline: [],
  });

  const lastUnreadRef = useRef(0);
  const firstUnreadCheckRef = useRef(true);

  const presenceMap = useMemo(() => {
    const map = new Map<string, PresenceUser>();

    [...presence.online, ...presence.away, ...presence.offline].forEach(
      (presenceUser) => {
        map.set(presenceUser.id, presenceUser);
      },
    );

    return map;
  }, [presence]);

  const getSoundFile = () =>
    localStorage.getItem("ephNotificationSoundFile") ||
    "/sounds/universfield-new-notification-043-493471.mp3";

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
        "/firebase-messaging-sw.js",
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

      alert("Bildirimler açıldı.");
    } catch (error) {
      console.error(error);
      alert("Bildirim izni alınamadı. Tarayıcı ayarlarını kontrol edin.");
    } finally {
      setPushLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await api.get("/network/posts");
      setPosts(res.data || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresence = async () => {
    try {
      const res = await api.get("/visits/presence");

      setPresence({
        online: Array.isArray(res.data?.online) ? res.data.online : [],
        away: Array.isArray(res.data?.away) ? res.data.away : [],
        offline: Array.isArray(res.data?.offline) ? res.data.offline : [],
      });
    } catch {
      setPresence({ online: [], away: [], offline: [] });
    }
  };

  const fetchFollowedPosts = async () => {
    if (!user?.id) {
      setFollowedPosts([]);
      return;
    }

    try {
      setFollowedLoading(true);

      const res = await api.get(`/network/posts/followed?userId=${user.id}`);
      setFollowedPosts(res.data || []);
    } catch {
      setFollowedPosts([]);
    } finally {
      setFollowedLoading(false);
    }
  };

  const fetchConversationStats = async () => {
    if (!user?.id) return;

    try {
      const res = await api.get(`/conversations?userId=${user.id}`);
      const conversations: Conversation[] = res.data || [];
      const totalUnread = conversations.reduce(
        (total, item) => total + (item.unreadCount || 0),
        0,
      );

      setConversationCount(conversations.length);

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
    fetchPresence();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    fetchFollowedPosts();

    firstUnreadCheckRef.current = true;
    lastUnreadRef.current = 0;

    fetchConversationStats();

    const statsInterval = setInterval(fetchConversationStats, 5000);
    const presenceInterval = setInterval(fetchPresence, 30000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(presenceInterval);
    };
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
      Boolean,
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
    await fetchFollowedPosts();
    setModalOpen(false);
  };

  const startConversation = async (
    post: NetworkPost,
    actionTitle: string,
    presetMessage: string,
  ) => {
    try {
      if (!user?.id) {
        alert("Lütfen tekrar giriş yapın.");
        router.push("/giris");
        return;
      }

      const postUser = getPostUser(post);
      const participantId = post.userId || postUser?.id;

      if (!participantId) {
        alert("Paylaşım sahibi bulunamadı.");
        return;
      }

      if (participantId === user.id) {
        alert("Bu paylaşım sana ait.");
        return;
      }

      const res = await api.post("/conversations/start", {
        creatorId: user.id,
        participantId,
        postId: post.id,
        title: normalizeActionTitle(actionTitle),
      });

      await fetchConversationStats();

      const search = new URLSearchParams({
        title: normalizeActionTitle(actionTitle),
        draft: presetMessage,
      });

      router.push(`/messages/${res.data.id}?${search.toString()}`);
    } catch {
      alert("Görüşme başlatılamadı.");
    }
  };

  const displayPosts = showFollowedOnly
    ? followedPosts.map((item) => item.post)
    : posts;

  if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
    return (
      <AdminNetworkCommandGrid
        posts={posts}
        loading={loading}
        conversationCount={conversationCount}
        unreadCount={unreadCount}
        pushEnabled={pushEnabled}
        pushLoading={pushLoading}
        soundEnabled={soundEnabled}
        onOpenMessages={() => router.push("/messages")}
        onOpenSettings={() => router.push("/notification-settings")}
        onEnablePush={enablePushNotifications}
        onEnableSound={enableSound}
        onRefresh={fetchPosts}
        presenceMap={presenceMap}
      />
    );
  }

  return (
    <EphAppShell title="Pazaryeri">
      <section className="mx-auto grid max-w-7xl gap-5 text-center lg:grid-cols-[280px_1fr_320px]">
        <aside className="space-y-5">
          <div
            className={`overflow-hidden rounded-[30px] bg-gradient-to-br ${currentUserTheme.gradient} p-5 text-white shadow-2xl`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 text-3xl backdrop-blur">
                {currentUserTheme.emoji}
              </div>

              <div className="mt-3">
                <h2 className="text-lg font-black">
                  {user?.firstName} {user?.lastName}
                </h2>

                <p className="mt-1 text-sm text-white/80">
                  {roleLabel(user?.role)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStat label="Paylaşım" value={String(posts.length)} />
              <MiniStat label="Takip" value={String(followedPosts.length)} />
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center text-sm font-black transition-all"
                  style={
                    index === 0
                      ? {
                          backgroundColor: currentUserTheme.primary,
                          color: "#FFFFFF",
                        }
                      : {
                          color: "#475569",
                        }
                  }
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
                className="w-full bg-transparent text-center text-sm font-semibold outline-none placeholder:text-center"
                placeholder="Talep, portföy, bölge veya kullanıcı ara..."
              />
            </div>

            <div className="mb-5 flex justify-center gap-2 overflow-x-auto pb-2">
              {filters.map((filter, index) => (
                <button
                  key={filter}
                  className="shrink-0 rounded-full px-4 py-2 text-xs font-black"
                  style={
                    index === 0
                      ? {
                          backgroundColor: currentUserTheme.primary,
                          color: "#FFFFFF",
                        }
                      : {
                          border: "1px solid #E2E8F0",
                          backgroundColor: "#FFFFFF",
                          color: "#475569",
                        }
                  }
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <button
                onClick={() => setShowFollowedOnly(false)}
                className="flex h-13 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition"
                style={
                  !showFollowedOnly
                    ? {
                        borderColor: currentUserTheme.primary,
                        backgroundColor: currentUserTheme.primary,
                        color: "#FFFFFF",
                      }
                    : {
                        borderColor: currentUserTheme.border,
                        backgroundColor: "#FFFFFF",
                        color: currentUserTheme.text,
                      }
                }
              >
                <Sparkles size={18} />
                Tüm Akış
              </button>

              <button
                onClick={() => setShowFollowedOnly(true)}
                className="relative flex h-13 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition"
                style={
                  showFollowedOnly
                    ? {
                        borderColor: currentUserTheme.primary,
                        backgroundColor: currentUserTheme.primary,
                        color: "#FFFFFF",
                      }
                    : {
                        borderColor: currentUserTheme.border,
                        backgroundColor: "#FFFFFF",
                        color: currentUserTheme.text,
                      }
                }
              >
                <Star size={18} />
                Takip Ettiklerim
                {followedPosts.length > 0 && (
                  <span
                    className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-black"
                    style={
                      showFollowedOnly
                        ? {
                            backgroundColor: "#FFFFFF",
                            color: currentUserTheme.primary,
                          }
                        : {
                            backgroundColor: currentUserTheme.soft,
                            color: currentUserTheme.text,
                          }
                    }
                  >
                    {followedPosts.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${currentUserTheme.gradient} text-sm font-black text-white shadow-xl`}
            >
              <Plus size={20} />
              Yeni Paylaşım Oluştur
            </button>
          </div>

          {loading || (showFollowedOnly && followedLoading) ? (
            <div className="rounded-[30px] bg-white p-10 text-center font-bold text-slate-500">
              {showFollowedOnly
                ? "Takip ettiğin paylaşımlar yükleniyor..."
                : "Pazaryeri yükleniyor..."}
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="rounded-[30px] bg-white p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                {showFollowedOnly ? <Star size={28} /> : <Plus size={28} />}
              </div>

              <div className="text-lg font-black text-[#0F172A]">
                {showFollowedOnly
                  ? "Henüz takip ettiğin paylaşım yok"
                  : "Henüz paylaşım yok"}
              </div>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {showFollowedOnly
                  ? "İlgini çeken ilanların detayına girip Takibe Al butonuna basınca burada görünür."
                  : "İlk talebi veya portföy fırsatını sen paylaşabilirsin."}
              </p>

              {showFollowedOnly && (
                <button
                  onClick={() => setShowFollowedOnly(false)}
                  className="mt-5 rounded-2xl px-5 py-3 text-sm font-black text-white"
                  style={{ backgroundColor: currentUserTheme.primary }}
                >
                  Tüm Akışa Dön
                </button>
              )}
            </div>
          ) : (
            displayPosts.map((post) => (
              <PremiumPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                currentUserRole={user?.role}
                onOpenDetail={() => router.push(`/network/${post.id}`)}
                onStartConversation={(actionTitle, presetMessage) =>
                  startConversation(post, actionTitle, presetMessage)
                }
                presenceMap={presenceMap}
              />
            ))
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-white bg-white p-5 text-center shadow-sm">
            <div className="mb-3 flex justify-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-3xl"
                style={{
                  backgroundColor: currentUserTheme.soft,
                  color: currentUserTheme.primary,
                }}
              >
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
              <QuickLink
                icon={<Flame size={18} />}
                label="Sıcak Talepler"
                theme={currentUserTheme}
              />
              <QuickLink
                icon={<TrendingUp size={18} />}
                label="Trend Paylaşımlar"
                theme={currentUserTheme}
              />
              <QuickLink
                icon={<MessageCircle size={18} />}
                label="Mesajlar"
                theme={currentUserTheme}
                onClick={() => router.push("/messages")}
              />
              <QuickLink
                icon={<Star size={18} />}
                label={`Takip Ettiklerim (${followedPosts.length})`}
                theme={currentUserTheme}
                onClick={() => setShowFollowedOnly(true)}
              />
            </div>
          </div>

          <div className="rounded-[30px] border border-white bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-center text-lg font-black text-[#0F172A]">
              Bildirimler
            </h2>

            <div className="space-y-3">
              {!pushEnabled && (
                <button
                  onClick={enablePushNotifications}
                  disabled={pushLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-white disabled:opacity-60"
                  style={{ backgroundColor: currentUserTheme.primary }}
                >
                  <Volume2 size={18} />
                  {pushLoading ? "Açılıyor..." : "Bildirimleri Aç"}
                </button>
              )}

              {!soundEnabled && (
                <button
                  onClick={enableSound}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-white"
                >
                  <Volume2 size={18} />
                  Sesi Aç
                </button>
              )}

              <button
                onClick={() => router.push("/messages")}
                className="relative flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-white shadow-lg"
                style={{ backgroundColor: currentUserTheme.primary }}
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
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border bg-white text-sm font-black"
                style={{
                  borderColor: currentUserTheme.border,
                  color: currentUserTheme.text,
                }}
              >
                <Settings size={18} />
                Ayarlar
              </button>
            </div>
          </div>
        </aside>
      </section>

      {modalOpen && (
        <CreatePostModal
          onClose={() => setModalOpen(false)}
          onCreate={handleCreatePost}
          theme={currentUserTheme}
        />
      )}
    </EphAppShell>
  );
}

function AdminNetworkCommandGrid({
  posts,
  loading,
  conversationCount,
  unreadCount,
  pushEnabled,
  pushLoading,
  soundEnabled,
  onOpenMessages,
  onOpenSettings,
  onEnablePush,
  onEnableSound,
  onRefresh,
  presenceMap,
}: {
  posts: NetworkPost[];
  loading: boolean;
  conversationCount: number;
  unreadCount: number;
  pushEnabled: boolean;
  pushLoading: boolean;
  soundEnabled: boolean;
  onOpenMessages: () => void;
  onOpenSettings: () => void;
  onEnablePush: () => void;
  onEnableSound: () => void;
  onRefresh: () => void;
  presenceMap: Map<string, PresenceUser>;
}) {
  const hotPosts = posts.filter(isHotPost);
  const adminTheme = getRoleTheme("ADMIN");

  const todayCount = posts.filter(
    (post) =>
      post.createdAt &&
      new Date(post.createdAt).toDateString() === new Date().toDateString(),
  ).length;

  return (
    <EphAppShell title="Pazaryeri">
      <section className="mx-auto max-w-7xl text-center">
        <div
          className={`relative overflow-hidden rounded-[42px] bg-gradient-to-br ${adminTheme.gradient} p-7 text-white shadow-2xl`}
        >
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100">
              Pazaryeri Admin Görünümü
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Ağ Aktif
            </span>
          </div>

          <h1 className="text-[42px] font-black leading-tight tracking-tight md:text-[64px]">
            EPH Pazaryeri
            <span className="block bg-gradient-to-r from-[#F7DFA3] via-cyan-100 to-white bg-clip-text text-transparent">
              Komuta Ekranı
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
            Platformdaki talepler, portföy hareketleri ve mesajlaşma trafiği tek
            ekrandan izlenir.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            <AdminNetworkMetric
              label="Toplam Akış"
              value={posts.length}
              tone="cyan"
            />
            <AdminNetworkMetric
              label="Sıcak Sinyal"
              value={hotPosts.length}
              tone="gold"
            />
            <AdminNetworkMetric label="Bugün" value={todayCount} tone="blue" />
            <AdminNetworkMetric
              label="Mesaj Odası"
              value={conversationCount}
              tone="emerald"
            />
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={onRefresh}
              className="rounded-2xl bg-[#C9A84C] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-[#061126]"
            >
              Verileri Yenile
            </button>

            <button
              onClick={onOpenMessages}
              className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-cyan-100"
            >
              Mesaj Trafiği
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-5">
            <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Grid Filtreleri
              </p>

              <div className="mt-4 space-y-2">
                {categories.map((category, index) => (
                  <button
                    key={category}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center text-sm font-black transition"
                    style={
                      index === 0
                        ? {
                            borderColor: adminTheme.border,
                            backgroundColor: adminTheme.primary,
                            color: "#FFFFFF",
                          }
                        : {
                            borderColor: "#E2E8F0",
                            backgroundColor: "#FFFFFF",
                            color: "#475569",
                          }
                    }
                  >
                    {category}
                    {index === 0 && <Sparkles size={16} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[34px] border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Bildirim Kontrolü
              </p>

              <div className="mt-4 space-y-3">
                {!pushEnabled && (
                  <button
                    onClick={onEnablePush}
                    disabled={pushLoading}
                    className="w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white disabled:opacity-60"
                    style={{ backgroundColor: adminTheme.primary }}
                  >
                    {pushLoading ? "Açılıyor" : "Bildirimleri Aç"}
                  </button>
                )}

                {!soundEnabled && (
                  <button
                    onClick={onEnableSound}
                    className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-700"
                  >
                    Sesi Aç
                  </button>
                )}

                <button
                  onClick={onOpenSettings}
                  className="w-full rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.14em]"
                  style={{
                    borderColor: adminTheme.border,
                    color: adminTheme.text,
                    backgroundColor: adminTheme.soft,
                  }}
                >
                  Bildirim Ayarları
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            {loading ? (
              <div className="rounded-[34px] border border-slate-200 bg-white p-10 text-center text-sm font-black text-slate-500">
                Pazaryeri verileri yükleniyor...
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-[34px] border border-slate-200 bg-white p-10 text-center">
                <div className="text-lg font-black text-slate-900">
                  Henüz paylaşım yok
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Pazaryeri akışı boş durumda.
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <AdminNetworkPostCard
                  key={post.id}
                  post={post}
                  presenceMap={presenceMap}
                />
              ))
            )}
          </section>
        </div>
      </section>
    </EphAppShell>
  );
}

function AdminNetworkMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cyan" | "gold" | "blue" | "emerald";
}) {
  const cls =
    tone === "gold"
      ? "from-[#C9A84C] to-amber-300 text-[#061126]"
      : tone === "emerald"
        ? "from-emerald-300 to-teal-400 text-[#061126]"
        : tone === "blue"
          ? "from-blue-300 to-indigo-500 text-white"
          : "from-cyan-300 to-blue-400 text-[#061126]";

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-3 inline-flex rounded-2xl bg-gradient-to-r px-4 py-2 text-2xl font-black ${cls}`}
      >
        {value}
      </p>
    </div>
  );
}

function AdminNetworkPostCard({
  post,
  presenceMap,
}: {
  post: NetworkPost;
  presenceMap: Map<string, PresenceUser>;
}) {
  const postUser = getPostUser(post);
  const authorName = postUser
    ? `${postUser.firstName} ${postUser.lastName}`
    : "EPH Üyesi";
  const theme = getRoleTheme(postUser?.role);
  const presenceStatus = postUser?.id
    ? presenceMap.get(postUser.id)?.status || "offline"
    : "offline";

  return (
    <article
      className="overflow-hidden rounded-[34px] border bg-white shadow-sm"
      style={{ borderColor: theme.border }}
    >
      <div className={`h-2 bg-gradient-to-r ${theme.gradient}`} />

      <div className="p-6">
        <PostHeader
          post={post}
          authorName={authorName}
          theme={theme}
          presenceStatus={presenceStatus}
        />

        <PostBody post={post} theme={theme} />
      </div>
    </article>
  );
}

function PremiumPostCard({
  post,
  currentUserId,
  currentUserRole,
  onOpenDetail,
  onStartConversation,
  presenceMap,
}: {
  post: NetworkPost;
  currentUserId?: string;
  currentUserRole?: string | null;
  onOpenDetail: () => void;
  onStartConversation: (actionTitle: string, presetMessage: string) => void;
  presenceMap: Map<string, PresenceUser>;
}) {
  const postUser = getPostUser(post);
  const authorName = postUser
    ? `${postUser.firstName} ${postUser.lastName}`
    : "EPH Üyesi";

  const theme = getRoleTheme(postUser?.role);
  const presenceStatus = postUser?.id
    ? presenceMap.get(postUser.id)?.status || "offline"
    : "offline";
  const ownerId = post.userId || postUser?.id;
  const isOwnPost = ownerId === currentUserId;
  const actions = getMarketplaceActions(currentUserRole, postUser?.role);

  return (
    <article
      onClick={onOpenDetail}
      className="group cursor-pointer overflow-hidden rounded-[32px] border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl"
      style={{
        borderColor: theme.border,
        boxShadow: `0 18px 40px ${theme.primary}12`,
      }}
    >
      <div className={`h-2 bg-gradient-to-r ${theme.gradient}`} />

      <div className="p-6">
        <PostHeader
          post={post}
          authorName={authorName}
          theme={theme}
          presenceStatus={presenceStatus}
        />

        <PostBody post={post} theme={theme} />

        <div
          className="mt-6 rounded-[24px] border p-4 text-center"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.soft,
          }}
        >
          <p
            className="text-xs font-black leading-5"
            style={{ color: theme.text }}
          >
            {isOwnPost
              ? "Bu paylaşım sana ait. Detay sayfasından yayını takip edebilir veya güncelleyebilirsin."
              : actions.note}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <button
              onClick={(event) => {
                event.stopPropagation();

                if (!isOwnPost) {
                  onStartConversation(
                    actions.primary,
                    createPresetMessage(actions.primary, post.title),
                  );
                }
              }}
              disabled={isOwnPost}
              className="rounded-2xl py-3 text-sm font-black transition-all"
              style={
                isOwnPost
                  ? {
                      backgroundColor: "#F1F5F9",
                      color: "#94A3B8",
                    }
                  : {
                      backgroundColor: theme.primary,
                      color: "#FFFFFF",
                    }
              }
            >
              {isOwnPost ? "Kendi Paylaşımın" : actions.primary}
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();

                if (isOwnPost) {
                  onOpenDetail();
                  return;
                }

                onStartConversation(
                  actions.secondary,
                  createPresetMessage(actions.secondary, post.title),
                );
              }}
              className="rounded-2xl border py-3 text-sm font-black"
              style={{
                borderColor: theme.border,
                backgroundColor: "#FFFFFF",
                color: theme.text,
              }}
            >
              {isOwnPost ? "Güncelle" : actions.secondary}
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();

                if (isOwnPost) {
                  onOpenDetail();
                  return;
                }

                onStartConversation(
                  actions.tertiary,
                  createPresetMessage(actions.tertiary, post.title),
                );
              }}
              className={`rounded-2xl bg-gradient-to-r ${theme.gradient} py-3 text-sm font-black text-white shadow-lg`}
            >
              {isOwnPost ? "Gelen Talepler" : actions.tertiary}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-center text-xs font-bold text-slate-400 md:grid-cols-2">
          <span>Yayın: {formatDateTime(post.createdAt)}</span>
          <span>Bitiş: {formatDateTime(post.expiresAt)}</span>
        </div>
      </div>
    </article>
  );
}

function PostHeader({
  post,
  authorName,
  theme,
  presenceStatus,
}: {
  post: NetworkPost;
  authorName: string;
  theme: RoleTheme;
  presenceStatus: PresenceStatus;
}) {
  const postUser = getPostUser(post);

  return (
    <div className="mb-5 flex flex-col items-center justify-center text-center">
      <div className="relative">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-3xl text-3xl font-black shadow-xl"
          style={{
            backgroundColor: theme.soft,
            color: theme.primary,
            border: `1px solid ${theme.border}`,
          }}
        >
          {theme.emoji}
        </div>

        <span
          className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-white ${presenceDotClass(
            presenceStatus,
          )}`}
        />
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h3 className="text-[16px] font-black text-[#0F172A]">
            {authorName}
          </h3>

          <CheckCircle2 size={18} style={{ color: theme.primary }} />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <p
            className="inline-flex rounded-full px-4 py-1.5 text-xs font-black"
            style={{ backgroundColor: theme.soft, color: theme.text }}
          >
            {roleLabel(postUser?.role)}
          </p>

          <p
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black"
            style={presenceBadgeStyle(presenceStatus, theme)}
          >
            <span
              className={`h-2 w-2 rounded-full ${presenceDotClass(presenceStatus)}`}
            />
            {presenceLabel(presenceStatus)}
          </p>
        </div>

        <p className="mt-2 text-xs font-bold text-slate-400">
          {relativeTime(post.createdAt)}
        </p>
      </div>

      <span
        className="mt-4 rounded-full px-4 py-2 text-xs font-black"
        style={{
          backgroundColor: isHotPost(post) ? "#FEF2F2" : theme.soft,
          color: isHotPost(post) ? "#DC2626" : theme.text,
        }}
      >
        🔥 {post.urgency || "Normal"}
      </span>
    </div>
  );
}

function PostBody({ post, theme }: { post: NetworkPost; theme: RoleTheme }) {
  return (
    <>
      <div className="mb-4 flex justify-center">
        <div
          className="inline-flex rounded-full px-4 py-2 text-xs font-black"
          style={{ backgroundColor: theme.soft, color: theme.text }}
        >
          {post.type}
        </div>
      </div>

      <h2
        className="text-center text-[26px] font-black leading-tight"
        style={{ color: theme.text }}
      >
        {post.title}
      </h2>

      <p className="mt-4 text-center text-[15px] leading-8 text-slate-600">
        {post.description}
      </p>

      {post.budget && (
        <div className="mt-5 flex justify-center">
          <div
            className="inline-flex rounded-2xl px-4 py-3 text-sm font-black"
            style={{ backgroundColor: theme.soft, color: theme.text }}
          >
            💰 {formatMoney(post.budget)}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {post.city && (
          <span
            className="rounded-full px-3 py-2 text-xs font-black"
            style={{ backgroundColor: theme.soft, color: theme.text }}
          >
            {post.city}
            {post.district ? ` / ${post.district}` : ""}
          </span>
        )}

        {post.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full px-3 py-2 text-xs font-bold"
            style={{ backgroundColor: "#F1F5F9", color: "#475569" }}
          >
            #{tag}
          </span>
        ))}
      </div>
    </>
  );
}

function CreatePostModal({
  onClose,
  onCreate,
  theme,
}: {
  onClose: () => void;
  onCreate: (form: CreatePostForm) => void;
  theme: RoleTheme;
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
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 p-4 backdrop-blur">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[32px] bg-white">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div className="flex-1 text-center">
            <h2
              className="text-[28px] font-black"
              style={{ color: theme.text }}
            >
              Yeni Paylaşım
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Ağ içerisinde paylaşım oluştur
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: theme.soft, color: theme.text }}
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
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
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
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
              placeholder="Örn: Akkonak’ta 3+1 satılık daire aranıyor"
            />
          </NetworkField>

          <NetworkField label="Açıklama">
            <textarea
              value={form.desc}
              onChange={(event) =>
                setForm((current) => ({ ...current, desc: event.target.value }))
              }
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm font-semibold leading-6 outline-none"
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
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
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-bold outline-none"
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
            className={`h-12 rounded-2xl bg-gradient-to-r ${theme.gradient} px-5 text-sm font-black text-white shadow-xl`}
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
      <p className="text-xs font-bold text-white/75">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  theme,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  theme: RoleTheme;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-center text-sm font-black transition-all hover:bg-slate-100"
      style={{
        borderColor: theme.border,
        backgroundColor: theme.soft,
        color: theme.text,
      }}
    >
      <span style={{ color: theme.primary }}>{icon}</span>
      {label}
    </button>
  );
}
