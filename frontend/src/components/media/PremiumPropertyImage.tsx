"use client";

import { useEffect, useState, type ReactNode } from "react";

type PremiumPropertyImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  foregroundClassName?: string;
  backgroundClassName?: string;
  fallback?: ReactNode;
  fallbackClassName?: string;
  loading?: "eager" | "lazy";
};

export default function PremiumPropertyImage({
  src,
  alt,
  className = "",
  foregroundClassName = "",
  backgroundClassName = "",
  fallback,
  fallbackClassName = "",
  loading = "lazy",
}: PremiumPropertyImageProps) {
  const imageSource = String(src || "").trim();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageSource]);

  const showImage = Boolean(imageSource) && !failed;

  return (
    <div
      className={`relative isolate overflow-hidden bg-gradient-to-br from-[#DCE7F4] via-[#F8FAFC] to-[#D7E3F1] ${className}`}
    >
      {showImage ? (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute select-none bg-cover bg-center bg-no-repeat ${backgroundClassName}`}
            style={{
              inset: "-28px",
              backgroundImage: `url("${imageSource.replaceAll('"', "%22")}")`,
              filter: "blur(22px)",
              transform: "scale(1.12)",
              opacity: 0.88,
            }}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.10) 0%, rgba(15,23,42,0.04) 48%, rgba(15,23,42,0.16) 100%)",
            }}
          />

          <img
            src={imageSource}
            alt={alt}
            loading={loading}
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
            className={`absolute inset-0 z-[1] block select-none ${foregroundClassName}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center center",
              filter: "drop-shadow(0 10px 22px rgba(15,23,42,0.20))",
            }}
          />
        </>
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#EFF5FC] via-white to-[#E6EEF8] ${fallbackClassName}`}
        >
          {fallback || (
            <span className="px-3 text-center text-xs font-black text-[#64748B]">
              Görsel bulunamadı
            </span>
          )}
        </div>
      )}
    </div>
  );
}
