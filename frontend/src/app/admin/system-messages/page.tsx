"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Filter,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  UsersRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { getRoleDisplayName } from "@/lib/role-labels";
import AdminFlagBanner from "@/components/admin/AdminFlagBanner";

type RecipientMode = "SINGLE" | "MULTIPLE" | "ROLE" | "CITY" | "CITY_ROLE" | "ALL";

type UserItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isApproved?: boolean;
  city?: string | null;
  district?: string | null;
  cityPlateCode?: string | null;
};

type CityOption = {
  city: string;
  plate: string;
};

type SystemMessage = {
  id: string;
  visibleSenderName?: string | null;
  targetType: string;
  targetUserId?: string | null;
  targetRole?: string | null;
  targetCities?: string[];
  targetCityPlateCodes?: string[];
  targetRoles?: string[];
  recipientCount?: number;
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
  SUPER_ADMIN: getRoleDisplayName("SUPER_ADMIN"),
};

const selectableRoles = [
  { value: "EMLAKCI", label: "Emlakçı" },
  { value: "MUTEAHHIT", label: "Müteahhit" },
  { value: "INSAAT_FIRMASI", label: "İnşaat Firması" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: getRoleDisplayName("SUPER_ADMIN") },
];

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

const allTurkeyCities: CityOption[] = [
  { city: "Adana", plate: "01" },
  { city: "Adıyaman", plate: "02" },
  { city: "Afyonkarahisar", plate: "03" },
  { city: "Ağrı", plate: "04" },
  { city: "Amasya", plate: "05" },
  { city: "Ankara", plate: "06" },
  { city: "Antalya", plate: "07" },
  { city: "Artvin", plate: "08" },
  { city: "Aydın", plate: "09" },
  { city: "Balıkesir", plate: "10" },
  { city: "Bilecik", plate: "11" },
  { city: "Bingöl", plate: "12" },
  { city: "Bitlis", plate: "13" },
  { city: "Bolu", plate: "14" },
  { city: "Burdur", plate: "15" },
  { city: "Bursa", plate: "16" },
  { city: "Çanakkale", plate: "17" },
  { city: "Çankırı", plate: "18" },
  { city: "Çorum", plate: "19" },
  { city: "Denizli", plate: "20" },
  { city: "Diyarbakır", plate: "21" },
  { city: "Edirne", plate: "22" },
  { city: "Elazığ", plate: "23" },
  { city: "Erzincan", plate: "24" },
  { city: "Erzurum", plate: "25" },
  { city: "Eskişehir", plate: "26" },
  { city: "Gaziantep", plate: "27" },
  { city: "Giresun", plate: "28" },
  { city: "Gümüşhane", plate: "29" },
  { city: "Hakkari", plate: "30" },
  { city: "Hatay", plate: "31" },
  { city: "Isparta", plate: "32" },
  { city: "Mersin", plate: "33" },
  { city: "İstanbul", plate: "34" },
  { city: "İzmir", plate: "35" },
  { city: "Kars", plate: "36" },
  { city: "Kastamonu", plate: "37" },
  { city: "Kayseri", plate: "38" },
  { city: "Kırklareli", plate: "39" },
  { city: "Kırşehir", plate: "40" },
  { city: "Kocaeli", plate: "41" },
  { city: "Konya", plate: "42" },
  { city: "Kütahya", plate: "43" },
  { city: "Malatya", plate: "44" },
  { city: "Manisa", plate: "45" },
  { city: "Kahramanmaraş", plate: "46" },
  { city: "Mardin", plate: "47" },
  { city: "Muğla", plate: "48" },
  { city: "Muş", plate: "49" },
  { city: "Nevşehir", plate: "50" },
  { city: "Niğde", plate: "51" },
  { city: "Ordu", plate: "52" },
  { city: "Rize", plate: "53" },
  { city: "Sakarya", plate: "54" },
  { city: "Samsun", plate: "55" },
  { city: "Siirt", plate: "56" },
  { city: "Sinop", plate: "57" },
  { city: "Sivas", plate: "58" },
  { city: "Tekirdağ", plate: "59" },
  { city: "Tokat", plate: "60" },
  { city: "Trabzon", plate: "61" },
  { city: "Tunceli", plate: "62" },
  { city: "Şanlıurfa", plate: "63" },
  { city: "Uşak", plate: "64" },
  { city: "Van", plate: "65" },
  { city: "Yozgat", plate: "66" },
  { city: "Zonguldak", plate: "67" },
  { city: "Aksaray", plate: "68" },
  { city: "Bayburt", plate: "69" },
  { city: "Karaman", plate: "70" },
  { city: "Kırıkkale", plate: "71" },
  { city: "Batman", plate: "72" },
  { city: "Şırnak", plate: "73" },
  { city: "Bartın", plate: "74" },
  { city: "Ardahan", plate: "75" },
  { city: "Iğdır", plate: "76" },
  { city: "Yalova", plate: "77" },
  { city: "Karabük", plate: "78" },
  { city: "Kilis", plate: "79" },
  { city: "Osmaniye", plate: "80" },
  { city: "Düzce", plate: "81" },
];

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

function normalize(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

function sameCity(user: UserItem, city: CityOption) {
  return normalize(user.city) === normalize(city.city) || String(user.cityPlateCode || "") === city.plate;
}

function categoryLabel(msg: SystemMessage) {
  if (msg.category === "DIGER" && msg.customCategory) return msg.customCategory;
  return categoryLabels[msg.category] || msg.category;
}

export default function SystemMessagesPage() {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<SystemMessage | null>(null);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [recipientMode, setRecipientMode] = useState<RecipientMode>("ALL");
  const [targetRole, setTargetRole] = useState("EMLAKCI");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [selectedCities, setSelectedCities] = useState<CityOption[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [category, setCategory] = useState("DUYURU");
  const [customCategory, setCustomCategory] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const filteredUsers = useMemo(() => {
    const keyword = normalize(search);
    if (!keyword) return users;

    return users.filter((user) => {
      const text = `${user.firstName} ${user.lastName} ${user.email} ${roleLabels[user.role] || user.role} ${user.city || ""} ${user.cityPlateCode || ""}`;
      return normalize(text).includes(keyword);
    });
  }, [search, users]);

  const filteredCityOptions = useMemo(() => {
    const keyword = normalize(citySearch);

    return allTurkeyCities.filter((item) => {
      const alreadySelected = selectedCities.some((selected) => selected.plate === item.plate);
      if (alreadySelected) return false;
      if (!keyword) return true;
      return normalize(`${item.city} ${item.plate}`).includes(keyword);
    });
  }, [citySearch, selectedCities]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.id)),
    [selectedUserIds, users],
  );

  const estimatedRecipientCount = useMemo(() => {
    if (recipientMode === "SINGLE") return selectedUserId ? 1 : 0;
    if (recipientMode === "MULTIPLE") return selectedUserIds.length;

    if (recipientMode === "ALL") {
      return users.filter((user) => user.isApproved !== false).length;
    }

    if (recipientMode === "ROLE") {
      return users.filter((user) => user.isApproved !== false && user.role === targetRole).length;
    }

    if (recipientMode === "CITY") {
      if (selectedCities.length === 0) return 0;
      return users.filter((user) => user.isApproved !== false && selectedCities.some((city) => sameCity(user, city))).length;
    }

    if (recipientMode === "CITY_ROLE") {
      if (selectedCities.length === 0 || selectedRoles.length === 0) return 0;
      return users.filter((user) => {
        const cityMatch = selectedCities.some((city) => sameCity(user, city));
        const roleMatch = selectedRoles.includes(user.role);
        return user.isApproved !== false && cityMatch && roleMatch;
      }).length;
    }

    return 0;
  }, [recipientMode, selectedUserId, selectedUserIds, users, targetRole, selectedCities, selectedRoles]);

  const loadMessages = async () => {
    const res = await api.get("/system-messages/admin/all");
    setMessages(Array.isArray(res.data) ? res.data : []);
  };

  const loadUsers = async () => {
    const res = await api.get(`/admin/users?filter=all&t=${Date.now()}`);
    setUsers(Array.isArray(res.data) ? res.data : []);
  };

  const loadPage = async () => {
    setPageLoading(true);
    setError("");

    try {
      await Promise.all([loadMessages(), loadUsers()]);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Kurumsal iletişim verileri yüklenemedi.");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const counts = useMemo(() => {
    return {
      users: users.length,
      messages: messages.length,
      categories: new Set(messages.map((item) => item.category)).size,
      selected: estimatedRecipientCount,
    };
  }, [users.length, messages, estimatedRecipientCount]);

  const toggleUser = (id: string) => {
    setSelectedUserIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const addCity = (city: CityOption) => {
    setSelectedCities((current) => [...current, city]);
    setCitySearch("");
    setCityDropdownOpen(false);
  };

  const removeCity = (plate: string) => {
    setSelectedCities((current) => current.filter((city) => city.plate !== plate));
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((current) => (current.includes(role) ? current.filter((item) => item !== role) : [...current, role]));
  };

  const clearTargetSelections = () => {
    setSelectedUserId("");
    setSelectedUserIds([]);
    setSearch("");
    setSelectedCities([]);
    setCitySearch("");
    setCityDropdownOpen(false);
    setSelectedRoles([]);
  };

  const clearForm = () => {
    setTitle("");
    setBody("");
    setCustomCategory("");
    clearTargetSelections();
  };

  const changeRecipientMode = (mode: RecipientMode) => {
    setRecipientMode(mode);
    clearTargetSelections();
  };

  const validateForm = () => {
    if (recipientMode === "SINGLE" && !selectedUserId) {
      setError("Tek kullanıcı için bir kullanıcı seçmelisin.");
      return false;
    }

    if (recipientMode === "MULTIPLE" && selectedUserIds.length === 0) {
      setError("Birden fazla kullanıcı için en az bir kullanıcı seçmelisin.");
      return false;
    }

    if (recipientMode === "ROLE" && !targetRole) {
      setError("Role göre gönderim için rol seçmelisin.");
      return false;
    }

    if (recipientMode === "CITY" && selectedCities.length === 0) {
      setError("Şehre göre gönderim için en az bir şehir seçmelisin.");
      return false;
    }

    if (recipientMode === "CITY_ROLE" && selectedCities.length === 0) {
      setError("Şehir + role göre gönderim için en az bir şehir seçmelisin.");
      return false;
    }

    if (recipientMode === "CITY_ROLE" && selectedRoles.length === 0) {
      setError("Şehir + role göre gönderim için en az bir rol seçmelisin.");
      return false;
    }

    if (category === "DIGER" && !customCategory.trim()) {
      setError("Diğer kategorisi için özel kategori adı zorunludur.");
      return false;
    }

    if (!title.trim()) {
      setError("Başlık zorunludur.");
      return false;
    }

    if (!body.trim()) {
      setError("Mesaj zorunludur.");
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
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (recipientMode === "SINGLE") {
        await sendOne({ targetType: "TEK_KULLANICI", targetUserId: selectedUserId });
      }

      if (recipientMode === "MULTIPLE") {
        for (const userId of selectedUserIds) {
          await sendOne({ targetType: "TEK_KULLANICI", targetUserId: userId });
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

        await sendOne({ targetType: roleTargetMap[targetRole], targetRole });
      }

      if (recipientMode === "CITY") {
        await sendOne({
          targetType: "SEHIRLER",
          targetCities: selectedCities.map((item) => item.city),
          targetCityPlateCodes: selectedCities.map((item) => item.plate),
        });
      }

      if (recipientMode === "CITY_ROLE") {
        await sendOne({
          targetType: "SEHIRLER_VE_ROLLER",
          targetCities: selectedCities.map((item) => item.city),
          targetCityPlateCodes: selectedCities.map((item) => item.plate),
          targetRoles: selectedRoles,
        });
      }

      if (recipientMode === "ALL") {
        await sendOne({ targetType: "TUM_KULLANICILAR" });
      }

      await loadMessages();
      clearForm();
      setSuccess("Sistem mesajı gönderildi.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Mesaj gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const targetLabel = (msg: SystemMessage) => {
    if (msg.targetType === "TEK_KULLANICI") {
      const targetUser = users.find((user) => user.id === msg.targetUserId);
      return targetUser ? fullName(targetUser) : "Tek kullanıcı";
    }

    if (msg.targetType === "SEHIRLER") {
      const cities = Array.isArray(msg.targetCities) && msg.targetCities.length > 0 ? msg.targetCities.join(", ") : "Şehirler";
      return `${cities} · ${msg.recipientCount || 0} alıcı`;
    }

    if (msg.targetType === "SEHIRLER_VE_ROLLER") {
      const cities = Array.isArray(msg.targetCities) && msg.targetCities.length > 0 ? msg.targetCities.join(", ") : "Şehirler";
      const roles = Array.isArray(msg.targetRoles) && msg.targetRoles.length > 0 ? msg.targetRoles.map((role) => roleLabels[role] || role).join(", ") : "Roller";
      return `${cities} · ${roles} · ${msg.recipientCount || 0} alıcı`;
    }

    if (msg.targetRole) return roleLabels[msg.targetRole] || msg.targetRole;

    const labels: Record<string, string> = {
      TUM_KULLANICILAR: "Tüm Kullanıcılar",
      EMLAKCILAR: "Emlakçılar",
      MUTEAHHITLER: "Müteahhitler",
      INSAAT_FIRMALARI: "İnşaat Firmaları",
      ADMINLER: "Adminler",
      SUPER_ADMINLER: getRoleDisplayName("SUPER_ADMIN"),
      OZEL_GRUP: "Özel Grup",
    };

    return labels[msg.targetType] || msg.targetType;
  };

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#172033]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Sistem Mesajları
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/admin" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm">
              <ArrowLeft size={19} />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-[19px] font-black tracking-[-0.04em]">
                Sistem Mesajları
              </h1>
              <p className="truncate text-[11px] font-bold text-slate-500">
                Kullanıcı, rol, şehir ve tüm platform mesajları
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadPage}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Yenile"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-3 pb-20">
        <AdminFlagBanner className="mb-2 rounded-[8px]" />

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard label="Kullanıcı" value={counts.users} icon={<UsersRound size={18} />} tone="blue" />
          <MetricCard label="Mesaj" value={counts.messages} icon={<MessageCircle size={18} />} tone="green" />
          <MetricCard label="Kategori" value={counts.categories} icon={<Filter size={18} />} tone="amber" />
          <MetricCard label="Alıcı" value={counts.selected} icon={<Send size={18} />} tone="slate" />
        </section>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center text-[13px] font-black text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center text-[13px] font-black text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="mt-3 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 text-center">
              <Send className="mx-auto text-blue-700" size={28} />
              <h2 className="mt-2 text-[17px] font-black tracking-[-0.04em]">
                Yeni Mesaj
              </h2>
              <p className="text-[12px] font-bold text-slate-500">
                Hedef kitleyi seç, mesajı gönder.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["SINGLE", "Tek Kullanıcı"],
                ["MULTIPLE", "Çoklu Kullanıcı"],
                ["ROLE", "Role Göre"],
                ["CITY", "Şehre Göre"],
                ["CITY_ROLE", "Şehir + Rol"],
                ["ALL", "Tüm Kullanıcılar"],
              ].map(([value, label], index) => {
                const selected = recipientMode === value;
                const isLastOdd = 6 % 2 === 1 && index === 5;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeRecipientMode(value as RecipientMode)}
                    className={`min-h-[44px] rounded-2xl px-2 text-[12px] font-black ${
                      selected ? "bg-[#1557D6] text-white" : "border border-slate-200 bg-slate-50 text-slate-700"
                    } ${isLastOdd ? "max-md:col-span-2 max-md:mx-auto max-md:w-[50%]" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {(recipientMode === "SINGLE" || recipientMode === "MULTIPLE") ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Kullanıcı ara..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-center text-[13px] font-bold outline-none"
                  />
                </label>

                {recipientMode === "SINGLE" ? (
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-black text-slate-700 outline-none"
                  >
                    <option value="">Kullanıcı seç</option>
                    {filteredUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {fullName(user)} · {user.email} · {roleLabels[user.role] || user.role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                    {filteredUsers.map((user) => {
                      const checked = selectedUserIds.includes(user.id);

                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleUser(user.id)}
                          className={`w-full rounded-2xl border p-3 text-left ${
                            checked ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
                          }`}
                        >
                          <p className="truncate text-[13px] font-black text-[#172033]">
                            {checked ? "✓ " : ""}
                            {fullName(user)}
                          </p>
                          <p className="truncate text-[11px] font-bold text-slate-500">
                            {user.email} · {roleLabels[user.role] || user.role}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {recipientMode === "MULTIPLE" && selectedUsers.length > 0 ? (
                  <div className="mt-2 rounded-xl bg-blue-50 p-2 text-center text-[12px] font-black text-blue-700">
                    Seçilen kullanıcı: {selectedUsers.length}
                  </div>
                ) : null}
              </div>
            ) : null}

            {recipientMode === "ROLE" ? (
              <select
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-black text-slate-700 outline-none"
              >
                {selectableRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            ) : null}

            {(recipientMode === "CITY" || recipientMode === "CITY_ROLE") ? (
              <div className="relative mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <button
                  type="button"
                  onClick={() => setCityDropdownOpen((current) => !current)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-black text-slate-700"
                >
                  {selectedCities.length > 0 ? `${selectedCities.length} şehir seçildi` : "Şehir seç"}
                </button>

                {cityDropdownOpen ? (
                  <div className="absolute left-2 right-2 top-[58px] z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                    <input
                      value={citySearch}
                      onChange={(event) => setCitySearch(event.target.value)}
                      placeholder="Şehir veya plaka ara..."
                      className="mb-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-center text-[12px] font-bold outline-none"
                    />

                    <div className="max-h-56 overflow-y-auto">
                      {filteredCityOptions.map((city) => (
                        <button
                          key={city.plate}
                          type="button"
                          onClick={() => addCity(city)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[12px] font-black text-slate-700 hover:bg-blue-50"
                        >
                          <span>{city.city}</span>
                          <span>{city.plate}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedCities.length > 0 ? (
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {selectedCities.map((city) => (
                      <button
                        key={city.plate}
                        type="button"
                        onClick={() => removeCity(city.plate)}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700"
                      >
                        {city.city} ×
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {recipientMode === "CITY_ROLE" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {selectableRoles.map((role, index) => {
                  const checked = selectedRoles.includes(role.value);
                  const isLastOdd = selectableRoles.length % 2 === 1 && index === selectableRoles.length - 1;

                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => toggleRole(role.value)}
                      className={`min-h-[42px] rounded-2xl px-2 text-[12px] font-black ${
                        checked ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
                      } ${isLastOdd ? "max-md:col-span-2 max-md:mx-auto max-md:w-[50%]" : ""}`}
                    >
                      {checked ? "✓ " : ""}
                      {role.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {recipientMode === "ALL" ? (
              <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center text-[12px] font-black text-blue-700">
                Bu mesaj tüm onaylı kullanıcılara gönderilecek.
              </div>
            ) : null}

            <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Tahmini Alıcı
              </p>
              <p className="mt-1 text-[28px] font-black leading-none text-emerald-700">
                {estimatedRecipientCount}
              </p>
            </div>

            <div className="mt-3 grid gap-2">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-black text-slate-700 outline-none"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {category === "DIGER" ? (
                <input
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  placeholder="Özel kategori adı"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-bold outline-none"
                />
              ) : null}

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Başlık"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-[13px] font-bold outline-none"
              />

              <textarea
                rows={6}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Mesaj"
                className="resize-none rounded-xl border border-slate-200 bg-white p-3 text-center text-[13px] font-bold outline-none"
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1557D6] text-[14px] font-black text-white disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {loading ? "Gönderiliyor" : "Mesaj Gönder"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[17px] font-black tracking-[-0.04em]">
                  Gönderilmiş Mesajlar
                </h2>
                <p className="text-[12px] font-bold text-slate-500">
                  Son sistem mesajları
                </p>
              </div>

              <button
                type="button"
                onClick={loadMessages}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="max-h-[760px] space-y-2 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-[13px] font-black text-slate-500">
                    Henüz sistem mesajı yok.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <article key={msg.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-[14px] font-black text-[#172033]">
                          {msg.title}
                        </h3>
                        <p className="mt-1 text-[11px] font-black text-blue-700">
                          {categoryLabel(msg)}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">
                        {msg.recipientCount || 0} alıcı
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-3 whitespace-pre-line text-[12px] font-bold leading-5 text-slate-600">
                      {msg.body}
                    </p>

                    <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
                      <p className="truncate text-[11px] font-bold text-slate-400">
                        {msg.visibleSenderName || "EPH Admin"} · {formatDate(msg.createdAt)}
                      </p>

                      <button
                        type="button"
                        onClick={() => setSelectedMessage(msg)}
                        className="flex h-9 items-center justify-center gap-1 rounded-xl bg-white px-3 text-[11px] font-black text-slate-700 ring-1 ring-slate-200"
                      >
                        <Eye size={14} />
                        Detay
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>

      {selectedMessage ? (
        <Modal title="Mesaj Detayı" onClose={() => setSelectedMessage(null)}>
          <div className="grid gap-2">
            <DetailRow label="Başlık" value={selectedMessage.title} />
            <DetailRow label="Kategori" value={categoryLabel(selectedMessage)} />
            <DetailRow label="Hedef" value={targetLabel(selectedMessage)} />
            <DetailRow label="Alıcı Sayısı" value={String(selectedMessage.recipientCount || 0)} />
            <DetailRow label="Gönderen" value={selectedMessage.visibleSenderName || "EPH Admin"} />
            <DetailRow label="Tarih" value={formatDate(selectedMessage.createdAt)} />
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Mesaj
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[13px] font-bold leading-6 text-[#172033]">
              {selectedMessage.body}
            </p>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "blue" | "green" | "amber" | "rose" | "slate";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "bg-rose-50 text-rose-700"
          : tone === "slate"
            ? "bg-slate-100 text-slate-700"
            : "bg-blue-50 text-blue-700";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-[24px] font-black leading-none text-[#172033]">{value}</p>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-[12px] font-black text-[#172033]">
        {value || "-"}
      </p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center">
      <section className="w-full max-w-[620px] rounded-3xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-black tracking-[-0.04em] text-[#172033]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}