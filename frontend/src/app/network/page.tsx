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
  "Tümü",
  "Satılık",
  "Kiralık",
  "Portföy",
  "Ortak",
  "Proje",
  "Arsa",
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
    <EphAppShell title="Forum">
      <section className="mx-auto w-full max-w-[430px] space-y-3 px-3 pb-4 pt-3 text-[#06194A] lg:max-w-7xl">
        <section className="rounded-[26px] border border-[#DDE7F3] bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-left">
              <p className="inline-flex min-h-[26px] items-center rounded-full bg-[#EFF6FF] px-3 text-[11px] font-black text-[#1557D6]">
                Forum Merkezi
              </p>

              <h1 className="mt-2 text-[24px] font-black leading-none tracking-[-0.045em] text-[#06194A]">
                Sektörel Akış
              </h1>

              <p className="mt-1 max-w-[285px] text-[12px] font-bold leading-5 text-[#64748B]">
                Talepleri, portföyleri ve iş birliklerini tek ekranda takip edin.
              </p>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#1557D6] text-white shadow-[0_14px_28px_rgba(21,87,214,0.24)]"
              aria-label="Yeni paylaşım oluştur"
            >
              <Plus size={22} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <ForumStat label="Paylaşım" value={String(posts.length)} />
            <ForumStat label="Mesaj" value={String(conversationCount)} />
            <ForumStat label="Takip" value={String(followedPosts.length)} muted={followedPosts.length === 0} />
          </div>
        </section>

        <section className="grid grid-cols-4 gap-2">
          <ForumQuickCard icon={<Flame size={18} />} label="Sıcak" tone="orange" />
          <ForumQuickCard icon={<TrendingUp size={18} />} label="Trend" tone="blue" />
          <ForumQuickCard
            icon={<MessageCircle size={18} />}
            label={unreadCount > 0 ? `${unreadCount} Mesaj` : "Mesaj"}
            tone="purple"
            onClick={() => router.push("/messages")}
          />
          <ForumQuickCard
            icon={<Star size={18} />}
            label="Takip"
            tone="yellow"
            onClick={() => setShowFollowedOnly(true)}
          />
        </section>

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-2 rounded-[18px] bg-[#F7FBFF] px-3 py-2">
            <Search size={17} className="text-[#94A3B8]" />
            <input
              className="h-8 min-w-0 flex-1 bg-transparent text-center text-[13px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
              placeholder="Talep, portföy, bölge ara..."
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category, index) => (
              <button
                key={category}
                className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-black ${
                  index === 0
                    ? "bg-[#1557D6] text-white"
                    : "border border-[#DDE7F3] bg-white text-[#475569]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowFollowedOnly(false)}
              className={`min-h-[40px] rounded-[16px] text-[12px] font-black ${
                !showFollowedOnly
                  ? "bg-[#1557D6] text-white"
                  : "border border-[#DDE7F3] bg-white text-[#475569]"
              }`}
            >
              Tüm Akış
            </button>

            <button
              onClick={() => setShowFollowedOnly(true)}
              className={`min-h-[40px] rounded-[16px] text-[12px] font-black ${
                showFollowedOnly
                  ? "bg-[#1557D6] text-white"
                  : "border border-[#DDE7F3] bg-white text-[#475569]"
              }`}
            >
              Takip Ettiklerim{followedPosts.length > 0 ? ` (${followedPosts.length})` : ""}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <ForumColorBlock
            icon={<Building2 size={20} />}
            title="Portföy"
            desc="Yeni yetkili kayıtlar"
            color="#1557D6"
            bg="#EFF6FF"
          />
          <ForumColorBlock
            icon={<UsersRound size={20} />}
            title="İş Birliği"
            desc="Ortak satış fırsatları"
            color="#EA580C"
            bg="#FFF7ED"
          />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[18px] font-black tracking-[-0.035em] text-[#06194A]">
              Güncel Paylaşımlar
            </h2>

            <button
              onClick={() => setModalOpen(true)}
              className="text-[12px] font-black text-[#1557D6]"
            >
              Paylaşım Ekle
            </button>
          </div>

          {loading || (showFollowedOnly && followedLoading) ? (
            <div className="rounded-[24px] border border-[#DDE7F3] bg-white p-6 text-center text-[13px] font-bold text-[#64748B] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              {showFollowedOnly
                ? "Takip ettiğiniz paylaşımlar yükleniyor..."
                : "Forum akışı yükleniyor..."}
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#DDE7F3] bg-white p-6 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#1557D6]">
                {showFollowedOnly ? <Star size={24} /> : <Plus size={24} />}
              </div>
              <h2 className="mt-3 text-[16px] font-black text-[#06194A]">
                {showFollowedOnly ? "Takip edilen paylaşım yok" : "Henüz paylaşım yok"}
              </h2>
              <p className="mx-auto mt-1 max-w-[290px] text-[12px] font-bold leading-5 text-[#64748B]">
                {showFollowedOnly
                  ? "İlgilendiğiniz paylaşımları takibe aldığınızda burada görünür."
                  : "İlk talebi veya portföy fırsatını siz paylaşabilirsiniz."}
              </p>
              {showFollowedOnly && (
                <button
                  onClick={() => setShowFollowedOnly(false)}
                  className="mt-4 min-h-[38px] rounded-[16px] bg-[#1557D6] px-4 text-[12px] font-black text-white"
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

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <h2 className="text-center text-[18px] font-black tracking-[-0.035em] text-[#06194A]">
            Bildirimler
          </h2>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {!pushEnabled ? (
              <ForumActionButton
                icon={<Volume2 size={17} />}
                label={pushLoading ? "Açılıyor" : "Bildirim"}
                onClick={enablePushNotifications}
              />
            ) : (
              <ForumActionButton icon={<CheckCircle2 size={17} />} label="Açık" />
            )}

            {!soundEnabled ? (
              <ForumActionButton icon={<Volume2 size={17} />} label="Ses" onClick={enableSound} />
            ) : (
              <ForumActionButton icon={<Volume2 size={17} />} label="Ses Açık" />
            )}

            <ForumActionButton
              icon={<Settings size={17} />}
              label="Ayar"
              onClick={() => router.push("/notification-settings")}
            />
          </div>
        </section>
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
    <EphAppShell title="Forum">
      <section className="mx-auto max-w-7xl text-center">
        <div
          className={`relative overflow-hidden rounded-[42px] bg-gradient-to-br ${adminTheme.gradient} p-7 text-white shadow-2xl`}
        >
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100">
              Forum Admin Görünümü
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Ağ Aktif
            </span>
          </div>

          <h1 className="text-[42px] font-black leading-tight tracking-tight md:text-[64px]">
            EPH Forum
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
                Forum verileri yükleniyor...
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-[34px] border border-slate-200 bg-white p-10 text-center">
                <div className="text-lg font-black text-slate-900">
                  Henüz paylaşım yok
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Forum akışı boş durumda.
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

function ForumStat({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="min-h-[58px] rounded-[18px] bg-[#F7FBFF] px-2 py-2 text-center">
      <p className="text-[20px] font-black leading-none text-[#06194A]">{value}</p>
      <p className={`mt-1 text-[10px] font-black ${muted ? "text-[#94A3B8]" : "text-[#64748B]"}`}>
        {label}
      </p>
    </div>
  );
}

function ForumQuickCard({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone: "orange" | "blue" | "purple" | "yellow";
  onClick?: () => void;
}) {
  const styles = {
    orange: "bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]",
    blue: "bg-[#EFF6FF] text-[#1557D6] border-[#DBEAFE]",
    purple: "bg-[#F4F0FF] text-[#6D4AFF] border-[#DDD6FE]",
    yellow: "bg-[#FEFCE8] text-[#A16207] border-[#FEF3C7]",
  };

  return (
    <button
      onClick={onClick}
      className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-[20px] border px-1 ${styles[tone]}`}
    >
      {icon}
      <span className="text-[11px] font-black">{label}</span>
    </button>
  );
}

function ForumColorBlock({
  icon,
  title,
  desc,
  color,
  bg,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="min-h-[96px] rounded-[22px] border border-[#DDE7F3] p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.045)]"
      style={{ background: bg }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-white" style={{ color }}>
        {icon}
      </div>
      <h3 className="mt-2 text-[15px] font-black text-[#06194A]">{title}</h3>
      <p className="mt-0.5 text-[11px] font-bold leading-4 text-[#64748B]">{desc}</p>
    </div>
  );
}

function ForumActionButton({
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
      className="flex min-h-[48px] items-center justify-center gap-1 rounded-[17px] bg-[#F7FBFF] text-[11px] font-black text-[#1557D6]"
    >
      {icon}
      {label}
    </button>
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
  const location = [post.district, post.city].filter(Boolean).join(" / ") || "Konum yok";

  return (
    <article
      onClick={onOpenDetail}
      className="cursor-pointer rounded-[24px] border border-[#DDE7F3] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.055)] transition hover:border-[#1557D6]"
    >
      <div className="flex items-start gap-3">
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-[23px]"
          style={{ backgroundColor: theme.soft }}
        >
          {theme.emoji}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${presenceDotClass(
              presenceStatus,
            )}`}
          />
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-black text-[#06194A]">
                {authorName}
              </h3>
              <p className="mt-0.5 text-[11px] font-bold text-[#64748B]">
                {roleLabel(postUser?.role)} • {presenceLabel(presenceStatus)} • {relativeTime(post.createdAt)}
              </p>
            </div>

            <span
              className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black"
              style={{ color: isHotPost(post) ? "#EA580C" : theme.text, backgroundColor: isHotPost(post) ? "#FFF7ED" : theme.soft }}
            >
              {post.urgency || "Normal"}
            </span>
          </div>

          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: theme.primary }}>
            {post.type}
          </p>

          <h2 className="mt-1 line-clamp-2 text-[18px] font-black leading-[1.12] tracking-[-0.04em] text-[#06194A]">
            {post.title}
          </h2>

          {post.description && (
            <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-[#64748B]">
              {post.description}
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <SmallForumInfo label="Bölge" value={location} />
            <SmallForumInfo label="Bütçe" value={post.budget ? formatMoney(post.budget) : "Belirtilmedi"} />
          </div>

          {post.tags?.length > 0 && (
            <div className="mt-2 flex gap-1 overflow-hidden">
              {post.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="shrink-0 rounded-full bg-[#F7FBFF] px-2 py-1 text-[10px] font-black text-[#64748B]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onOpenDetail();
              }}
              className="min-h-[38px] rounded-[16px] border border-[#DDE7F3] bg-white text-[12px] font-black text-[#1557D6]"
            >
              Detay
            </button>
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
              className="min-h-[38px] rounded-[16px] bg-[#1557D6] text-[12px] font-black text-white disabled:bg-[#E2E8F0] disabled:text-[#94A3B8]"
            >
              {isOwnPost ? "Kendi Paylaşımın" : actions.primary}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SmallForumInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[#F7FBFF] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.08em] text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[12px] font-black text-[#27364F]">{value}</p>
    </div>
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
    <div className="mb-4 flex items-center gap-3 text-left">
      <div className="relative">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[17px] text-[21px] font-black"
          style={{
            backgroundColor: theme.soft,
            color: theme.primary,
            border: `1px solid ${theme.border}`,
          }}
        >
          {theme.emoji}
        </div>

        <span
          className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[2px] border-white ${presenceDotClass(
            presenceStatus,
          )}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-[14px] font-black text-[#06194A]">
            {authorName}
          </h3>
          <CheckCircle2 size={15} style={{ color: theme.primary }} />
        </div>
        <p className="mt-0.5 truncate text-[11px] font-bold text-[#64748B]">
          {roleLabel(postUser?.role)} • {presenceLabel(presenceStatus)} • {relativeTime(post.createdAt)}
        </p>
      </div>
    </div>
  );
}

function PostBody({ post, theme }: { post: NetworkPost; theme: RoleTheme }) {
  const location = [post.city, post.district].filter(Boolean).join(" / ");

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="rounded-full px-3 py-1 text-[10px] font-black"
          style={{ backgroundColor: theme.soft, color: theme.text }}
        >
          {post.type}
        </span>
        <span
          className="rounded-full px-3 py-1 text-[10px] font-black"
          style={{
            backgroundColor: isHotPost(post) ? "#FFF7ED" : "#F7FBFF",
            color: isHotPost(post) ? "#EA580C" : "#64748B",
          }}
        >
          {post.urgency || "Normal"}
        </span>
      </div>

      <h2 className="line-clamp-2 text-[17px] font-black leading-[1.15] tracking-[-0.035em] text-[#06194A]">
        {post.title}
      </h2>

      {post.description && (
        <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-[#64748B]">
          {post.description}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SmallForumInfo label="Bölge" value={location || "Konum yok"} />
        <SmallForumInfo label="Bütçe" value={post.budget ? formatMoney(post.budget) : "Belirtilmedi"} />
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
