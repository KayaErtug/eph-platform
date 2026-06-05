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
  file: string;
};

type PreferenceKey = "messages" | "forum" | "pool" | "announcements" | "lina";

type Preferences = Record<PreferenceKey, boolean>;

const SOUND_OPTIONS: SoundOption[] = [
  {
    id: "soft",
    label: "Classic",
    file: "/sounds/universfield-new-notification-036-485897.mp3",
  },
  {
    id: "notification",
    label: "Soft",
    file: "/sounds/universfield-new-notification-043-493471.mp3",
  },
  {
    id: "cat",
    label: "Kedi",
    file: "/sounds/dragon-studio-cat-meow-401729.mp3",
  },
  {
    id: "doorbell",
    label: "Gitar",
    file: "/sounds/dragon-studio-friendly-doorbell-499660.mp3",
  },
  {
    id: "cash",
    label: "Yazar",
    file: "/sounds/modestas123123-cash-register-kaching-sound-effect-125042.mp3",
  },
  {
    id: "off",
    label: "Sessiz",
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

    window.setTimeout(() => {
      setTestMessage("");
    }, 2200);
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
      showMessage(`${sound.label} seçildi.`);
    } catch {
      showMessage("Ses seçildi. Test için tekrar dokun.");
    }
  };

  const enableNotifications = async () => {
    try {
      setLoading(true);

      if (!("Notification" in window)) {
        setPermission("unsupported");
        showMessage("Tarayıcı desteklemiyor.");
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
      showMessage("Bildirim hatası.");
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = () => {
    localStorage.setItem("ephPushEnabled", "false");
    localStorage.setItem("ephSoundEnabled", "false");

    setPushEnabled(false);
    setSoundEnabled(false);

    showMessage("Bu cihazda kapatıldı.");
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
      showMessage("Ses çalışıyor.");
    } catch {
      showMessage("Tarayıcı sesi engelledi.");
    }
  };

  const testBrowserNotification = () => {
    if (!("Notification" in window)) {
      showMessage("Tarayıcı desteklemiyor.");
      return;
    }

    if (Notification.permission !== "granted") {
      showMessage("Önce izin ver.");
      return;
    }

    new Notification("EPH Test Bildirimi", {
      body: "Bildirim sistemi bu cihazda çalışıyor.",
      icon: "/web-app-manifest-192x192.png",
    });

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
    showMessage(nextValue ? "Tümü açıldı." : "Tümü kapatıldı.");
  };

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#1557D6] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="h-[100svh] overflow-hidden bg-[#F7FBFF] text-[#06194A]">
      <header className="h-[54px] bg-[#F7FBFF]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[430px] items-center justify-between px-3">
          <Link
            href="/profil"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Profile dön"
          >
            <ArrowLeft size={17} />
          </Link>

          <div className="text-center">
            <h1 className="text-[15px] font-black leading-tight">Bildirim Ayarları</h1>
            <p className="text-[10px] font-bold text-[#64748B]">EPH Bildirim Merkezi</p>
          </div>

          <Link
            href="/messages"
            className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#1557D6] shadow-sm"
            aria-label="Mesajlar"
          >
            <Bell size={17} />
            {pushEnabled && (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
            )}
          </Link>
        </div>
      </header>

      <section className="mx-auto flex h-[calc(100svh-54px)] max-w-[430px] flex-col gap-1.5 px-2.5 pb-2">
        {testMessage && (
          <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-center text-[11px] font-black text-[#1557D6]">
            {testMessage}
          </div>
        )}

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
          <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] items-stretch gap-1.5">
            <button
              type="button"
              onClick={pushEnabled ? disableNotifications : enableNotifications}
              disabled={loading}
              className="flex min-h-[92px] flex-col items-center justify-center rounded-[22px] bg-[#2563EB] px-2 py-2 text-center text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)] disabled:opacity-60"
            >
              <BellRing size={27} />
              <span className="mt-1.5 text-[13px] font-black leading-tight">
                Bildirim
              </span>
              <span className="mt-1.5 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black text-[#16A34A]">
                {loading ? "..." : pushEnabled ? "AKTİF" : "AÇ"}
              </span>
            </button>

            <StatusMini
              icon={<ShieldCheck size={18} />}
              label="İzin"
              value={
                permission === "granted"
                  ? "Açık"
                  : permission === "denied"
                    ? "Kapalı"
                    : permission === "unsupported"
                      ? "Yok"
                      : "Bekle"
              }
              active={permission === "granted"}
            />

            <StatusMini
              icon={<Volume2 size={18} />}
              label="Ses"
              value={soundEnabled ? selectedSoundItem.label : "Kapalı"}
              active={soundEnabled}
            />

            <StatusMini
              icon={<Smartphone size={18} />}
              label="Cihaz"
              value={pushEnabled ? "Aktif" : "Pasif"}
              active={pushEnabled}
            />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Music2 size={16} className="text-[#1557D6]" />
              <h2 className="text-[13px] font-black">Ses Seçimi</h2>
            </div>

            <button
              type="button"
              onClick={testSelectedSound}
              className="inline-flex items-center gap-1 text-[11px] font-black text-[#1557D6]"
            >
              Test
              <Play size={14} />
            </button>
          </div>

          <div className="grid grid-cols-6 gap-1">
            {SOUND_OPTIONS.map((sound) => {
              const active = selectedSound === sound.id;

              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => saveSoundChoice(sound)}
                  className="min-w-0 text-center"
                  aria-label={sound.label}
                >
                  <span
                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border transition ${
                      active
                        ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]"
                        : "border-[#DDE7F3] bg-[#F8FAFC] text-[#27364F]"
                    }`}
                  >
                    {sound.id === "off" ? <VolumeX size={18} /> : <Bell size={17} />}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-[9px] font-black ${
                      active ? "text-[#1557D6]" : "text-[#27364F]"
                    }`}
                  >
                    {sound.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Radio size={16} className="text-[#1557D6]" />
              <h2 className="text-[13px] font-black">Bildirim Türleri</h2>
            </div>

            <button
              type="button"
              onClick={toggleAllPreferences}
              className="text-[11px] font-black text-[#1557D6]"
            >
              Tümü
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1">
            <PreferenceTile
              label="Mesaj"
              active={preferences.messages}
              onClick={() => togglePreference("messages")}
              icon={<MessageCircle size={17} />}
            />
            <PreferenceTile
              label="Forum"
              active={preferences.forum}
              onClick={() => togglePreference("forum")}
              icon={<Radio size={17} />}
            />
            <PreferenceTile
              label="Havuz"
              active={preferences.pool}
              onClick={() => togglePreference("pool")}
              icon={<ShieldCheck size={17} />}
            />
            <PreferenceTile
              label="Duyuru"
              active={preferences.announcements}
              onClick={() => togglePreference("announcements")}
              icon={<Megaphone size={17} />}
            />
            <PreferenceTile
              label="Lina"
              active={preferences.lina}
              onClick={() => togglePreference("lina")}
              icon={<WandSparkles size={17} />}
            />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={testBrowserNotification}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[20px] bg-[#1557D6] px-2 text-left text-white shadow-[0_10px_22px_rgba(21,87,214,0.16)]"
          >
            <Megaphone size={18} />
            <span>
              <span className="block text-[12px] font-black">Test Bildirimi</span>
              <span className="block text-[10px] font-semibold text-white/80">
                Tarayıcı testi
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={testSelectedSound}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE7F3] bg-white px-2 text-left text-[#06194A] shadow-sm"
          >
            <Volume2 size={18} className="text-[#1557D6]" />
            <span>
              <span className="block text-[12px] font-black">Ses Testi</span>
              <span className="block text-[10px] font-semibold text-[#64748B]">
                {selectedSoundItem.label}
              </span>
            </span>
          </button>
        </section>

        <section className="grid grid-cols-3 gap-1.5 rounded-[22px] border border-[#DDE7F3] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <FooterStatus
            icon={<ShieldCheck size={15} />}
            label="Tarayıcı"
            value={
              permission === "granted"
                ? "Açık"
                : permission === "denied"
                  ? "Kapalı"
                  : permission === "unsupported"
                    ? "Yok"
                    : "Bekle"
            }
            active={permission === "granted"}
          />
          <FooterStatus
            icon={<Radio size={15} />}
            label="Servis"
            value={serviceWorkerStatus}
            active={serviceWorkerStatus === "Aktif"}
          />
          <FooterStatus
            icon={<Sparkles size={15} />}
            label="Push"
            value={pushEnabled ? "Aktif" : "Pasif"}
            active={pushEnabled}
          />
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
    <div className="flex min-h-[92px] min-w-0 flex-col items-center justify-center rounded-[20px] bg-[#F8FAFC] px-1 text-center">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          active ? "bg-[#ECFDF5] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"
        }`}
      >
        {icon}
      </div>
      <p className="mt-1 text-[9px] font-bold text-[#64748B]">{label}</p>
      <p className={`max-w-full truncate text-[10px] font-black ${active ? "text-[#16A34A]" : "text-[#06194A]"}`}>
        {value}
      </p>
      {active && <CheckCircle2 size={12} className="mt-0.5 text-[#16A34A]" />}
    </div>
  );
}

function PreferenceTile({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[#DDE7F3] bg-[#F8FAFC] p-1 text-center"
    >
      <span
        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-2xl ${
          active ? "bg-[#EFF6FF] text-[#1557D6]" : "bg-white text-[#64748B]"
        }`}
      >
        {icon}
      </span>
      <span className="mt-0.5 block truncate text-[9px] font-black text-[#06194A]">
        {label}
      </span>
      <span
        className={`mx-auto mt-0.5 block h-4 w-8 rounded-full p-0.5 transition ${
          active ? "bg-[#16A34A]" : "bg-[#CBD5E1]"
        }`}
      >
        <span
          className={`block h-3 w-3 rounded-full bg-white transition ${
            active ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function FooterStatus({
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
    <div className="min-w-0 border-r border-[#DDE7F3] px-1 text-center last:border-r-0">
      <div
        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${
          active ? "bg-[#ECFDF5] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"
        }`}
      >
        {icon}
      </div>
      <p className="mt-0.5 truncate text-[9px] font-bold text-[#64748B]">{label}</p>
      <p className={`truncate text-[10px] font-black ${active ? "text-[#16A34A]" : "text-[#06194A]"}`}>
        {value}
      </p>
    </div>
  );
}