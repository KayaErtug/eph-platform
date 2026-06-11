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
      className={`relative w-full overflow-hidden border-y border-red-900/20 bg-red-700 ${className}`}
      aria-label="Turan Köşesi"
    >
      <div className="relative h-[40px] md:h-[80px]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#8B0000_0%,#C41212_42%,#A10808_100%)]" />

        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.26),transparent_26%),radial-gradient(circle_at_80%_45%,rgba(255,255,255,0.18),transparent_30%)]" />

        <div className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-white md:block" />
        <div className="absolute left-7 top-1/2 hidden h-8 w-8 -translate-y-1/2 rounded-full bg-red-700 md:block" />
        <div className="absolute left-[70px] top-1/2 hidden -translate-y-1/2 text-[22px] text-white md:block">
          ★
        </div>

        <div className="absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white md:hidden" />
        <div className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-red-700 md:hidden" />
        <div className="absolute left-9 top-1/2 -translate-y-1/2 text-[11px] text-white md:hidden">
          ★
        </div>

        <div className="pointer-events-none absolute right-0 top-0 h-full w-[42px] border-l border-yellow-300/50 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_4px,rgba(7,26,57,0.42)_4px,rgba(7,26,57,0.42)_8px)] md:w-[64px]" />

        <div className="relative z-10 flex h-full items-center gap-2 pl-[66px] pr-[48px] md:pl-[128px] md:pr-[76px]">
          <div className="hidden shrink-0 text-[24px] font-black leading-none text-[#FFD35A] md:block">
            “
          </div>

          <p
            className={`min-w-0 flex-1 truncate text-[10px] font-black leading-none tracking-[-0.02em] text-white transition-opacity duration-300 md:text-[18px] ${
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
