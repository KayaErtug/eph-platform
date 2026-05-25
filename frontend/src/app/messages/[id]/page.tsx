"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { ArrowLeft, CheckCircle2, SendHorizonal } from "lucide-react";

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

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role?: string) {
  if (role === "EMLAKCI") return "Emlakçı";
  if (role === "MUTEAHHIT") return "Müteahhit";
  if (role === "INSAAT_FIRMASI") return "İnşaat Firması";
  if (role === "ADMIN") return "EPH Admin";
  return "EPH Üyesi";
}

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const conversationId = String(params.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 60);
  };

  useEffect(() => {
    const setHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--eph-chat-height", `${height}px`);
    };

    setHeight();

    window.visualViewport?.addEventListener("resize", setHeight);
    window.visualViewport?.addEventListener("scroll", setHeight);
    window.addEventListener("resize", setHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", setHeight);
      window.visualViewport?.removeEventListener("scroll", setHeight);
      window.removeEventListener("resize", setHeight);
    };
  }, []);

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

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const res = await api.get(`/conversations/${conversationId}/messages`);
      const incomingMessages = res.data || [];

      setMessages(incomingMessages);
      await markAsRead();
      scrollToBottom();
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!conversationId || !user?.id) return;

    fetchMessages();

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, user?.id]);

  useEffect(() => {
    scrollToBottom();
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
        body: message.trim(),
      });

      setMessage("");
      await fetchMessages(true);
      scrollToBottom();
    } catch (error) {
      console.error(error);
      alert("Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main
      className="fixed inset-0 z-[9999] overflow-hidden bg-[#ECE5DD]"
      style={{ height: "var(--eph-chat-height, 100dvh)" } as CSSProperties}
    >
      <section className="flex h-full flex-col overflow-hidden">
        <header className="flex h-[64px] shrink-0 items-center gap-3 bg-[#075E54] px-3 text-white shadow-md">
          <button
            onClick={() => router.push("/messages")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-white/10"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-base font-black">
            E
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-bold leading-tight">
              EPH Mesajlaşma
            </h1>
            <p className="truncate text-[12px] font-medium text-white/80">
              Yeni mesajlar otomatik yenilenir
            </p>
          </div>
        </header>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm font-bold text-slate-600">
              Mesajlar yükleniyor...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="rounded-2xl bg-white/80 px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
                Henüz mesaj yok.
              </div>
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {messages.map((item) => {
                const mine = item.sender.id === user?.id;

                return (
                  <div
                    key={item.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
                        mine
                          ? "rounded-br-md bg-[#DCF8C6] text-[#111827]"
                          : "rounded-bl-md bg-white text-[#111827]"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="truncate text-[12px] font-bold text-slate-700">
                          {item.sender.firstName} {item.sender.lastName}
                        </span>
                        <CheckCircle2 size={13} className="shrink-0 text-[#128C7E]" />
                        <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                          {roleLabel(item.sender.role)}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap break-words text-[15px] font-normal leading-[20px]">
                        {item.body}
                      </p>

                      <div className="mt-1 text-right text-[11px] font-semibold text-slate-400">
                        {formatTime(item.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="shrink-0 bg-[#ECE5DD] px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2">
          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onFocus={scrollToBottom}
              rows={1}
              placeholder="Mesaj"
              className="max-h-[96px] min-h-[44px] flex-1 resize-none rounded-[22px] border-0 bg-white px-4 py-3 text-[15px] leading-[20px] text-slate-900 shadow-sm outline-none"
            />

            <button
              disabled={sending || !message.trim()}
              onClick={sendMessage}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-white shadow-sm disabled:opacity-50"
            >
              <SendHorizonal size={21} />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}