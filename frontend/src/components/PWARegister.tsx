"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function PWARegister() {
  const { user } = useAuthStore();
  const [showButton, setShowButton] = useState(false);
  const [busy, setBusy] = useState(false);

  const setupPush = async () => {
    try {
      setBusy(true);

      if (!("serviceWorker" in navigator)) return;
      if (!("PushManager" in window)) return;
      if (!("Notification" in window)) return;
      if (!user?.id) return;

      await navigator.serviceWorker.register("/sw.js");
      const pushRegistration = await navigator.serviceWorker.register("/push-sw.js");

      if (Notification.permission === "denied") {
        alert("Bildirim izni kapalı. Tarayıcı ayarlarından EPH için bildirim iznini açmalısınız.");
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
      }

      const currentSubscription = await pushRegistration.pushManager.getSubscription();

      if (currentSubscription) {
        await api.post("/push/subscribe", {
          userId: user.id,
          subscription: currentSubscription,
        });

        setShowButton(false);
        return;
      }

      const keyRes = await api.get("/push/public-key");
      const publicKey = keyRes.data?.publicKey;

      if (!publicKey) return;

      const newSubscription = await pushRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await api.post("/push/subscribe", {
        userId: user.id,
        subscription: newSubscription,
      });

      setShowButton(false);
      alert("Bildirimler başarıyla etkinleştirildi.");
    } catch (error) {
      console.error("PWA push kurulum hatası:", error);
      alert("Bildirim kurulumu tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const registerSW = async () => {
      try {
        if (!("serviceWorker" in navigator)) return;

        await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.register("/push-sw.js");
      } catch (error) {
        console.error("Service worker kayıt hatası:", error);
      }
    };

    registerSW();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setShowButton(false);
      return;
    }

    if (!("Notification" in window)) {
      setShowButton(false);
      return;
    }

    if (Notification.permission !== "granted") {
      setShowButton(true);
      return;
    }

    setupPush();
  }, [user?.id]);

  if (!showButton) return null;

  return (
    <button
      type="button"
      onClick={setupPush}
      disabled={busy}
      className="fixed bottom-24 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-[#1D4ED8] px-5 py-3 text-sm font-black text-white shadow-xl transition hover:scale-[1.03] disabled:opacity-60"
    >
      {busy ? "Bildirim hazırlanıyor..." : "Bildirimleri Etkinleştir"}
    </button>
  );
}