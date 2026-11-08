import withPWA from "@ducanh2912/next-pwa";

const nextConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [{
      urlPattern: /\/api\/payments(?:\/|$)/,
      handler: "NetworkOnly",
      options: { cacheName: "eph-payments-network-only" },
    }],
  },
})({ devIndicators: false });

export default nextConfig;
