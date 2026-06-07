"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Clock3, MessageCircle, Search } from "lucide-react";

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

type Participant = {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};

type LastMessage = {
  id: string;
  body: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  post?: {
    id: string;
    title: string;
    type: string;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
  } | null;
  participants: Participant[];
  messages: LastMessage[];
};

function formatTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

function roleLabel(role?: string) {
  if (role === "EMLAKCI") return "Emlakçı";
  if (role === "MUTEAHHIT") return "Müteahhit";
  if (role === "INSAAT_FIRMASI") return "İnşaat";
  if (role === "SUPER_ADMIN") return "Yazılım Ekibi";
  if (role === "ADMIN") return "Admin";

  return "Üye";
}

function presenceDotClass(status?: PresenceStatus) {
  if (status === "online") return "bg-emerald-500";
  if (status === "away") return "bg-amber-400";
  return "bg-slate-300";
}

function cleanMessage(body?: string) {
  const text = String(body || "Henüz mesaj yok").trim();
  return text.replace(/^\[[^\]]+\]\s*/g, "").trim() || "Henüz mesaj yok";
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [presence, setPresence] = useState<PresenceResponse>({
    online: [],
    away: [],
    offline: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const presenceMap = useMemo(() => {
    const map = new Map<string, PresenceUser>();

    [...presence.online, ...presence.away, ...presence.offline].forEach((presenceUser) => {
      map.set(presenceUser.id, presenceUser);
    });

    return map;
  }, [presence]);

  const fetchConversations = async () => {
    try {
      if (!user?.id) return;

      const [conversationsRes, presenceRes] = await Promise.all([
        api.get(`/conversations?userId=${user.id}`),
        api.get("/visits/presence"),
      ]);

      setConversations(Array.isArray(conversationsRes.data) ? conversationsRes.data : []);

      setPresence({
        online: Array.isArray(presenceRes.data?.online) ? presenceRes.data.online : [],
        away: Array.isArray(presenceRes.data?.away) ? presenceRes.data.away : [],
        offline: Array.isArray(presenceRes.data?.offline) ? presenceRes.data.offline : [],
      });
    } catch (error) {
      console.error(error);
      alert("Mesaj kutusu yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    const interval = setInterval(() => {
      fetchConversations();
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const filteredConversations = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("tr-TR");

    if (!keyword) return conversations;

    return conversations.filter((conversation) => {
      const otherUser = conversation.participants.find((participant) => participant.user.id !== user?.id)?.user;

      return [
        conversation.title,
        conversation.post?.title,
        conversation.post?.city,
        conversation.post?.district,
        conversation.post?.neighborhood,
        otherUser?.firstName,
        otherUser?.lastName,
        conversation.messages?.[0]?.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(keyword);
    });
  }, [conversations, search, user?.id]);

  const unreadTotal = conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0);

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-[#F7FBFF] px-3 pb-4 pt-3 text-[#06194A]">
      <section className="mx-auto w-full max-w-[430px] space-y-2">
        <header className="rounded-[22px] border border-[#DDE7F3] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-left">
              <h1 className="text-[18px] font-black leading-none tracking-[-0.025em] text-[#06194A]">
                Görüşmeler
              </h1>
              <p className="mt-1 text-[11px] font-bold text-[#64748B]">
                Özel iş görüşmeleri ve forum bağlantıları.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <MiniStat label="Toplam" value={conversations.length} />
              <MiniStat label="Yeni" value={unreadTotal} accent />
            </div>
          </div>
        </header>

        <section className="rounded-[20px] border border-[#DDE7F3] bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 rounded-[16px] bg-[#F7FBFF] px-3 py-2">
            <Search size={15} className="text-[#94A3B8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-7 min-w-0 flex-1 bg-transparent text-[12px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
              placeholder="Kişi, konu veya bölge ara..."
            />
          </div>
        </section>

        <section className="rounded-[22px] border border-[#DDE7F3] bg-white p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          {loading ? (
            <div className="flex h-[260px] items-center justify-center text-[12px] font-black text-[#64748B]">
              Görüşmeler yükleniyor...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex h-[260px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#1557D6]">
                <MessageCircle size={24} />
              </div>
              <div className="text-[16px] font-black text-[#06194A]">Görüşme yok</div>
              <p className="mt-1 max-w-[280px] text-[12px] font-bold leading-5 text-[#64748B]">
                Forum veya Havuz üzerinden görüşme başladığında burada görünecek.
              </p>
            </div>
          ) : (
            <div className="grid gap-1.5">
              {filteredConversations.map((conversation) => {
                const otherParticipants = conversation.participants.filter(
                  (participant) => participant.user.id !== user?.id,
                );

                const otherUser = otherParticipants[0]?.user;
                const otherPresence = otherUser ? presenceMap.get(otherUser.id) : undefined;
                const presenceStatus = otherPresence?.status || "offline";
                const lastMessage = conversation.messages?.[0];

                const location = [conversation.post?.city, conversation.post?.district, conversation.post?.neighborhood]
                  .filter(Boolean)
                  .join(" / ");

                const displayName = otherUser
                  ? `${otherUser.firstName} ${otherUser.lastName}`.trim()
                  : conversation.title || "EPH Görüşmesi";

                return (
                  <button
                    key={conversation.id}
                    onClick={() => router.push(`/messages/${conversation.id}`)}
                    className="relative grid min-h-[72px] w-full grid-cols-[42px_1fr_auto] items-center gap-2 rounded-[18px] bg-[#F7FBFF] px-2.5 py-2 text-left transition active:scale-[0.99]"
                  >
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-white text-[14px] font-black text-[#1557D6] shadow-[0_8px_18px_rgba(15,23,42,0.045)]">
                      {otherUser?.firstName?.[0] || "E"}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${presenceDotClass(
                          presenceStatus,
                        )}`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="truncate text-[13px] font-black text-[#06194A]">
                          {displayName}
                        </h2>
                        {conversation.unreadCount ? (
                          <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-0.5 truncate text-[10px] font-bold text-[#64748B]">
                        {roleLabel(otherUser?.role)}{location ? ` • ${location}` : ""}
                      </p>

                      <p className="mt-1 truncate text-[11px] font-bold text-[#27364F]">
                        {cleanMessage(lastMessage?.body)}
                      </p>
                    </div>

                    <div className="flex h-full min-w-[44px] flex-col items-end justify-between gap-1 py-0.5 text-right">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-[#94A3B8]">
                        <Clock3 size={10} />
                        {formatTime(lastMessage?.createdAt || conversation.updatedAt)}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-[#64748B]">
                        Özel
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`min-h-[44px] min-w-[58px] rounded-[15px] px-2 py-1.5 text-center ${accent ? "bg-[#F4F0FF]" : "bg-[#F7FBFF]"}`}>
      <p className={`text-[15px] font-black leading-none ${accent ? "text-[#6D4AFF]" : "text-[#06194A]"}`}>
        {value}
      </p>
      <p className="mt-1 text-[9px] font-black text-[#64748B]">{label}</p>
    </div>
  );
}
