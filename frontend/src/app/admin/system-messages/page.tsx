"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

  const [selectedCities, setSelectedCities] = useState<CityOption[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [category, setCategory] = useState("DUYURU");
  const [customCategory, setCustomCategory] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const filteredUsers = useMemo(() => {
    const keyword = search.toLocaleLowerCase("tr-TR").trim();
    if (!keyword) return users;

    return users.filter((user) => {
      const text = `${user.firstName} ${user.lastName} ${user.email} ${roleLabels[user.role] || user.role} ${user.city || ""} ${user.cityPlateCode || ""}`;
      return text.toLocaleLowerCase("tr-TR").includes(keyword);
    });
  }, [search, users]);

  const filteredCityOptions = useMemo(() => {
    const keyword = citySearch.toLocaleLowerCase("tr-TR").trim();
    return allTurkeyCities.filter((item) => {
      const alreadySelected = selectedCities.some((selected) => selected.plate === item.plate);
      if (alreadySelected) return false;
      if (!keyword) return true;
      return `${item.city} ${item.plate}`.toLocaleLowerCase("tr-TR").includes(keyword);
    });
  }, [citySearch, selectedCities]);

  const selectedUsers = useMemo(() => users.filter((user) => selectedUserIds.includes(user.id)), [selectedUserIds, users]);

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

    if (recipientMode === "CITY" && selectedCities.length === 0) {
      alert("Şehre göre gönderim için en az bir şehir seçmelisin.");
      return false;
    }

    if (recipientMode === "CITY_ROLE" && selectedCities.length === 0) {
      alert("Şehir + role göre gönderim için en az bir şehir seçmelisin.");
      return false;
    }

    if (recipientMode === "CITY_ROLE" && selectedRoles.length === 0) {
      alert("Şehir + role göre gönderim için en az bir rol seçmelisin.");
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
          SUPER_ADMIN: "Yazılım Ekibi",
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
      alert("Sistem mesajı gönderildi.");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Mesaj gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const categoryLabel = (msg: SystemMessage) => {
    if (msg.category === "DIGER" && msg.customCategory) return msg.customCategory;
    return categoryLabels[msg.category] || msg.category;
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
      SUPER_ADMINLER: "Yazılım Ekibi",
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
    <main className="min-h-screen bg-slate-950 text-white">
      <AdminFlagBanner />
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-8 flex flex-col gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <div>
            <h1 className="text-4xl font-black">Kurumsal İletişim Merkezi</h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              EPH Admin adına sistem mesajı gönder. Şehir, rol ve kullanıcı bazlı hedefleme ile resmi iletişimi tek merkezden yönet.
            </p>
          </div>

          <Link href="/admin" className="rounded-xl bg-cyan-600 px-4 py-3 text-center font-bold text-white">
            Admin Paneli
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
            <h2 className="mb-6 text-center text-2xl font-black">Yeni Mesaj</h2>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["SINGLE", "Tek Kullanıcı"],
                  ["MULTIPLE", "Birden Fazla Kullanıcı"],
                  ["ROLE", "Role Göre"],
                  ["CITY", "Şehre Göre"],
                  ["CITY_ROLE", "Şehir + Role Göre"],
                  ["ALL", "Tüm Kullanıcılar"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeRecipientMode(value as RecipientMode)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                      recipientMode === value
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                        : "border-slate-800 bg-slate-900 text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(recipientMode === "SINGLE" || recipientMode === "MULTIPLE") && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Kullanıcı ara: ad, soyad, e-posta, rol veya şehir"
                    className="mb-4 w-full rounded-xl bg-white p-3 text-slate-950"
                  />

                  {recipientMode === "SINGLE" && (
                    <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full rounded-xl bg-white p-3 text-slate-950">
                      <option value="">Kullanıcı seç</option>
                      {filteredUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {fullName(user)} · {user.email} · {roleLabels[user.role] || user.role} {user.city ? `· ${user.city}` : ""}
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
                              checked ? "border-cyan-400 bg-cyan-500/15" : "border-slate-800 bg-slate-950"
                            }`}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleUser(user.id)} className="h-4 w-4" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black">{fullName(user)}</span>
                              <span className="block truncate text-xs text-slate-400">
                                {user.email} · {roleLabels[user.role] || user.role} {user.city ? `· ${user.city}` : ""}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {recipientMode === "MULTIPLE" && selectedUsers.length > 0 && (
                    <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-sm text-cyan-100">
                      Seçilen kullanıcı sayısı: <strong>{selectedUsers.length}</strong>
                    </div>
                  )}
                </div>
              )}

              {recipientMode === "ROLE" && (
                <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="w-full rounded-xl bg-white p-3 text-slate-950">
                  {selectableRoles.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              )}

              {(recipientMode === "CITY" || recipientMode === "CITY_ROLE") && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">Şehir Seçimi</p>
                      <p className="text-xs text-slate-500">Arama destekli dropdown ile birden fazla şehir seçebilirsin.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCities([]);
                        setCitySearch("");
                      }}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-300"
                    >
                      Temizle
                    </button>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCityDropdownOpen((current) => !current)}
                      className="flex w-full items-center justify-between rounded-xl bg-white p-3 text-left text-slate-950"
                    >
                      <span>{selectedCities.length > 0 ? `${selectedCities.length} şehir seçildi` : "Şehir seç"}</span>
                      <span className="text-sm font-black">▼</span>
                    </button>

                    {cityDropdownOpen && (
                      <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-slate-700 bg-white p-3 text-slate-950 shadow-2xl">
                        <input
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                          placeholder="Şehir adı veya plaka ara..."
                          className="mb-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none"
                          autoFocus
                        />
                        <div className="max-h-64 overflow-y-auto">
                          {filteredCityOptions.slice(0, 81).map((city) => (
                            <button
                              key={city.plate}
                              type="button"
                              onClick={() => addCity(city)}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-cyan-50"
                            >
                              <span>{city.city}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{city.plate}</span>
                            </button>
                          ))}
                          {filteredCityOptions.length === 0 && <div className="p-3 text-center text-sm text-slate-500">Şehir bulunamadı.</div>}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedCities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCities.map((city) => (
                        <button
                          key={city.plate}
                          type="button"
                          onClick={() => removeCity(city.plate)}
                          className="rounded-full border border-cyan-300/30 bg-cyan-500/15 px-3 py-2 text-xs font-black text-cyan-100"
                        >
                          {city.city} · {city.plate} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {recipientMode === "CITY_ROLE" && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-center text-sm font-black text-white">Rol Seçimi</p>
                  <p className="mb-4 text-center text-xs text-slate-500">Seçili şehirlerde hangi rollere gönderileceğini belirle.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectableRoles.map((role) => {
                      const checked = selectedRoles.includes(role.value);
                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => toggleRole(role.value)}
                          className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                            checked ? "border-cyan-400 bg-cyan-500/20 text-cyan-100" : "border-slate-800 bg-slate-950 text-slate-300"
                          }`}
                        >
                          {checked ? "✓ " : ""}{role.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {recipientMode === "ALL" && (
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-center text-sm font-bold text-cyan-100">
                  Bu mesaj tüm kullanıcılara gönderilecek.
                </div>
              )}

              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-center">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Tahmini Alıcı Sayısı</p>
                <p className="mt-2 text-3xl font-black text-white">{estimatedRecipientCount}</p>
              </div>

              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl bg-white p-3 text-slate-950">
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {category === "DIGER" && (
                <input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Özel kategori adı" className="w-full rounded-xl bg-white p-3 text-slate-950" />
              )}

              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık" className="w-full rounded-xl bg-white p-3 text-slate-950" />

              <textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mesaj" className="w-full resize-none rounded-xl bg-white p-3 text-slate-950" />

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
                <p className="mt-1 text-sm text-slate-500">Son gönderilen sistem mesajları.</p>
              </div>
              <button onClick={loadMessages} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-300">Yenile</button>
            </div>

            <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div key={msg.id} className="rounded-2xl bg-slate-900 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-black">{msg.title}</div>
                      <div className="mt-1 text-xs text-cyan-400">{categoryLabel(msg)}</div>
                    </div>
                    <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-slate-400">{targetLabel(msg)}</div>
                  </div>

                  <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-200">{msg.body}</div>

                  <div className="mt-4 text-xs text-slate-500">
                    {msg.visibleSenderName || "EPH Admin"} · {formatDate(msg.createdAt)}
                  </div>
                </div>
              ))}

              {messages.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">Henüz sistem mesajı yok.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
