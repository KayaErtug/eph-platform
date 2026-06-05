"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Home,
  Megaphone,
  MessageCircle,
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
    description: "Varsayılan EPH bildirim sesi",
    file: "/sounds/universfield-new-notification-036-485897.mp3",
  },
  {
    id: "notification",
    label: "EPH Soft",
    description: "Daha net ve kısa bildirim tonu",
    file: "/sounds/universfield-new-notification-043-493471.mp3",
  },
  {
    id: "cat",
    label: "Kedi",
    description: "Eğlenceli kısa bildirim sesi",
    file: "/sounds/dragon-studio-cat-meow-401729.mp3",
  },
  {
    id: "doorbell",
    label: "Kapı Zili",
    description: "Dikkat çeken net uyarı sesi",
    file: "/sounds/dragon-studio-friendly-doorbell-499660.mp3",
  },
  {
    id: "cash",
    label: "Yazarkasa",
    description: "Fırsat ve satış hissi veren ses",
    file: "/sounds/modestas123123-cash-register-kaching-sound-effect-125042.mp3",
  },
  {
    id: "splash",
    label: "Su Sesi",
    description: "Hafif ve kısa alternatif",
    file: "/sounds/universfield-water-splash-02-352021.mp3",
  },
  {
    id: "off",
    label: "Sessiz",
    description: "Bildirim sesi çalmasın",
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
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("Kontrol ediliyor");
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  const selectedSoundItem = useMemo(() => {
    return (
      SOUND_OPTIONS.find((item) => item.id === selectedSound) ||
      SOUND_OPTIONS[0]
    );
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
          setServiceWorkerStatus("Kontrol edilemedi");
        });
    } else {
      setServiceWorkerStatus("Desteklenmiyor");
    }
  }, []);

  const showMessage = (message: string) => {
    setTestMessage(message);

    window.setTimeout(() => {
      setTestMessage("");
    }, 3500);
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
      showMessage("Bildirim sesi kapatıldı.");
      return;
    }

    try {
      await playSoundFile(sound.file);
      localStorage.setItem("ephSoundEnabled", "true");
      setSoundEnabled(true);
      markTestTime();
      showMessage(`${sound.label} seçildi ve test edildi.`);
    } catch {
      showMessage(
        "Ses seçildi fakat tarayıcı otomatik çalmayı engelledi. Sayfaya dokunup tekrar deneyin.",
      );
    }
  };

  const enableNotifications = async () => {
    try {
      setLoading(true);

      if (!("Notification" in window)) {
        setPermission("unsupported");
        showMessage("Bu tarayıcı bildirimleri desteklemiyor.");
        return;
      }

      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        localStorage.setItem("ephPushEnabled", "false");
        setPushEnabled(false);
        showMessage("Bildirim izni verilmedi. Tarayıcı ayarlarını kontrol edin.");
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
        SOUND_OPTIONS.find((item) => item.id === selectedSound) ||
        SOUND_OPTIONS[0];

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
        body: "Yeni mesaj, forum, havuz ve Lina bildirimleri için izin verildi.",
        icon: "/web-app-manifest-192x192.png",
      });

      showMessage("Bildirimler başarıyla etkinleştirildi.");
    } catch {
      showMessage("Bildirim etkinleştirme sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = () => {
    localStorage.setItem("ephPushEnabled", "false");
    localStorage.setItem("ephSoundEnabled", "false");

    setPushEnabled(false);
    setSoundEnabled(false);

    showMessage("Bildirim ve ses ayarı bu cihazda kapatıldı.");
  };

  const testSelectedSound = async () => {
    if (selectedSoundItem.id === "off") {
      showMessage("Sessiz mod seçili. Ses çalınmadı.");
      return;
    }

    try {
      await playSoundFile(selectedSoundItem.file);
      localStorage.setItem("ephSoundEnabled", "true");
      setSoundEnabled(true);
      markTestTime();
      showMessage("Seçili bildirim sesi çalışıyor.");
    } catch {
      showMessage("Tarayıcı sesi engelledi. Sayfaya dokunup tekrar deneyin.");
    }
  };

  const testBrowserNotification = () => {
    if (!("Notification" in window)) {
      showMessage("Bu tarayıcı bildirim desteklemiyor.");
      return;
    }

    if (Notification.permission !== "granted") {
      showMessage("Önce Bildirimleri Etkinleştir butonuna basın.");
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
    showMessage("Bildirim tercihi güncellendi.");
  };

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1557D6] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FBFF] pb-24 text-[#06194A]">
      <header className="sticky top-0 z-40 border-b border-[#DDE7F3] bg-[#F7FBFF]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/profil"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Profile dön"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="text-center">
            <h1 className="text-base font-black">Bildirim Ayarları</h1>
            <p className="text-[11px] font-bold text-[#64748B]">
              Ses, izin ve cihaz merkezi
            </p>
          </div>

          <Link
            href="/messages"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE7F3] bg-white text-[#06194A] shadow-sm"
            aria-label="Mesajlar"
          >
            <MessageCircle size={18} />
            {pushEnabled && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#0F766E]" />
            )}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-5">
        {testMessage && (
          <div className="mb-4 rounded-[24px] border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-center text-sm font-black text-[#1557D6]">
            {testMessage}
          </div>
        )}

        <section className="rounded-[34px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6] shadow-sm">
            <BellRing size={34} />
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight">
            EPH Bildirim Merkezi
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[#64748B]">
            Mesaj, forum, havuz, duyuru ve Lina bildirimlerini bu cihaz için
            yönet.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Pill text={permission === "granted" ? "İzin açık" : "İzin bekliyor"} color="#1557D6" bg="#EFF6FF" />
            <Pill text={soundEnabled ? selectedSoundItem.label : "Ses kapalı"} color="#0F766E" bg="#ECFDF5" />
            <Pill text={pushEnabled ? "Cihaz aktif" : "Cihaz pasif"} color="#EA580C" bg="#FFF7ED" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniStat
              label="Tarayıcı"
              value={
                permission === "granted"
                  ? "Açık"
                  : permission === "denied"
                    ? "Engelli"
                    : permission === "unsupported"
                      ? "Yok"
                      : "Bekliyor"
              }
            />
            <MiniStat label="Push" value={pushEnabled ? "Aktif" : "Pasif"} />
            <MiniStat label="Worker" value={serviceWorkerStatus} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={enableNotifications}
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0F49BD] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Etkinleştiriliyor
                </>
              ) : (
                <>
                  <BellRing size={18} />
                  Bildirimleri Etkinleştir
                </>
              )}
            </button>

            <button
              type="button"
              onClick={disableNotifications}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-black text-red-600"
            >
              <VolumeX size={18} />
              Bu Cihazda Kapat
            </button>
          </div>
        </section>

        <MenuGroup title="Bildirim Sesi">
          {SOUND_OPTIONS.map((sound) => {
            const active = selectedSound === sound.id;

            return (
              <button
                key={sound.id}
                type="button"
                onClick={() => saveSoundChoice(sound)}
                className={`flex items-center gap-3 rounded-3xl px-4 py-4 text-left transition ${
                  active ? "bg-[#EFF6FF]" : "bg-[#F8FAFC] hover:bg-[#EFF6FF]"
                }`}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
                  style={{ color: active ? "#1557D6" : "#64748B" }}
                >
                  {sound.id === "off" ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[#06194A]">
                    {sound.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-[#64748B]">
                    {sound.description}
                  </span>
                </span>

                {active ? (
                  <CheckCircle2 size={20} className="text-[#1557D6]" />
                ) : (
                  <ChevronRight size={18} className="text-[#94A3B8]" />
                )}
              </button>
            );
          })}
        </MenuGroup>

        <MenuGroup title="Test Merkezi">
          <ActionRow
            icon={<Play size={18} />}
            title="Seçili Sesi Test Et"
            value={selectedSoundItem.label}
            color="#0F766E"
            onClick={testSelectedSound}
          />
          <ActionRow
            icon={<Megaphone size={18} />}
            title="Test Bildirimi Gönder"
            value="Tarayıcı bildirimi"
            color="#1557D6"
            onClick={testBrowserNotification}
          />
          <InfoLine
            icon={<Clock3 size={18} />}
            title="Son Test"
            value={lastTestAt || "Henüz test yapılmadı"}
            color="#EA580C"
          />
        </MenuGroup>

        <MenuGroup title="Bildirim Türleri">
          <PreferenceRow
            icon={<MessageCircle size={18} />}
            title="Mesaj Bildirimleri"
            value="Yeni görüşme ve cevaplar"
            active={preferences.messages}
            onClick={() => togglePreference("messages")}
          />
          <PreferenceRow
            icon={<Radio size={18} />}
            title="Forum Bildirimleri"
            value="Yeni talep ve etkileşimler"
            active={preferences.forum}
            onClick={() => togglePreference("forum")}
          />
          <PreferenceRow
            icon={<Home size={18} />}
            title="Havuz Bildirimleri"
            value="Eşleşme ve portföy fırsatları"
            active={preferences.pool}
            onClick={() => togglePreference("pool")}
          />
          <PreferenceRow
            icon={<Sparkles size={18} />}
            title="Sistem Duyuruları"
            value="EPH yenilikleri ve duyurular"
            active={preferences.announcements}
            onClick={() => togglePreference("announcements")}
          />
          <PreferenceRow
            icon={<WandSparkles size={18} />}
            title="Lina Bildirimleri"
            value="Lina önerileri ve hatırlatmaları"
            active={preferences.lina}
            onClick={() => togglePreference("lina")}
          />
        </MenuGroup>

        <MenuGroup title="Kontrol Notları">
          <InfoLine
            icon={<ShieldCheck size={18} />}
            title="Tarayıcı İzni"
            value="İzin engelliyse adres çubuğundaki kilit simgesinden açılmalı."
            color="#1557D6"
          />
          <InfoLine
            icon={<Smartphone size={18} />}
            title="Mobil Kullanım"
            value="iPhone bazı sesleri kullanıcı dokunuşu olmadan çalmayabilir."
            color="#EA580C"
          />
        </MenuGroup>
      </section>
    </main>
  );
}

function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex min-h-8 items-center justify-center rounded-full px-3 text-xs font-black"
      style={{ color, backgroundColor: bg }}
    >
      {text}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[#DDE7F3] bg-[#F8FAFC] p-3 text-center">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black text-[#06194A]">
        {value}
      </div>
    </div>
  );
}

function MenuGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-[30px] border border-[#DDE7F3] bg-white p-3 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
      <h3 className="px-2 pb-3 text-center text-xs font-black uppercase tracking-[0.16em] text-[#94A3B8]">
        {title}
      </h3>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function ActionRow({
  icon,
  title,
  value,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-4 text-left transition hover:bg-[#EFF6FF]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
        style={{ color }}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#06194A]">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[#64748B]">
          {value}
        </span>
      </span>

      <ChevronRight size={18} className="text-[#94A3B8]" />
    </button>
  );
}

function PreferenceRow({
  icon,
  title,
  value,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-4 text-left transition hover:bg-[#EFF6FF]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
        style={{ color: active ? "#1557D6" : "#64748B" }}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#06194A]">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[#64748B]">
          {value}
        </span>
      </span>

      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          active ? "bg-[#1557D6]" : "bg-[#CBD5E1]"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            active ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

function InfoLine({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-[#F8FAFC] px-4 py-4 text-left">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
        style={{ color }}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#06194A]">{title}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-5 text-[#64748B]">
          {value}
        </span>
      </span>
    </div>
  );
}