importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDS-uNx0fY6ZIxaIRboX2bmCddGx3rDNHc",
  authDomain: "eph-platform.firebaseapp.com",
  projectId: "eph-platform",
  storageBucket: "eph-platform.firebasestorage.app",
  messagingSenderId: "1092489352176",
  appId: "1:1092489352176:web:31c3ae821755d205448335",
  measurementId: "G-RD345JKGLV",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
  const openedClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const visibleClient = openedClients.find((client) => {
    return client.visibilityState === "visible";
  });

  if (visibleClient) {
    openedClients.forEach((client) => {
      client.postMessage({
        type: "EPH_PUSH_MESSAGE",
        payload,
      });
    });

    return;
  }

  const title = payload.notification?.title || "EPH Platform";

  const options = {
    body: payload.notification?.body || "Yeni bildiriminiz var.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});