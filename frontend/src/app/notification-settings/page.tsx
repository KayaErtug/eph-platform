"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Home,
  Megaphone,
  MessageCircle,
  Play,
  ShieldCheck,
  Smartphone,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

type SoundOption = {
  id: string;
  label: string;
  description: string;
  file: string;
};

const SOUND_OPTIONS: SoundOption[] = [
  {
    id: "notification",
    label: "Klasik Bildirim",
    description: "Standart yeni mesaj bildirimi",
    file: "/sounds/universfield-new-notification-043-493471.mp3",
  },
  {
    id: "soft",
    label: "Yumuşak Bildirim",
    description: "Daha sakin kısa bildirim sesi",
    file: "/sounds/universfield-new-notification-036-485897.mp3",
  },
  {
    id: "cat",
    label: "Kedi Sesi",
    description: "Testlerde çalışan eğlenceli ses",
    file: "/sounds/dragon-studio-cat-meow-401729.mp3",
  },
  {
    id: "doorbell",
    label: "Kapı Zili",
    description: "Net ve dikkat çeken bildirim",
    file: "/sounds/dragon-studio-friendly-doorbell-499660.mp3",
  },
  {
    id: "cash",
    label: "Kasa Sesi",
    description: "Satış / fırsat hissi veren ses",
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

export default function NotificationSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [selectedSound, setSelectedSound] = useState("notification");
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");

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

    const storedSound =
      localStorage.getItem("ephNotificationSound") || "notification";
    const storedSoundFile =
      localStorage.getItem("ephNotificationSoundFile") ||
      "/sounds/universfield-new-notification-043-493471.mp3";

    setSelectedSound(storedSound);
    setSoundEnabled(localStorage.getItem("ephSoundEnabled") === "true");
    setPushEnabled(localStorage.getItem("ephPushEnabled") === "true");

    if (storedSound !== "off") {
      localStorage.setItem("ephNotificationSoundFile", storedSoundFile);
    }
  }, []);

  const showMessage = (message: string) => {
    setTestMessage(message);

    window.setTimeout(() => {
      setTestMessage("");
    }, 3500);
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
      showMessage(`${sound.label} seçildi ve test edildi.`);
    } catch {
      showMessage(
        "Ses seçildi fakat tarayıcı otomatik çalmayı engelledi. Sesi Etkinleştir butonuna tekrar basın.",
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
        } catch {}
      }

      localStorage.setItem("ephPushEnabled", "true");
      setPushEnabled(true);

      new Notification("EPH Bildirimleri Aktif", {
        body: "Yeni mesaj ve network bildirimleri için izin verildi.",
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

    showMessage("Test bildirimi gönderildi.");
  };

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-[#DDE7F3] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#172033] shadow-sm"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-black text-[#172033]">
              Bildirim Ayarları
            </h1>
            <p className="text-xs font-bold text-[#64748B]">
              Mesaj ve network bildirimleri
            </p>
          </div>

          <Link
            href="/network"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDE7F3] bg-white text-[#172033] shadow-sm"
          >
            <MessageCircle size={18} />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        {testMessage && (
          <div className="mb-5 rounded-3xl border border-[#BFDBFE] bg-[#EFF6FF] px-5 py-4 text-center text-sm font-black text-[#1D4ED8]">
            {testMessage}
          </div>
        )}

        <section className="overflow-hidden rounded-[34px] border border-[#DDE7F3] bg-white p-6 text-center shadow-sm md:p-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#EFF6FF] text-[#2563EB]">
            <BellRing size={36} />
          </div>

          <h2 className="mt-5 text-4xl font-black leading-tight text-[#172033]">
            Bildirimleri Etkinleştir
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#64748B]">
            Yeni mesaj, network talebi ve görüşme bildirimlerini bu cihazda
            aktif hale getirin. Tarayıcı izin verirse ekranda bildirim görünür,
            seçili ses de test edilir.
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <StatusCard
              icon={<Bell size={20} />}
              label="Tarayıcı İzni"
              value={
                permission === "granted"
                  ? "Açık"
                  : permission === "denied"
                    ? "Engelli"
                    : permission === "unsupported"
                      ? "Desteklenmiyor"
                      : "Bekliyor"
              }
              active={permission === "granted"}
            />

            <StatusCard
              icon={<Volume2 size={20} />}
              label="Ses Durumu"
              value={soundEnabled ? "Açık" : "Kapalı"}
              active={soundEnabled}
            />

            <StatusCard
              icon={<Smartphone size={20} />}
              label="Cihaz Kaydı"
              value={pushEnabled ? "Aktif" : "Pasif"}
              active={pushEnabled}
            />
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={enableNotifications}
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] disabled:opacity-60"
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
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-7 py-4 text-sm font-black text-red-600"
            >
              <VolumeX size={18} />
              Bu Cihazda Kapat
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-[34px] border border-[#DDE7F3] bg-white p-6 text-center shadow-sm md:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#ECFDF5] text-[#0F766E]">
            <Volume2 size={30} />
          </div>

          <h3 className="mt-5 text-3xl font-black text-[#172033]">
            Bildirim Sesi
          </h3>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#64748B]">
            Mesaj geldiğinde çalacak sesi seçin. Ses seçildiğinde otomatik test
            edilir.
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {SOUND_OPTIONS.map((sound) => {
              const active = selectedSound === sound.id;

              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => saveSoundChoice(sound)}
                  className={`flex items-center justify-between gap-4 rounded-3xl border p-5 text-left transition ${
                    active
                      ? "border-[#2563EB] bg-[#EFF6FF]"
                      : "border-[#DDE7F3] bg-[#F8FAFC] hover:bg-white"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        active
                          ? "bg-[#2563EB] text-white"
                          : "bg-white text-[#2563EB]"
                      }`}
                    >
                      {sound.id === "off" ? (
                        <VolumeX size={20} />
                      ) : (
                        <Volume2 size={20} />
                      )}
                    </div>

                    <div>
                      <div className="text-base font-black text-[#172033]">
                        {sound.label}
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#64748B]">
                        {sound.description}
                      </div>
                    </div>
                  </div>

                  {active ? (
                    <CheckCircle2 className="shrink-0 text-[#2563EB]" size={22} />
                  ) : (
                    <ChevronRight className="shrink-0 text-[#94A3B8]" size={20} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={testSelectedSound}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-7 py-4 text-sm font-black text-white"
            >
              <Play size={18} />
              Seçili Sesi Test Et
            </button>

            <button
              type="button"
              onClick={testBrowserNotification}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#DDE7F3] bg-white px-7 py-4 text-sm font-black text-[#172033] shadow-sm"
            >
              <Megaphone size={18} />
              Test Bildirimi Gönder
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <InfoPanel
            icon={<ShieldCheck size={24} />}
            title="Kontrol Notu"
            text="Chrome veya Safari bildirim iznini daha önce engellediyse, tarayıcı adres çubuğundaki kilit simgesinden bildirim iznini tekrar açmak gerekebilir."
          />

          <InfoPanel
            icon={<Home size={24} />}
            title="Test Yolu"
            text="Bildirimleri etkinleştirdikten sonra Network veya Mesajlar ekranında yeni mesaj geldiğinde seçili ses ve bildirim akışı kontrol edilir."
          />
        </section>
      </section>
    </main>
  );
}

function StatusCard({
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
    <div className="rounded-3xl border border-[#DDE7F3] bg-[#F8FAFC] p-5 text-center">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
          active ? "bg-[#ECFDF5] text-[#0F766E]" : "bg-white text-[#64748B]"
        }`}
      >
        {icon}
      </div>

      <div className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#94A3B8]">
        {label}
      </div>

      <div
        className={`mt-2 text-lg font-black ${
          active ? "text-[#0F766E]" : "text-[#172033]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[30px] border border-[#DDE7F3] bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        {icon}
      </div>

      <h3 className="mt-4 text-xl font-black text-[#172033]">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-[#64748B]">{text}</p>
    </div>
  );
}