"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth.store";

type AdminFlagBannerProps = {
  className?: string;
};

type QuoteItem = {
  text: string;
  highlights: string[];
};

const ADMIN_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

const TURAN_QUOTES: QuoteItem[] = [
  {
    text: "Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!",
    highlights: ["asil kanda"],
  },
  {
    text: "VATAN ne Türkiyedir Türklere, ne Türkistan, VATAN Büyük ve Müebbet bir ülkedir. TÜRKLERE TURAN",
    highlights: ["TÜRKLERE TURAN"],
  },
  {
    text: "Bugünden sonra divanda, dergahta, bargahta, mecliste ve meydanda Türkçeden başka dil kullanılmayacaktır.",
    highlights: ["Türkçeden başka dil"],
  },
  {
    text: "Har içinde biten gonca güle minnet eylemem, Arabi, Farisi bilmem; dile minnet eylemem. Sırat-ı Müstakim üzre gözetirim Rahim'i, İblisin talim ettiği yola minnet eylemem.",
    highlights: ["dile minnet eylemem"],
  },
  {
    text: "Yufka yüreklilerle çetin yollar aşılmaz; Çünkü bu yol kutludur, gider Tanrı Dağı'na.",
    highlights: ["Tanrı Dağı'na"],
  },
];

function getRandomQuoteIndex(current: number) {
  if (TURAN_QUOTES.length <= 1) return 0;

  let next = current;

  while (next === current) {
    next = Math.floor(Math.random() * TURAN_QUOTES.length);
  }

  return next;
}

function highlightText(text: string, highlights: string[]) {
  let parts: ReactNode[] = [text];

  highlights.forEach((highlight) => {
    parts = parts.flatMap((part, index) => {
      if (typeof part !== "string") return [part];

      const split = part.split(highlight);

      if (split.length === 1) return [part];

      return split.flatMap((piece, pieceIndex) => {
        const nodes: ReactNode[] = [];

        if (piece) nodes.push(piece);

        if (pieceIndex < split.length - 1) {
          nodes.push(
            <span
              key={`${highlight}-${index}-${pieceIndex}`}
              className="text-[#FFD35A]"
            >
              {highlight}
            </span>,
          );
        }

        return nodes;
      });
    });
  });

  return parts;
}

export default function AdminFlagBanner({ className = "" }: AdminFlagBannerProps) {
  const { user } = useAuthStore();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const role = String(user?.role || "").toUpperCase();
  const canSeeBanner = ADMIN_ROLES.includes(role);

  useEffect(() => {
    if (!canSeeBanner) return;

    const timer = window.setInterval(() => {
      setVisible(false);

      window.setTimeout(() => {
        setQuoteIndex((current) => getRandomQuoteIndex(current));
        setVisible(true);
      }, 260);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [canSeeBanner]);

  const quote = useMemo(() => TURAN_QUOTES[quoteIndex], [quoteIndex]);

  if (!canSeeBanner) return null;

  return (
    <section
      className={`relative w-full overflow-hidden bg-red-700 ${className}`}
      aria-label="Turan Köşesi"
    >
      <div className="relative h-[40px] md:h-[80px]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#B00000_0%,#D41313_42%,#A00000_100%)]" />
        <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_24%_40%,rgba(255,255,255,0.20),transparent_26%),radial-gradient(circle_at_64%_50%,rgba(255,255,255,0.16),transparent_32%)]" />

        <div className="absolute left-0 top-0 z-10 flex h-full w-[74px] items-center justify-center md:w-[160px]">
          <div className="relative h-[28px] w-[54px] md:h-[56px] md:w-[108px]">
            <div className="absolute left-0 top-1/2 h-[26px] w-[26px] -translate-y-1/2 rounded-full bg-white md:h-[52px] md:w-[52px]" />
            <div className="absolute left-[10px] top-1/2 h-[20px] w-[20px] -translate-y-1/2 rounded-full bg-[#D41313] md:left-[20px] md:h-[40px] md:w-[40px]" />
            <div className="absolute left-[34px] top-1/2 -translate-y-1/2 text-[13px] leading-none text-white md:left-[68px] md:text-[26px]">
              ★
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute right-0 top-0 h-full w-[42px] border-l border-yellow-300/55 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.12)_0px,rgba(255,255,255,0.12)_4px,rgba(7,26,57,0.42)_4px,rgba(7,26,57,0.42)_8px)] md:w-[64px]" />

        <div className="relative z-20 flex h-full items-center gap-2 pl-[82px] pr-[48px] md:pl-[180px] md:pr-[84px]">
          <div className="hidden shrink-0 text-[25px] font-black leading-none text-[#FFD35A] md:block">
            “
          </div>

          <p
            className={`min-w-0 flex-1 truncate text-[10px] font-black leading-none tracking-[-0.02em] text-white transition-opacity duration-300 md:text-[19px] ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            {highlightText(quote.text, quote.highlights)}
          </p>

          <div className="hidden shrink-0 items-center gap-1.5 md:flex">
            {TURAN_QUOTES.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setVisible(false);

                  window.setTimeout(() => {
                    setQuoteIndex(index);
                    setVisible(true);
                  }, 180);
                }}
                className={`h-2 w-2 rounded-full ${
                  index === quoteIndex ? "bg-[#FFD35A]" : "bg-white/35"
                }`}
                aria-label={`Turan sözü ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
