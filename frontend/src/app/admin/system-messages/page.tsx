"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

type RecipientMode = "SINGLE" | "MULTIPLE" | "ROLE" | "ALL";

type UserItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isApproved?: boolean;
};

type SystemMessage = {
  id: string;
  visibleSenderName: string;
  targetType: string;
  targetUserId?: string | null;
  targetRole?: string | null;
  category: string;
  customCategory?: string | null;
  title: string;
  body: string;
  createdAt?: string;
};

const roleLabels: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  ADMIN: "Admin",
  SUPER_ADMIN: "Süper Admin",
};

const categoryLabels: Record<string, string> = {
  BILGILENDIRME: "Bilgilendirme",
  SIKAYET_YANITI: "Şikayet Yanıtı",
  ONERI_YANITI: "Öneri Yanıtı",
  UYARI: "Uyarı",
  DUYURU: "Duyuru",
  HESAP_ISLEMI: "Hesap İşlemi",
  ILAN_ISLEMI: "İlan İşlemi",
  UYELIK_PAKET_ISLEMI: "Üyelik / Paket İşlemi",
  EVRAK_DOGRULAMA_ISLEMI: "Evrak / Doğrulama İşlemi",
  NETWORK_ISLEMI: "Network İşlemi",
  GUVENLIK_BILDIRIMI: "Güvenlik Bildirimi",
  BAKIM_TEKNIK_BILGILENDIRME: "Bakım / Teknik Bilgilendirme",
  ODEME_FATURA_BILGILENDIRMESI: "Ödeme / Fatura Bilgilendirmesi",
  KURAL_IHLALI_BILDIRIMI: "Kural İhlali Bildirimi",
  DESTEK_YANITI: "Destek Yanıtı",
  DIGER: "Diğer",
};

function fullName(user: UserItem) {
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
}

function formatDate(value?: string) {
  if (!value) return "Tarih yok";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SystemMessagesPage() {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [recipientMode, setRecipientMode] = useState<RecipientMode>("ALL");
  const [targetRole, setTargetRole] = useState("EMLAKCI");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("DUYURU");
  const [customCategory, setCustomCategory] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const filteredUsers = useMemo(() => {
    const keyword = search.toLocaleLowerCase("tr-TR").trim();

    if (!keyword) return users;

    return users.filter((user) => {
      const text = `${user.firstName} ${user.lastName} ${user.email} ${roleLabels[user.role] || user.role}`;
      return text.toLocaleLowerCase("tr-TR").includes(keyword);
    });
  }, [search, users]);

  const selectedUsers = useMemo(() => {
    return users.filter((user) => selectedUserIds.includes(user.id));
  }, [selectedUserIds, users]);

  const loadMessages = async () => {
    const res = await api.get("/system-messages/admin/all");
    setMessages(Array.isArray(res.data) ? res.data : []);
  };

  const loadUsers = async () => {
    const res = await api.get("/admin/users?filter=all");
    setUsers(Array.isArray(res.data) ? res.data : []);
  };

  const loadPage = async () => {
    setPageLoading(true);

    try {
      await Promise.all([loadMessages(), loadUsers()]);
    } catch (err) {
      console.error(err);
      alert("Kurumsal iletişim verileri yüklenemedi.");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const toggleUser = (id: string) => {
    setSelectedUserIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const clearForm = () => {
    setTitle("");
    setBody("");
    setCustomCategory("");
    setSelectedUserId("");
    setSelectedUserIds([]);
    setSearch("");
  };

  const validateForm = () => {
    if (recipientMode === "SINGLE" && !selectedUserId) {
      alert("Tek kullanıcı için bir kullanıcı seçmelisin.");
      return false;
    }

    if (recipientMode === "MULTIPLE" && selectedUserIds.length === 0) {
      alert("Birden fazla kullanıcı için en az bir kullanıcı seçmelisin.");
      return false;
    }

    if (recipientMode === "ROLE" && !targetRole) {
      alert("Role göre gönderim için rol seçmelisin.");
      return false;
    }

    if (category === "DIGER" && !customCategory.trim()) {
      alert("Diğer kategorisi için özel kategori adı zorunludur.");
      return false;
    }

    if (!title.trim()) {
      alert("Başlık zorunludur.");
      return false;
    }

    if (!body.trim()) {
      alert("Mesaj zorunludur.");
      return false;
    }

    return true;
  };

  const sendOne = async (payload: any) => {
    return api.post("/system-messages/send", {
      category,
      customCategory: category === "DIGER" ? customCategory.trim() : "",
      title: title.trim(),
      body: body.trim(),
      ...payload,
    });
  };

  const sendMessage = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (recipientMode === "SINGLE") {
        await sendOne({
          targetType: "TEK_KULLANICI",
          targetUserId: selectedUserId,
        });
      }

      if (recipientMode === "MULTIPLE") {
        for (const userId of selectedUserIds) {
          await sendOne({
            targetType: "TEK_KULLANICI",
            targetUserId: userId,
          });
        }
      }

      if (recipientMode === "ROLE") {
        const roleTargetMap: Record<string, string> = {
          EMLAKCI: "EMLAKCILAR",
          MUTEAHHIT: "MUTEAHHITLER",
          INSAAT_FIRMASI: "INSAAT_FIRMALARI",
          ADMIN: "ADMINLER",
          SUPER_ADMIN: "SUPER_ADMINLER",
        };

        await sendOne({
          targetType: roleTargetMap[targetRole],
          targetRole,
        });
      }

      if (recipientMode === "ALL") {
        await sendOne({
          targetType: "TUM_KULLANICILAR",
        });
      }

      await loadMessages();
      clearForm();

      alert("Sistem mesajı gönderildi.");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Mesaj gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const categoryLabel = (msg: SystemMessage) => {
    if (msg.category === "DIGER" && msg.customCategory) {
      return msg.customCategory;
    }

    return categoryLabels[msg.category] || msg.category;
  };

  const targetLabel = (msg: SystemMessage) => {
    if (msg.targetType === "TEK_KULLANICI") {
      const targetUser = users.find((user) => user.id === msg.targetUserId);
      return targetUser ? fullName(targetUser) : "Tek kullanıcı";
    }

    if (msg.targetRole) {
      return roleLabels[msg.targetRole] || msg.targetRole;
    }

    const labels: Record<string, string> = {
      TUM_KULLANICILAR: "Tüm Kullanıcılar",
      EMLAKCILAR: "Emlakçılar",
      MUTEAHHITLER: "Müteahhitler",
      INSAAT_FIRMALARI: "İnşaat Firmaları",
      ADMINLER: "Adminler",
      SUPER_ADMINLER: "Süper Adminler",
      OZEL_GRUP: "Özel Grup",
    };

    return labels[msg.targetType] || msg.targetType;
  };

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="mt-4 text-sm font-black">Kurumsal iletişim yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <div>
            <h1 className="text-4xl font-black">Kurumsal İletişim Merkezi</h1>

            <p className="mt-2 text-slate-400">
              EPH Admin adına sistem mesajı gönder. Perde arkasında tüm işlemler Süper Admin log mantığıyla takip edilir.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl bg-cyan-600 px-4 py-3 text-center font-bold text-white"
          >
            Admin Paneli
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
            <h2 className="mb-6 text-center text-2xl font-black">Yeni Mesaj</h2>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setRecipientMode("SINGLE")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                    recipientMode === "SINGLE"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                      : "border-slate-800 bg-slate-900 text-slate-300"
                  }`}
                >
                  Tek Kullanıcı
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientMode("MULTIPLE")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                    recipientMode === "MULTIPLE"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                      : "border-slate-800 bg-slate-900 text-slate-300"
                  }`}
                >
                  Birden Fazla Kullanıcı
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientMode("ROLE")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                    recipientMode === "ROLE"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                      : "border-slate-800 bg-slate-900 text-slate-300"
                  }`}
                >
                  Role Göre
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientMode("ALL")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                    recipientMode === "ALL"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                      : "border-slate-800 bg-slate-900 text-slate-300"
                  }`}
                >
                  Tüm Kullanıcılar
                </button>
              </div>

              {(recipientMode === "SINGLE" || recipientMode === "MULTIPLE") && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Kullanıcı ara: ad, soyad, e-posta veya rol"
                    className="mb-4 w-full rounded-xl bg-white p-3 text-slate-950"
                  />

                  {recipientMode === "SINGLE" && (
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full rounded-xl bg-white p-3 text-slate-950"
                    >
                      <option value="">Kullanıcı seç</option>

                      {filteredUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {fullName(user)} · {user.email} · {roleLabels[user.role] || user.role}
                        </option>
                      ))}
                    </select>
                  )}

                  {recipientMode === "MULTIPLE" && (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {filteredUsers.map((user) => {
                        const checked = selectedUserIds.includes(user.id);

                        return (
                          <label
                            key={user.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${
                              checked
                                ? "border-cyan-400 bg-cyan-500/15"
                                : "border-slate-800 bg-slate-950"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUser(user.id)}
                              className="h-4 w-4"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black">
                                {fullName(user)}
                              </span>
                              <span className="block truncate text-xs text-slate-400">
                                {user.email} · {roleLabels[user.role] || user.role}
                              </span>
                            </span>
                          </label>
                        );
                      })}

                      {filteredUsers.length === 0 && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-center text-sm text-slate-500">
                          Kullanıcı bulunamadı.
                        </div>
                      )}
                    </div>
                  )}

                  {recipientMode === "MULTIPLE" && selectedUsers.length > 0 && (
                    <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-sm text-cyan-100">
                      Seçilen kullanıcı sayısı:{" "}
                      <strong>{selectedUsers.length}</strong>
                    </div>
                  )}
                </div>
              )}

              {recipientMode === "ROLE" && (
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full rounded-xl bg-white p-3 text-slate-950"
                >
                  <option value="EMLAKCI">Emlakçılar</option>
                  <option value="MUTEAHHIT">Müteahhitler</option>
                  <option value="INSAAT_FIRMASI">İnşaat Firmaları</option>
                  <option value="ADMIN">Adminler</option>
                  <option value="SUPER_ADMIN">Süper Adminler</option>
                </select>
              )}

              {recipientMode === "ALL" && (
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-center text-sm font-bold text-cyan-100">
                  Bu mesaj tüm kullanıcılara gönderilecek.
                </div>
              )}

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-white p-3 text-slate-950"
              >
                <option value="BILGILENDIRME">Bilgilendirme</option>
                <option value="SIKAYET_YANITI">Şikayet Yanıtı</option>
                <option value="ONERI_YANITI">Öneri Yanıtı</option>
                <option value="UYARI">Uyarı</option>
                <option value="DUYURU">Duyuru</option>
                <option value="HESAP_ISLEMI">Hesap İşlemi</option>
                <option value="ILAN_ISLEMI">İlan İşlemi</option>
                <option value="UYELIK_PAKET_ISLEMI">Üyelik / Paket İşlemi</option>
                <option value="EVRAK_DOGRULAMA_ISLEMI">Evrak / Doğrulama İşlemi</option>
                <option value="NETWORK_ISLEMI">Network İşlemi</option>
                <option value="GUVENLIK_BILDIRIMI">Güvenlik Bildirimi</option>
                <option value="BAKIM_TEKNIK_BILGILENDIRME">Bakım / Teknik Bilgilendirme</option>
                <option value="ODEME_FATURA_BILGILENDIRMESI">Ödeme / Fatura Bilgilendirmesi</option>
                <option value="KURAL_IHLALI_BILDIRIMI">Kural İhlali Bildirimi</option>
                <option value="DESTEK_YANITI">Destek Yanıtı</option>
                <option value="DIGER">Diğer</option>
              </select>

              {category === "DIGER" && (
                <input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Özel kategori adı"
                  className="w-full rounded-xl bg-white p-3 text-slate-950"
                />
              )}

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Başlık"
                className="w-full rounded-xl bg-white p-3 text-slate-950"
              />

              <textarea
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Mesaj"
                className="w-full resize-none rounded-xl bg-white p-3 text-slate-950"
              />

              <button
                onClick={sendMessage}
                disabled={loading}
                className="w-full rounded-xl bg-cyan-600 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Gönderiliyor..." : "Mesaj Gönder"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="mb-6 flex flex-col gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left">
              <div>
                <h2 className="text-2xl font-black">Gönderilmiş Mesajlar</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Son gönderilen sistem mesajları.
                </p>
              </div>

              <button
                onClick={loadMessages}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-300"
              >
                Yenile
              </button>
            </div>

            <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div key={msg.id} className="rounded-2xl bg-slate-900 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-black">{msg.title}</div>

                      <div className="mt-1 text-xs text-cyan-400">
                        {categoryLabel(msg)}
                      </div>
                    </div>

                    <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-slate-400">
                      {targetLabel(msg)}
                    </div>
                  </div>

                  <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-200">
                    {msg.body}
                  </div>

                  <div className="mt-4 text-xs text-slate-500">
                    {msg.visibleSenderName || "EPH Admin"} · {formatDate(msg.createdAt)}
                  </div>
                </div>
              ))}

              {messages.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
                  Henüz sistem mesajı yok.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}