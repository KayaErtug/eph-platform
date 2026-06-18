"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCircle2,
  Megaphone,
  MessageCircle,
  Music2,
  Play,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Volume2,
  VolumeX,
  WandSparkles,
} from "lucide-react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

type SoundOption = {
  id: string;
  label: string;
  description: string;
  file: string;
};

type PreferenceKey = "messages" | "forum" | "pool" | "announcements" | "lina";

type Preferences = Record<PreferenceKey, boolean>;

const SOUND_OPTIONS: SoundOption[] = [
  {
    id: "soft",
    label: "EPH Classic",
    description: "Varsayılan ses",
    file: "/sounds/universfield-new-notification-036-485897.mp3",
  },
  {
    id: "notification",
    label: "EPH Soft",
    description: "Kısa ve net",
    file: "/sounds/universfield-new-notification-043-493471.mp3",
  },
  {
    id: "cat",
    label: "Kedi",
    description: "Eğlenceli ton",
    file: "/sounds/dragon-studio-cat-meow-401729.mp3",
  },
  {
    id: "doorbell",
    label: "Gitar",
    description: "Dikkat çeker",
    file: "/sounds/dragon-studio-friendly-doorbell-499660.mp3",
  },
  {
    id: "cash",
    label: "Yazarkasa",
    description: "Fırsat sesi",
    file: "/sounds/modestas123123-cash-register-kaching-sound-effect-125042.mp3",
  },
  {
    id: "off",
    label: "Sessiz",
    description: "Ses çalmasın",
    file: "",
  },
];

const DEFAULT_PREFERENCES: Preferences = {
  messages: true,
  forum: true,
  pool: true,
  announcements: true,
  lina: true,
};

export default function NotificationSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [selectedSound, setSelectedSound] = useState("soft");
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [lastTestAt, setLastTestAt] = useState("");
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("Bekliyor");
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  const selectedSoundItem = useMemo(() => {
    return SOUND_OPTIONS.find((item) => item.id === selectedSound) || SOUND_OPTIONS[0];
  }, [selectedSound]);

  useEffect(() => {
    setMounted(true);

    if (!("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission as PermissionState);
    }

    const storedSound = localStorage.getItem("ephNotificationSound") || "soft";
    const storedSoundFile =
      localStorage.getItem("ephNotificationSoundFile") ||
      "/sounds/universfield-new-notification-036-485897.mp3";
    const storedPreferences = localStorage.getItem("ephNotificationPreferences");

    setSelectedSound(storedSound);
    setSoundEnabled(localStorage.getItem("ephSoundEnabled") === "true");
    setPushEnabled(localStorage.getItem("ephPushEnabled") === "true");
    setLastTestAt(localStorage.getItem("ephNotificationLastTestAt") || "");

    if (storedPreferences) {
      try {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...JSON.parse(storedPreferences),
        });
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }

    if (storedSound !== "off") {
      localStorage.setItem("ephNotificationSoundFile", storedSoundFile);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          setServiceWorkerStatus(registration ? "Aktif" : "Bekliyor");
        })
        .catch(() => {
          setServiceWorkerStatus("Yok");
        });
    } else {
      setServiceWorkerStatus("Yok");
    }
  }, []);

  const showMessage = (message: string) => {
    setTestMessage(message);
    window.setTimeout(() => setTestMessage(""), 2600);
  };

  const markTestTime = () => {
    const value = new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    localStorage.setItem("ephNotificationLastTestAt", value);
    setLastTestAt(value);
  };

  const playSoundFile = async (file: string) => {
    if (!file) return;

    const audio = new Audio(file);
    audio.volume = 0.65;
    await audio.play();
  };

  const saveSoundChoice = async (sound: SoundOption) => {
    setSelectedSound(sound.id);

    localStorage.setItem("ephNotificationSound", sound.id);
    localStorage.setItem("ephNotificationSoundFile", sound.file);

    if (sound.id === "off") {
      localStorage.setItem("ephSoundEnabled", "false");
      setSoundEnabled(false);
      showMessage("Sessiz mod seçildi.");
      return;
    }

    try {
      await playSoundFile(sound.file);
      localStorage.setItem("ephSoundEnabled", "true");
      setSoundEnabled(true);
      markTestTime();
      showMessage(`${sound.label} seçildi.`);
    } catch {
      showMessage("Ses seçildi. Tarayıcı engellerse test butonuna bas.");
    }
  };

  const enableNotifications = async () => {
    try {
      setLoading(true);

      if (!("Notification" in window)) {
        setPermission("unsupported");
        showMessage("Bu tarayıcı bildirim desteklemiyor.");
        return;
      }

      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        localStorage.setItem("ephPushEnabled", "false");
        setPushEnabled(false);
        showMessage("Bildirim izni verilmedi.");
        return;
      }

      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.register("/push-sw.js");
        } catch {
          try {
            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          } catch {
            await navigator.serviceWorker.ready;
          }
        }

        const registration = await navigator.serviceWorker.getRegistration();
        setServiceWorkerStatus(registration ? "Aktif" : "Bekliyor");
      }

      const activeSound =
        SOUND_OPTIONS.find((item) => item.id === selectedSound) || SOUND_OPTIONS[0];

      if (activeSound.id !== "off") {
        localStorage.setItem("ephNotificationSound", activeSound.id);
        localStorage.setItem("ephNotificationSoundFile", activeSound.file);
        localStorage.setItem("ephSoundEnabled", "true");
        setSoundEnabled(true);

        try {
          await playSoundFile(activeSound.file);
          markTestTime();
        } catch {}
      }

      localStorage.setItem("ephPushEnabled", "true");
      setPushEnabled(true);

      new Notification("EPH Bildirimleri Aktif", {
        body: "Bildirim sistemi bu cihazda çalışıyor.",
        icon: "/web-app-manifest-192x192.png",
      });

      showMessage("Bildirimler aktif.");
    } catch {
      showMessage("Bildirim etkinleştirme hatası.");
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = () => {
    localStorage.setItem("ephPushEnabled", "false");
    localStorage.setItem("ephSoundEnabled", "false");

    setPushEnabled(false);
    setSoundEnabled(false);

    showMessage("Bu cihazda bildirim kapatıldı.");
  };

  const testSelectedSound = async () => {
    if (selectedSoundItem.id === "off") {
      showMessage("Sessiz mod seçili.");
      return;
    }

    try {
      await playSoundFile(selectedSoundItem.file);
      localStorage.setItem("ephSoundEnabled", "true");
      setSoundEnabled(true);
      markTestTime();
      showMessage("Ses çalışıyor.");
    } catch {
      showMessage("Tarayıcı sesi engelledi. Sayfaya dokunup tekrar dene.");
    }
  };

  const testBrowserNotification = () => {
    if (!("Notification" in window)) {
      showMessage("Tarayıcı bildirim desteklemiyor.");
      return;
    }

    if (Notification.permission !== "granted") {
      showMessage("Önce bildirim izni ver.");
      return;
    }

    new Notification("EPH Test Bildirimi", {
      body: "Bildirim sistemi bu cihazda çalışıyor.",
      icon: "/web-app-manifest-192x192.png",
    });

    markTestTime();
    showMessage("Test bildirimi gönderildi.");
  };

  const togglePreference = (key: PreferenceKey) => {
    const next = {
      ...preferences,
      [key]: !preferences[key],
    };

    setPreferences(next);
    localStorage.setItem("ephNotificationPreferences", JSON.stringify(next));
  };

  const allPreferencesActive = Object.values(preferences).every(Boolean);

  const toggleAllPreferences = () => {
    const nextValue = !allPreferencesActive;
    const next: Preferences = {
      messages: nextValue,
      forum: nextValue,
      pool: nextValue,
      announcements: nextValue,
      lina: nextValue,
    };

    setPreferences(next);
    localStorage.setItem("ephNotificationPreferences", JSON.stringify(next));
    showMessage(nextValue ? "Tüm türler açıldı." : "Tüm türler kapatıldı.");
  };

  if (!mounted) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#F7FBFF]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#1557D6] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#F7FBFF] overflow-y-auto pb-[calc(92px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-[#06194A]">
      <header className="sticky top-0 z-40 border-b border-[#C7D6E8] bg-[#F7FBFF]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[460px] items-center justify-between px-4 py-3">
          <Link
            href="/profil"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-[#C7D6E8] bg-white text-[#06194A] shadow-sm"
            aria-label="Profile dön"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="text-center">
            <h1 className="text-base font-black leading-tight">Bildirim Ayarları</h1>
            <p className="text-[11px] font-bold text-[#64748B]">EPH Bildirim Merkezi</p>
          </div>

          <Link
            href="/messages"
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-[#C7D6E8] bg-white text-[#1557D6] shadow-sm"
            aria-label="Mesajlar"
          >
            <Bell size={18} />
            {pushEnabled && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
            )}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-[460px] px-4 py-4">
        {testMessage && (
          <div className="mb-3 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-center text-xs font-black text-[#1557D6]">
            {testMessage}
          </div>
        )}

        <section className="rounded-[30px] border-2 border-[#C7D6E8] bg-white p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr] items-stretch gap-2">
            <button
              type="button"
              onClick={pushEnabled ? disableNotifications : enableNotifications}
              disabled={loading}
              className="flex min-h-[118px] flex-col items-center justify-center rounded-[28px] bg-[#2563EB] px-3 py-3 text-center text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] disabled:opacity-60"
            >
              <BellRing size={32} />
              <span className="mt-2 text-sm font-black leading-tight">Bildirimler</span>
              <span className="mt-2 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#16A34A]">
                {loading ? "..." : pushEnabled ? "AKTİF" : "AÇ"}
              </span>
            </button>

            <StatusMini
              icon={<ShieldCheck size={20} />}
              label="İzin"
              value={
                permission === "granted"
                  ? "Açık"
                  : permission === "denied"
                    ? "Kapalı"
                    : permission === "unsupported"
                      ? "Yok"
                      : "Bekliyor"
              }
              active={permission === "granted"}
            />

            <StatusMini
              icon={<Volume2 size={20} />}
              label="Ses"
              value={soundEnabled ? selectedSoundItem.label : "Kapalı"}
              active={soundEnabled}
            />

            <StatusMini
              icon={<Smartphone size={20} />}
              label="Cihaz"
              value={pushEnabled ? "Aktif" : "Pasif"}
              active={pushEnabled}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#C7D6E8] pt-3">
            <button
              type="button"
              onClick={testBrowserNotification}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-3 text-xs font-black text-white shadow-sm"
            >
              <Megaphone size={16} />
              Test Bildirimi
            </button>

            <button
              type="button"
              onClick={testSelectedSound}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-[#C7D6E8] bg-white px-3 text-xs font-black text-[#1557D6] shadow-sm"
            >
              <Play size={16} />
              Ses Testi
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-[30px] border-2 border-[#C7D6E8] bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <Music2 size={18} className="text-[#1557D6]" />
              <h2 className="text-center text-base font-black">Bildirim Sesi</h2>
            </div>

            <span className="mt-2 inline-flex max-w-full items-center justify-center rounded-full bg-[#EFF6FF] px-3 py-1 text-center text-[11px] font-black leading-4 text-[#1557D6]">
              {selectedSoundItem.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {SOUND_OPTIONS.map((sound) => {
              const active = selectedSound === sound.id;

              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => saveSoundChoice(sound)}
                  className={`min-h-[116px] rounded-[24px] border p-3 text-center transition ${
                    active
                      ? "border-[#1557D6] bg-[#EFF6FF]"
                      : "border-[#C7D6E8] bg-[#F8FAFC] hover:bg-white"
                  }`}
                  aria-label={sound.label}
                >
                  <span
                    className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl ${
                      active ? "bg-[#1557D6] text-white" : "bg-white text-[#27364F]"
                    }`}
                  >
                    {sound.id === "off" ? <VolumeX size={19} /> : <Bell size={18} />}
                  </span>
                  <span
                    className={`mt-2 block break-words text-xs font-black leading-4 ${
                      active ? "text-[#1557D6]" : "text-[#06194A]"
                    }`}
                  >
                    {sound.label}
                  </span>
                  <span className="mt-0.5 block break-words text-[10px] font-bold leading-3 text-[#64748B]">
                    {sound.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-[30px] border-2 border-[#C7D6E8] bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <Radio size={18} className="text-[#1557D6]" />
              <h2 className="text-center text-base font-black">Bildirim Türleri</h2>
            </div>

            <button
              type="button"
              onClick={toggleAllPreferences}
              className="mt-2 rounded-full bg-[#EFF6FF] px-3 py-1 text-[11px] font-black text-[#1557D6]"
            >
              Tümünü Yönet
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PreferenceRow
              label="Mesajlar"
              active={preferences.messages}
              onClick={() => togglePreference("messages")}
              icon={<MessageCircle size={18} />}
            />
            <PreferenceRow
              label="Forum"
              active={preferences.forum}
              onClick={() => togglePreference("forum")}
              icon={<Radio size={18} />}
            />
            <PreferenceRow
              label="Havuz"
              active={preferences.pool}
              onClick={() => togglePreference("pool")}
              icon={<ShieldCheck size={18} />}
            />
            <PreferenceRow
              label="Duyurular"
              active={preferences.announcements}
              onClick={() => togglePreference("announcements")}
              icon={<Megaphone size={18} />}
            />
            <PreferenceRow
              label="Lina"
              active={preferences.lina}
              onClick={() => togglePreference("lina")}
              icon={<WandSparkles size={18} />}
              wide
            />
          </div>
        </section>

        <section className="mt-4 rounded-[30px] border-2 border-[#C7D6E8] bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center justify-center gap-2 text-center">
            <Sparkles size={18} className="text-[#1557D6]" />
            <h2 className="text-center text-base font-black">Durum Merkezi</h2>
          </div>

          <div className="grid gap-2">
            <StatusLine
              label="Tarayıcı İzni"
              value={
                permission === "granted"
                  ? "Açık"
                  : permission === "denied"
                    ? "Kapalı"
                    : permission === "unsupported"
                      ? "Desteklenmiyor"
                      : "Bekliyor"
              }
              active={permission === "granted"}
            />
            <StatusLine
              label="Servis Çalışanı"
              value={serviceWorkerStatus}
              active={serviceWorkerStatus === "Aktif"}
            />
            <StatusLine
              label="Push Servisi"
              value={pushEnabled ? "Aktif" : "Pasif"}
              active={pushEnabled}
            />
            <StatusLine
              label="Son Test"
              value={lastTestAt || "Henüz test yapılmadı"}
              active={Boolean(lastTestAt)}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusMini({
  icon,
  label,
  value,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex min-h-[118px] min-w-0 flex-col items-center justify-center rounded-[24px] bg-[#F8FAFC] px-1.5 text-center">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          active ? "bg-[#ECFDF5] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"
        }`}
      >
        {icon}
      </div>
      <p className="mt-2 text-[10px] font-bold text-[#64748B]">{label}</p>
      <p className={`max-w-full break-words text-[11px] font-black leading-4 ${active ? "text-[#16A34A]" : "text-[#06194A]"}`}>
        {value}
      </p>
      {active && <CheckCircle2 size={14} className="mt-1 text-[#16A34A]" />}
    </div>
  );
}

function PreferenceRow({
  icon,
  label,
  active,
  onClick,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 items-center justify-between gap-2 rounded-[22px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-3 text-left ${
        wide ? "col-span-2" : ""
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
            active ? "bg-[#EFF6FF] text-[#1557D6]" : "bg-white text-[#64748B]"
          }`}
        >
          {icon}
        </span>
        <span className="break-words text-sm font-black leading-4 text-[#06194A]">{label}</span>
      </span>

      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          active ? "bg-[#16A34A]" : "bg-[#CBD5E1]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            active ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

function StatusLine({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[22px] bg-[#F8FAFC] px-4 py-3 text-center sm:flex-row sm:justify-between">
      <span className="break-words text-center text-sm font-black text-[#06194A]">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
          active ? "bg-[#ECFDF5] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"
        }`}
      >
        {active && <CheckCircle2 size={13} />}
        {value}
      </span>
    </div>
  );
}