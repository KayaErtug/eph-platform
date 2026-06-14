"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { ArrowLeft, CheckCheck, LockKeyhole, SendHorizonal } from "lucide-react";

type PresenceStatus = "online" | "away" | "offline";

type PresenceUser = {
  id: string;
  fullName?: string | null;
  status: PresenceStatus;
};

type PresenceResponse = {
  online: PresenceUser[];
  away: PresenceUser[];
  offline: PresenceUser[];
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};

type ConversationDetail = {
  id: string;
  title: string;
  postId?: string | null;
  post?: {
    id: string;
    title: string;
  } | null;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function presenceLabel(status?: PresenceStatus) {
  if (status === "online") return "Online";
  if (status === "away") return "Uzakta";
  return "Çevrimdışı";
}

function presenceDotClass(status?: PresenceStatus) {
  if (status === "online") return "bg-emerald-500";
  if (status === "away") return "bg-amber-400";
  return "bg-slate-300";
}

function cleanMessage(body: string) {
  return String(body || "").replace(/^\[[^\]]+\]\s*/g, "").trim();
}

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const conversationId = String(params.id);

  const draftTitle = searchParams.get("title") || "";
  const draftBody = searchParams.get("draft") || "";

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [presence, setPresence] = useState<PresenceResponse>({
    online: [],
    away: [],
    offline: [],
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);
  const draftAppliedRef = useRef(false);

  const visibleMessages = messages;
  const lockedTitle = conversation?.title || draftTitle || "EPH Görüşmesi";

  const presenceMap = useMemo(() => {
    const map = new Map<string, PresenceUser>();

    [...presence.online, ...presence.away, ...presence.offline].forEach((presenceUser) => {
      map.set(presenceUser.id, presenceUser);
    });

    return map;
  }, [presence]);

  const otherSender = useMemo(() => {
    return messages.find((item) => item.sender.id !== user?.id)?.sender || null;
  }, [messages, user?.id]);

  const otherPresence = otherSender ? presenceMap.get(otherSender.id) : null;
  const otherPresenceStatus = otherPresence?.status || "offline";

  const getSoundFile = () => {
    return localStorage.getItem("ephNotificationSoundFile") || "/sounds/universfield-new-notification-043-493471.mp3";
  };

  const playCustomSound = () => {
    const soundMode = localStorage.getItem("ephNotificationSound") || "notification";

    if (!soundEnabled) return;
    if (soundMode === "off") return;

    const audio = new Audio(getSoundFile());
    audio.volume = 0.75;
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
      alert("iPhone sesi engelledi. Lütfen butona tekrar dokunun.");
    }
  };

  const scrollBottom = (delay = 180) => {
    setTimeout(() => {
      const el = listRef.current;

      if (!el) return;

      el.scrollTop = el.scrollHeight;
    }, delay);
  };

  const markAsRead = async () => {
    if (!user?.id || !conversationId) return;

    try {
      await api.post(`/conversations/${conversationId}/read`, {
        userId: user.id,
      });
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
    }
  };

  const fetchConversation = async () => {
    try {
      const res = await api.get(`/conversations/${conversationId}`);
      setConversation(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const res = await api.get(`/conversations/${conversationId}/messages`);
      const incomingMessages: Message[] = res.data || [];

      const lastMessage = incomingMessages[incomingMessages.length - 1];
      const previousLastMessageId = previousLastMessageIdRef.current;

      if (
        !firstLoadRef.current &&
        lastMessage &&
        previousLastMessageId &&
        lastMessage.id !== previousLastMessageId &&
        lastMessage.sender.id !== user?.id
      ) {
        playCustomSound();
      }

      previousLastMessageIdRef.current = lastMessage?.id || null;
      firstLoadRef.current = false;

      setMessages(incomingMessages);

      await markAsRead();

      scrollBottom(silent ? 90 : 180);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setSoundEnabled(localStorage.getItem("ephSoundEnabled") === "true");
  }, []);

  useEffect(() => {
    if (!conversationId || !user?.id) return;

    fetchConversation();
    fetchMessages();
    fetchPresence();

    const interval = setInterval(() => {
      fetchMessages(true);
      fetchPresence();
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, user?.id, soundEnabled]);

  useEffect(() => {
    if (draftAppliedRef.current) return;
    if (!draftBody.trim()) return;
    if (message.trim()) return;

    setMessage(draftBody);
    draftAppliedRef.current = true;
    scrollBottom(180);
  }, [draftBody, message]);

  useEffect(() => {
    scrollBottom(180);
  }, [messages.length]);

  const sendMessage = async () => {
    try {
      if (!message.trim()) return;

      if (!user?.id) {
        alert("Lütfen tekrar giriş yapın.");
        return;
      }

      setSending(true);

      await api.post(`/conversations/${conversationId}/messages`, {
        senderId: user.id,
        body: `[${lockedTitle}]\n\n${message.trim()}`,
      });

      setMessage("");

      await fetchMessages(true);
      scrollBottom(90);
    } catch (error) {
      console.error(error);
      alert("Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  const displayName = otherSender ? `${otherSender.firstName} ${otherSender.lastName}`.trim() : "EPH Mesajlaşma";

  return (
    <main className="fixed inset-x-0 top-[64px] bottom-0 z-[82] bg-[#F7FBFF] text-[#06194A]">
      <section
  className="mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden border-x border-[#DDE7F3] bg-[#F7FBFF]"
  style={{
    minHeight: "100dvh",
  }}
>
        <header className="shrink-0 border-b border-[#DDE7F3] bg-white px-2.5 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/havuz")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F7FBFF] text-[#06194A]"
              aria-label="Mesajlara dön"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#EFF6FF] text-[14px] font-black text-[#1557D6]">
              {otherSender?.firstName?.[0] || "E"}
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${presenceDotClass(
                  otherPresenceStatus,
                )}`}
              />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <h1 className="truncate text-[14px] font-black text-[#06194A]">{displayName}</h1>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-[#64748B]">
                <span>{presenceLabel(otherPresenceStatus)}</span>
                <span>•</span>
                <LockKeyhole size={11} />
                <span className="truncate">{lockedTitle}</span>
              </div>
            </div>
          </div>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-[#F7FBFF] px-2.5 py-2">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[12px] font-black text-[#64748B]">
              Mesajlar yükleniyor...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="rounded-[20px] bg-white px-5 py-4 text-[12px] font-bold text-[#64748B] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                Henüz mesaj yok.
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 pb-2">
              {visibleMessages.map((item, index) => {
                const mine = item.sender.id === user?.id;
                const previous = visibleMessages[index - 1];
                const sameSenderAsPrevious = previous?.sender.id === item.sender.id;
                const body = cleanMessage(item.body);

                return (
                  <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] rounded-[17px] px-2.5 py-1.5 shadow-[0_6px_14px_rgba(15,23,42,0.045)] ${
                        mine
                          ? "rounded-br-[6px] bg-[#1557D6] text-white"
                          : "rounded-bl-[6px] bg-white text-[#27364F]"
                      }`}
                    >
                      {!mine && !sameSenderAsPrevious && (
                        <p className="mb-0.5 text-[10px] font-black text-[#1557D6]">
                          {item.sender.firstName} {item.sender.lastName}
                        </p>
                      )}

                      <p className="whitespace-pre-wrap break-words text-[12.5px] font-semibold leading-[18px]">
                        {body}
                      </p>

                      <div
                        className={`mt-0.5 flex items-center justify-end gap-1 text-[9px] font-bold ${
                          mine ? "text-blue-100" : "text-[#94A3B8]"
                        }`}
                      >
                        {formatTime(item.createdAt)}
                        {mine && <CheckCheck size={12} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer
  className="shrink-0 border-t border-[#DDE7F3] bg-white px-1.5 py-2"
  style={{
    paddingBottom: "max(12px, env(safe-area-inset-bottom))",
  }}
>
          <div className="flex w-full items-end gap-1.5">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onFocus={() => scrollBottom(180)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="Mesaj yaz..."
              style={{ fontSize: "16px" }}
              className="max-h-[120px] min-h-[50px] w-full min-w-0 flex-1 resize-none rounded-[18px] bg-[#F7FBFF] px-4 py-3 text-[14px] font-semibold leading-[20px] text-[#06194A] outline-none placeholder:text-[#94A3B8]"
            />

            <button
              disabled={sending || !message.trim()}
              onClick={sendMessage}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[16px] bg-[#1557D6] text-white shadow-[0_10px_20px_rgba(21,87,214,0.22)] disabled:opacity-45"
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
