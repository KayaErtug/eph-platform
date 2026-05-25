"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  ArrowLeft,
  CheckCircle2,
  Inbox,
  LockKeyhole,
  SendHorizonal,
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

function formatDateTime(value: string) {
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

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollBottom = (smooth = false) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }, 80);
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
      if (!silent) setLoading(true);

      const res = await api.get(`/conversations/${conversationId}/messages`);
      const incomingMessages = res.data || [];

      setMessages((prev) => {
        const prevJson = JSON.stringify(prev);
        const nextJson = JSON.stringify(incomingMessages);

        if (prevJson !== nextJson) {
          setTimeout(() => scrollBottom(false), 100);
          return incomingMessages;
        }

        return prev;
      });

      await markAsRead();
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
    scrollBottom(false);
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
        body: message,
      });

      setMessage("");

      await fetchMessages(true);

      scrollBottom(true);
    } catch (error) {
      console.error(error);
      alert("Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="h-[calc(100dvh-112px)] overflow-hidden bg-[#F4F7FB] md:h-screen">
      <section className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden px-2 py-2 md:px-4 md:py-5">
        <header className="shrink-0 rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm md:rounded-[28px] md:p-5">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => router.push("/network")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-[#EEF4FF] px-3 py-1 text-[11px] font-black text-[#1D4ED8]">
                <LockKeyhole size={13} />
                Özel görüşme
              </div>

              <h1 className="mt-1 truncate text-[20px] font-black tracking-tight text-[#0B1F44] md:text-[26px]">
                EPH Mesajlaşma
              </h1>
            </div>

            <button
              onClick={() => router.push("/messages")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1D4ED8] text-white md:w-auto md:px-4"
            >
              <Inbox size={18} />
              <span className="hidden text-sm font-black md:ml-2 md:inline">
                Mesaj Kutusu
              </span>
            </button>
          </div>
        </header>

        <section className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm md:mt-4 md:rounded-[28px]">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5 md:py-5">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">
                Mesajlar yükleniyor...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="text-[20px] font-black text-[#0B1F44]">
                  Henüz mesaj yok
                </div>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Bu görüşmedeki ilk mesajı sen gönderebilirsin.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-3">
                {messages.map((item) => {
                  const mine = item.sender.id === user?.id;

                  return (
                    <div
                      key={item.id}
                      className={`flex ${
                        mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[96%] rounded-[22px] px-4 py-3 shadow-sm md:max-w-[78%] md:rounded-[24px] ${
                          mine
                            ? "bg-[#1D4ED8] text-white"
                            : "border border-slate-200 bg-[#F8FAFC] text-slate-700"
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black">
                            {item.sender.firstName} {item.sender.lastName}
                          </span>

                          <CheckCircle2 size={14} />

                          <span
                            className={`text-[11px] font-bold ${
                              mine ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {roleLabel(item.sender.role)}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap break-words text-[15px] leading-6">
                          {item.body}
                        </p>

                        <div
                          className={`mt-2 text-right text-[11px] font-bold ${
                            mine ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {formatDateTime(item.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white p-2 pb-[calc(10px+env(safe-area-inset-bottom))] md:p-4">
            <div className="flex items-end gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => scrollBottom(false)}
                placeholder="Mesajınızı yazın..."
                rows={1}
                className="max-h-[90px] min-h-[54px] flex-1 resize-none rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-[15px] font-semibold leading-6 outline-none focus:border-[#1D4ED8]"
              />

              <button
                disabled={sending || !message.trim()}
                onClick={sendMessage}
                className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-[#1D4ED8] text-white disabled:opacity-50 md:h-[64px] md:w-[64px]"
              >
                <SendHorizonal size={22} />
              </button>
            </div>
          </footer>
        </section>
      </section>
    </main>
  );
}