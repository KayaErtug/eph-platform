"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth.store";

type AdminFlagBannerProps = {
  className?: string;
};

type BannerItem = {
  src: string;
  alt: string;
};

const ADMIN_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

const TURAN_BANNERS: BannerItem[] = [
  {
    src: "/turan/turan-muhtac.png",
    alt: "Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!",
  },
  {
    src: "/turan/turan-vatan.png",
    alt: "Vatan ne Türkiye'dir Türklere, ne Türkistan; Vatan büyük ve müebbet bir ülkedir Türklere Turan.",
  },
  {
    src: "/turan/turan-bugunden.png",
    alt: "Bugünden sonra divanda, dergahta, bargahta, mecliste ve meydanda Türkçeden başka dil kullanılmayacaktır.",
  },
  {
    src: "/turan/turan-har_icinde.png",
    alt: "Har içinde biten gonca güle minnet eylemem.",
  },
  {
    src: "/turan/turan-yufka.png",
    alt: "Yufka yüreklilerle çetin yollar aşılmaz.",
  },
];

function getRandomBannerIndex(current: number) {
  if (TURAN_BANNERS.length <= 1) return 0;

  let next = current;

  while (next === current) {
    next = Math.floor(Math.random() * TURAN_BANNERS.length);
  }

  return next;
}

export default function AdminFlagBanner({ className = "" }: AdminFlagBannerProps) {
  const { user } = useAuthStore();
  const [bannerIndex, setBannerIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const role = String(user?.role || "").toUpperCase();
  const canSeeBanner = ADMIN_ROLES.includes(role);

  useEffect(() => {
    if (!canSeeBanner) return;

    setBannerIndex(Math.floor(Math.random() * TURAN_BANNERS.length));

    const timer = window.setInterval(() => {
      setVisible(false);

      window.setTimeout(() => {
        setBannerIndex((current) => getRandomBannerIndex(current));
        setVisible(true);
      }, 260);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [canSeeBanner]);

  const banner = useMemo(() => TURAN_BANNERS[bannerIndex], [bannerIndex]);

  if (!canSeeBanner) return null;

  return (
    <section
      className={`relative w-full overflow-hidden bg-white ${className}`}
      aria-label="Turan Köşesi"
    >
      <div className="relative h-[40px] md:h-[80px]">
        <img
          src={banner.src}
          alt={banner.alt}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          draggable={false}
        />
      </div>
    </section>
  );
}
