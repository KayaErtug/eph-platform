"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BellRing, CheckCircle2, Volume2 } from "lucide-react";

type SoundOption = {
  label: string;
  value: string;
  file: string;
};

const soundOptions: SoundOption[] = [
  {
    label: "Kapalı",
    value: "off",
    file: "",
  },
  {
    label: "Gitar Bildirim",
    value: "guitar",
    file: "/sounds/universfield-new-notification-043-493471.mp3",
  },
  {
    label: "Cat Meow",
    value: "cat",
    file: "/sounds/dragon-studio-cat-meow-401729.mp3",
  },
  {
    label: "Friendly Doorbell",
    value: "doorbell",
    file: "/sounds/dragon-studio-friendly-doorbell-499660.mp3",
  },
  {
    label: "Glass Breaking",
    value: "glass",
    file: "/sounds/dragon-studio-glass-breaking-504033.mp3",
  },
  {
    label: "Cash Register",
    value: "cash",
    file: "/sounds/modestas123123-cash-register-kaching-sound-effect-125042.mp3",
  },
  {
    label: "Airplane Chime",
    value: "airplane",
    file: "/sounds/saboteurcomics-airplane-chime-466924.mp3",
  },
  {
    label: "Error Tone",
    value: "error",
    file: "/sounds/u_31vnwfmzt6-error-126627.mp3",
  },
  {
    label: "New Notification",
    value: "notification",
    file: "/sounds/universfield-new-notification-036-485897.mp3",
  },
  {
    label: "Water Splash",
    value: "water",
    file: "/sounds/universfield-water-splash-02-352021.mp3",
  },
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [selectedSound, setSelectedSound] = useState("notification");

  useEffect(() => {
    const savedSound =
      localStorage.getItem("ephNotificationSound") || "notification";

    setSelectedSound(savedSound);
  }, []);

  const saveSound = (option: SoundOption) => {
    localStorage.setItem("ephNotificationSound", option.value);
    localStorage.setItem("ephNotificationSoundFile", option.file);
    setSelectedSound(option.value);

    if (option.file) {
      const audio = new Audio(option.file);
      audio.volume = 0.6;
      audio.play().catch(() => {
        alert("Tarayıcı sesi engelledi. Bir kez sayfaya tıklayıp tekrar deneyin.");
      });
    }
  };

  return (
    <main className="min-h-screen bg-[#F4F7FB] p-5">
      <section className="mx-auto max-w-4xl">
        <header className="mb-5 rounded-[28px] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/network")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                <BellRing size={14} />
                Bildirim ayarları
              </div>

              <h1 className="mt-2 text-[28px] font-black text-[#0B1F44]">
                Mesaj Bildirim Sesi
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Yeni mesaj geldiğinde çalacak sesi buradan seçebilirsin.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-3">
          {soundOptions.map((option) => {
            const active = selectedSound === option.value;

            return (
              <button
                key={option.value}
                onClick={() => saveSound(option)}
                className={`flex items-center justify-between rounded-[24px] border p-4 text-left ${
                  active
                    ? "border-[#1D4ED8] bg-[#EEF4FF]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      active
                        ? "bg-[#1D4ED8] text-white"
                        : "bg-[#F1F5F9] text-slate-500"
                    }`}
                  >
                    <Volume2 size={20} />
                  </div>

                  <div>
                    <div className="text-sm font-black text-[#0B1F44]">
                      {option.label}
                    </div>

                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      {option.value === "off"
                        ? "Bildirim sesi çalınmaz"
                        : "Seçmek ve test etmek için tıkla"}
                    </div>
                  </div>
                </div>

                {active && (
                  <CheckCircle2 size={22} className="text-[#1D4ED8]" />
                )}
              </button>
            );
          })}
        </section>
      </section>
    </main>
  );
}