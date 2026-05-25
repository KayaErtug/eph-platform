self.addEventListener("push", function (event) {
  let data = {
    title: "EPH Platform",
    body: "Yeni bildiriminiz var.",
    url: "/messages",
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.error("Push verisi okunamadı:", error);
    }
  }

  const title = data.title || "EPH Platform";

  const options = {
    body: data.body || "Yeni bildiriminiz var.",
    icon: "/web-app-manifest-192x192.png",
    badge: "/favicon-96x96.png",
    data: {
      url: data.url || "/messages",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/messages";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});