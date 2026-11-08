// src/app ile aynı seviyede olmalı; kökteki mevcut giriş noktasını kullanır.
export { middleware } from "../middleware";

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/|favicon.ico|LOGO_EPH.png|manifest.json|sw.js|workbox-|icons/|images/|apple-touch-icon.png).*)",
  ],
};
