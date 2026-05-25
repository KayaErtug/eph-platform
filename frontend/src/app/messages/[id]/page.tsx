"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  ArrowLeft,
  CheckCheck,
  Inbox,
  Mic,
  Paperclip,
  SendHorizonal,
  Smile,
} from "lucide-react";

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

  const scrollBottom = (delay = 320) => {
    setTimeout(() => {
      const el = listRef.current;

      if (!el) return;

      el.scrollTop = el.scrollHeight;
    }, delay);
  };

  const isNearBottom = () => {
    const el = listRef.current;

    if (!el) return true;

    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
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

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const shouldKeepAtBottom = !silent || isNearBottom();

      const res = await api.get(`/conversations/${conversationId}/messages`);
      const incomingMessages = res.data || [];

      setMessages(incomingMessages);

      await markAsRead();

      if (shouldKeepAtBottom) {
        scrollBottom(silent ? 120 : 320);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
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
    scrollBottom(320);
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

      scrollBottom(120);
    } catch (error) {
      console.error(error);
      alert("Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#EAF1FF]">
      <section className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-[#EAF1FF]">
        <header className="shrink-0 bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-3 py-3 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/messages")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <ArrowLeft size={23} />
            </button>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-black">
              E
            </div>

            <div className="min-w-0 flex-1 text-center">
              <h1 className="truncate text-[17px] font-black leading-tight">
                EPH Mesajlaşma
              </h1>

              <p className="truncate text-[12px] font-medium text-blue-100">
                Yeni mesajlar otomatik yenilenir
              </p>
            </div>

            <button
              onClick={() => router.push("/messages")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <Inbox size={20} />
            </button>
          </div>
        </header>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto bg-[#EDF4FF] px-3 py-3"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm">
                Mesajlar yükleniyor...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
                Henüz mesaj yok.
              </div>
            </div>
          ) : (
            <div className="space-y-2 pb-3">
              {messages.map((item) => {
                const mine = item.sender.id === user?.id;

                return (
                  <div
                    key={item.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[84%] rounded-2xl px-3 py-2 shadow-sm ${
                        mine
                          ? "rounded-br-md bg-[#1D4ED8] text-white"
                          : "rounded-bl-md bg-white text-slate-800"
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[12px] font-black">
                          {item.sender.firstName} {item.sender.lastName}
                        </span>

                        <span
                          className={`text-[11px] font-semibold ${
                            mine ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {roleLabel(item.sender.role)}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap break-words text-[16px] leading-[22px]">
                        {item.body}
                      </p>

                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold ${
                          mine ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {formatTime(item.createdAt)}
                        {mine && <CheckCheck size={14} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer
          className="shrink-0 border-t border-blue-100 bg-[#F8FAFC] px-2 pt-2"
          style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-end gap-2">
            <div className="flex min-h-[50px] flex-1 items-end rounded-[26px] bg-white px-2 py-1 shadow-sm">
              <button
                type="button"
                className="flex h-10 w-9 shrink-0 items-center justify-center text-slate-500"
              >
                <Smile size={22} />
              </button>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onFocus={() => scrollBottom(320)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder="Mesaj"
                style={{ fontSize: "16px" }}
                className="touch-manipulation max-h-[110px] min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 leading-[22px] text-slate-900 outline-none"
              />

              <button
                type="button"
                className="flex h-10 w-9 shrink-0 items-center justify-center text-slate-500"
              >
                <Paperclip size={21} />
              </button>
            </div>

            <button
              disabled={sending || !message.trim()}
              onClick={sendMessage}
              className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-white shadow-md disabled:opacity-60"
            >
              {message.trim() ? <SendHorizonal size={21} /> : <Mic size={21} />}
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}