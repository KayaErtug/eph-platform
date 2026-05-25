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

  const scrollBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 120);
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

      const res = await api.get(
        `/conversations/${conversationId}/messages`
      );

      const incomingMessages = res.data || [];

      setMessages((prev) => {
        const prevJson = JSON.stringify(prev);
        const nextJson = JSON.stringify(incomingMessages);

        if (prevJson !== nextJson) {
          setTimeout(scrollBottom, 100);
          return incomingMessages;
        }

        return prev;
      });

      await markAsRead();
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
    scrollBottom();
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
    } catch (error) {
      console.error(error);
      alert("Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F4F7FB]">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5">
        <header className="mb-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/network")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                  <LockKeyhole size={14} />
                  Özel görüşme
                </div>

                <h1 className="mt-2 text-[26px] font-black tracking-tight text-[#0B1F44]">
                  EPH Mesajlaşma
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Yeni mesajlar otomatik yenilenir.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/messages")}
              className="flex h-11 items-center gap-2 rounded-2xl bg-[#1D4ED8] px-4 text-sm font-black text-white shadow-sm transition hover:scale-[1.02]"
            >
              <Inbox size={18} />
              Mesaj Kutusu
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="h-[68vh] overflow-y-auto p-5">
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
                  Bu görüşmedeki ilk profesyonel mesajı sen gönderebilirsin.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
                        className={`max-w-[80%] rounded-[24px] px-4 py-3 shadow-sm transition-all ${
                          mine
                            ? "bg-[#1D4ED8] text-white"
                            : "border border-slate-200 bg-[#F8FAFC] text-slate-700"
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black">
                            {item.sender.firstName}{" "}
                            {item.sender.lastName}
                          </span>

                          <CheckCircle2 size={14} />

                          <span
                            className={`text-[11px] font-bold ${
                              mine
                                ? "text-blue-100"
                                : "text-slate-400"
                            }`}
                          >
                            {roleLabel(item.sender.role)}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {item.body}
                        </p>

                        <div
                          className={`mt-2 text-right text-[11px] font-bold ${
                            mine
                              ? "text-blue-100"
                              : "text-slate-400"
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
        </section>

        <footer className="mt-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-end gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Profesyonel mesajınızı yazın..."
              className="min-h-[70px] flex-1 resize-none rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 text-sm font-semibold outline-none transition focus:border-[#1D4ED8]"
            />

            <button
              disabled={sending}
              onClick={sendMessage}
              className="flex h-[70px] w-[70px] items-center justify-center rounded-2xl bg-[#1D4ED8] text-white transition hover:scale-[1.03] disabled:opacity-50"
            >
              <SendHorizonal size={24} />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}