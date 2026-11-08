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

      if (!user?.id) {
        console.log("Push bekliyor: kullanıcı henüz yüklenmedi.");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        console.log("Bu tarayıcı service worker desteklemiyor.");
        return;
      }

      if (!("PushManager" in window)) {
        console.log("Bu tarayıcı push notification desteklemiyor.");
        return;
      }

      if (!("Notification" in window)) {
        console.log("Bu tarayıcı notification desteklemiyor.");
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      const pushRegistration = await navigator.serviceWorker.register("/push-sw.js");

      if (Notification.permission === "denied") {
        setShowButton(true);
        alert("Bildirim izni kapalı. Tarayıcı ayarlarından EPH için bildirim iznini açmalısınız.");
        return;
      }

      if (Notification.permission === "default") {
        setShowButton(true);
        return;
      }

      const keyRes = await api.get("/push/public-key");
      const publicKey = keyRes.data?.publicKey;

      if (!publicKey) {
        console.log("VAPID public key bulunamadı.");
        setShowButton(true);
        return;
      }

      let subscription = await pushRegistration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await pushRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await api.post("/push/subscribe", {
        userId: user.id,
        subscription,
      });

      console.log("Push aboneliği başarıyla kaydedildi.");
      setShowButton(false);
    } catch (error) {
      console.error("PWA push kurulum hatası:", error);
      setShowButton(true);
    } finally {
      setBusy(false);
    }
  };

  const requestPermissionAndSetup = async () => {
    try {
      if (!("Notification" in window)) {
        alert("Bu tarayıcı bildirimleri desteklemiyor.");
        return;
      }

      if (Notification.permission === "denied") {
        alert("Bildirim izni kapalı. Tarayıcı ayarlarından EPH için bildirim iznini açmalısınız.");
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
          alert("Bildirim izni verilmedi.");
          return;
        }
      }

      await setupPush();
    } catch (error) {
      console.error("Bildirim izni hatası:", error);
      alert("Bildirim kurulumu tamamlanamadı.");
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

    if (Notification.permission === "granted") {
      setupPush();
      return;
    }

    setShowButton(true);
  }, [user?.id]);

  if (!showButton) return null;

  return (
    <button
      type="button"
      onClick={requestPermissionAndSetup}
      disabled={busy}
      className="fixed bottom-24 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-[#1D4ED8] px-5 py-3 text-sm font-black text-white shadow-xl transition hover:scale-[1.03] disabled:opacity-60"
    >
      {busy ? "Bildirim hazırlanıyor..." : "Bildirimleri Etkinleştir"}
    </button>
  );
}