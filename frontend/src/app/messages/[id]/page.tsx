"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

import {
  ArrowLeft,
  Check,
  CheckCheck,
  Paperclip,
  Camera,
  Mic,
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

  if (role === "INSAAT_FIRMASI")
    return "İnşaat Firması";

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

  const scrollBottom = (smooth = false) => {
    setTimeout(() => {
      const el = listRef.current;

      if (!el) return;

      el.scrollTop = el.scrollHeight;
    }, 80);
  };

  useEffect(() => {
    const updateHeight = () => {
      const height =
        window.visualViewport?.height ||
        window.innerHeight;

      document.documentElement.style.setProperty(
        "--eph-chat-height",
        `${height}px`
      );
    };

    updateHeight();

    window.visualViewport?.addEventListener(
      "resize",
      updateHeight
    );

    window.visualViewport?.addEventListener(
      "scroll",
      updateHeight
    );

    window.addEventListener(
      "resize",
      updateHeight
    );

    return () => {
      window.visualViewport?.removeEventListener(
        "resize",
        updateHeight
      );

      window.visualViewport?.removeEventListener(
        "scroll",
        updateHeight
      );

      window.removeEventListener(
        "resize",
        updateHeight
      );
    };
  }, []);

  const markAsRead = async () => {
    if (!user?.id || !conversationId)
      return;

    try {
      await api.post(
        `/conversations/${conversationId}/read`,
        {
          userId: user.id,
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async (
    silent = false
  ) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const res = await api.get(
        `/conversations/${conversationId}/messages`
      );

      const incomingMessages =
        res.data || [];

      setMessages(incomingMessages);

      await markAsRead();

      scrollBottom(false);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!conversationId || !user?.id)
      return;

    fetchMessages();

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    return () =>
      clearInterval(interval);
  }, [conversationId, user?.id]);

  useEffect(() => {
    scrollBottom(false);
  }, [messages.length]);

  const sendMessage = async () => {
    try {
      if (!message.trim()) return;

      if (!user?.id) {
        alert(
          "Lütfen tekrar giriş yapın."
        );

        return;
      }

      setSending(true);

      await api.post(
        `/conversations/${conversationId}/messages`,
        {
          senderId: user.id,
          body: message.trim(),
        }
      );

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
    <main
      className="fixed inset-0 z-[9999] overflow-hidden bg-[#E5DDD5]"
      style={
        {
          height:
            "var(--eph-chat-height, 100dvh)",
        } as CSSProperties
      }
    >
      <section className="flex h-full flex-col overflow-hidden">
        <header className="flex h-[74px] shrink-0 items-center gap-3 bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-3 text-white shadow-lg">
          <button
            onClick={() =>
              router.push("/messages")
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-white/10"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-black backdrop-blur">
            E
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[18px] font-black">
              EPH Mesajlaşma
            </h1>

            <p className="truncate text-[13px] text-blue-100">
              Yeni mesajlar otomatik yenilenir
            </p>
          </div>
        </header>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto bg-[#ECE5DD] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.35)_1px,_transparent_1px)] bg-[length:24px_24px] px-3 py-3"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow">
                Mesajlar yükleniyor...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-bold text-slate-600 shadow">
                Henüz mesaj yok.
              </div>
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {messages.map((item) => {
                const mine =
                  item.sender.id === user?.id;

                return (
                  <div
                    key={item.id}
                    className={`flex ${
                      mine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[84%] rounded-[24px] px-4 py-3 shadow-sm ${
                        mine
                          ? "rounded-br-md bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white"
                          : "rounded-bl-md bg-white text-slate-800"
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[13px] font-black ${
                            mine
                              ? "text-white"
                              : "text-slate-800"
                          }`}
                        >
                          {
                            item.sender
                              .firstName
                          }{" "}
                          {
                            item.sender
                              .lastName
                          }
                        </span>

                        <span
                          className={`text-[12px] font-semibold ${
                            mine
                              ? "text-blue-100"
                              : "text-slate-400"
                          }`}
                        >
                          {roleLabel(
                            item.sender.role
                          )}
                        </span>
                      </div>

                      <p
                        className={`whitespace-pre-wrap break-words text-[17px] leading-[24px] ${
                          mine
                            ? "text-white"
                            : "text-slate-800"
                        }`}
                      >
                        {item.body}
                      </p>

                      <div
                        className={`mt-2 flex items-center justify-end gap-1 text-[11px] font-semibold ${
                          mine
                            ? "text-blue-100"
                            : "text-slate-400"
                        }`}
                      >
                        {formatTime(
                          item.createdAt
                        )}

                        {mine ? (
                          <CheckCheck
                            size={14}
                          />
                        ) : (
                          <Check size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/30 bg-[#F0F2F5] px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <div className="flex items-end gap-2">
            <div className="flex min-h-[54px] flex-1 items-end rounded-[28px] bg-white px-3 py-2 shadow-sm">
              <button className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-500">
                <Smile size={24} />
              </button>

              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                onFocus={() =>
                  scrollBottom(false)
                }
                rows={1}
                placeholder="Mesajınızı yazın..."
                className="max-h-[120px] min-h-[38px] flex-1 resize-none bg-transparent px-2 py-[8px] text-[16px] leading-[22px] text-slate-800 outline-none"
              />

              <button className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-500">
                <Paperclip size={22} />
              </button>

              <button className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-500">
                <Camera size={22} />
              </button>
            </div>

            <button
              disabled={
                sending ||
                !message.trim()
              }
              onClick={sendMessage}
              className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white shadow-lg disabled:opacity-50"
            >
              {message.trim() ? (
                <Send size={22} />
              ) : (
                <Mic size={22} />
              )}
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function Send({
  size = 22,
}: {
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 5l7 7-7 7"
      />
    </svg>
  );
}