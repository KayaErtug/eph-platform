"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MessageCircle,
} from "lucide-react";

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

function roleLabel(role?: string) {
  if (role === "EMLAKCI") return "Emlakçı";
  if (role === "MUTEAHHIT") return "Müteahhit";
  if (role === "INSAAT_FIRMASI") return "İnşaat Firması";
  if (role === "ADMIN") return "EPH Admin";

  return "EPH Üyesi";
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      if (!user?.id) return;

      const res = await api.get(`/conversations/my/${user.id}`);
      setConversations(res.data || []);
    } catch (error) {
      console.error(error);
      alert("Mesaj kutusu yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user?.id]);

  return (
    <main className="min-h-screen bg-[#F4F7FB]">
      <section className="mx-auto min-h-screen max-w-5xl px-4 py-5">
        <header className="mb-4 rounded-[28px] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/network")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                <LockKeyhole size={14} />
                Özel mesaj kutusu
              </div>

              <h1 className="mt-2 text-[28px] font-black tracking-tight text-[#0B1F44]">
                Görüşmeler
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Network paylaşımlarından başlayan özel iş görüşmelerini burada
                takip edebilirsin.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4">
          {loading ? (
            <div className="flex h-[360px] items-center justify-center text-sm font-bold text-slate-500">
              Görüşmeler yükleniyor...
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#EEF4FF] text-[#1D4ED8]">
                <MessageCircle size={30} />
              </div>

              <div className="text-[20px] font-black text-[#0B1F44]">
                Henüz görüşme yok
              </div>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Bir Network paylaşımı üzerinden görüşme başlatıldığında burada
                görünecek.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => {
                const otherParticipants = conversation.participants.filter(
                  (participant) => participant.user.id !== user?.id
                );

                const otherUser = otherParticipants[0]?.user;
                const lastMessage = conversation.messages[0];

                const location = [
                  conversation.post?.city,
                  conversation.post?.district,
                  conversation.post?.neighborhood,
                ]
                  .filter(Boolean)
                  .join(" / ");

                return (
                  <button
                    key={conversation.id}
                    onClick={() => router.push(`/messages/${conversation.id}`)}
                    className="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-[#1D4ED8] hover:bg-[#F8FAFC]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] font-black text-[#1D4ED8]">
                          {otherUser?.firstName?.[0] || "E"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-[16px] font-black text-[#0B1F44]">
                              {conversation.title}
                            </h2>

                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-1 text-[11px] font-black text-slate-500">
                              <CheckCircle2 size={13} />
                              Özel
                            </span>
                          </div>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {otherUser
                              ? `${otherUser.firstName} ${otherUser.lastName} · ${roleLabel(
                                  otherUser.role
                                )}`
                              : "EPH görüşmesi"}
                          </p>

                          {location && (
                            <p className="mt-1 text-xs font-bold text-slate-400">
                              {location}
                            </p>
                          )}

                          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
                            {lastMessage?.body || "Henüz mesaj yok"}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                          <Clock3 size={14} />
                          {formatDateTime(
                            lastMessage?.createdAt || conversation.updatedAt
                          )}
                        </div>
                      </div>
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