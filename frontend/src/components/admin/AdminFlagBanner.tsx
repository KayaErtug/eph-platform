"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

const TURAN_QUOTES = [
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

function highlightQuote(text: string, highlights: string[]) {
  let result: ReactNode[] = [text];

  highlights.forEach((highlight) => {
    result = result.flatMap((part, index) => {
      if (typeof part !== "string") return [part];

      const pieces = part.split(highlight);
      if (pieces.length === 1) return [part];

      return pieces.flatMap((piece, pieceIndex) => {
        const nodes: ReactNode[] = [];

        if (piece) nodes.push(piece);

        if (pieceIndex < pieces.length - 1) {
          nodes.push(
            <span key={`${highlight}-${index}-${pieceIndex}`} className="text-[#ffd166]">
              {highlight}
            </span>,
          );
        }

        return nodes;
      });
    });
  });

  return result;
}

export default function AdminFlagBanner({ className = "" }: { className?: string }) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteVisible(false);

      window.setTimeout(() => {
        setQuoteIndex((current) => getRandomQuoteIndex(current));
        setQuoteVisible(true);
      }, 320);
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const currentQuote = useMemo(() => TURAN_QUOTES[quoteIndex], [quoteIndex]);

  return (
    <section
      className={`relative h-[20px] w-full overflow-hidden bg-[#06194A] md:h-[40px] ${className}`}
      aria-label="Turan tema bannerı"
    >
      <img
        src="/admin-bayrak.jpg"
        alt="Türk Bayrağı"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-[#06194A]/50 to-[#06194A]/94" />
      <div className="absolute inset-y-0 right-0 w-[46%] bg-gradient-to-l from-white/12 to-transparent" />

      <div className="relative flex h-full items-center gap-1.5 px-2 text-white md:gap-3 md:px-4">
        <span className="shrink-0 text-[11px] font-black leading-none text-[#ffd166] md:text-[20px]">❝</span>

        <div
          className={`min-w-0 flex-1 truncate pr-12 text-[8.5px] font-black leading-none tracking-[-0.02em] text-white transition-opacity duration-300 md:pr-24 md:text-[15px] ${
            quoteVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {highlightQuote(currentQuote.text, currentQuote.highlights)}
        </div>

        <div className="absolute right-7 top-1/2 h-[12px] w-[22px] -translate-y-1/2 overflow-hidden rounded-[2px] bg-red-700 md:right-14 md:h-[23px] md:w-[42px]">
          <div className="absolute inset-0 bg-gradient-to-r from-red-800 to-red-600" />
          <div className="absolute left-[5px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-white md:left-[10px] md:h-[14px] md:w-[14px]" />
          <div className="absolute left-[7px] top-1/2 h-[6px] w-[6px] -translate-y-1/2 rounded-full bg-red-700 md:left-[14px] md:h-[11px] md:w-[11px]" />
          <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[6px] leading-none text-white md:left-[27px] md:text-[11px]">★</div>
        </div>

        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-[3px] md:right-3 md:gap-1">
          {TURAN_QUOTES.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setQuoteVisible(false);
                window.setTimeout(() => {
                  setQuoteIndex(index);
                  setQuoteVisible(true);
                }, 180);
              }}
              className={`h-[3px] w-[3px] rounded-full md:h-1.5 md:w-1.5 ${
                quoteIndex === index ? "bg-[#ffd166]" : "bg-white/32"
              }`}
              aria-label={`Turan sözü ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
