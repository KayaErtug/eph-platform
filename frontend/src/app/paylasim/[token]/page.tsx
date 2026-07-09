"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, MapPin, MessageCircle } from "lucide-react";

import api from "@/lib/api";
import PremiumPropertyImage from "@/components/media/PremiumPropertyImage";

type SharedUnit = {
  ephId: string;
  type?: string | null;
  status?: string | null;
  roomCount?: string | null;
  area?: number | null;
  price?: number | null;
  priceCurrency?: string | null;
  description?: string | null;
  images?: Array<{ url?: string; supabaseUrl?: string; isCover?: boolean }>;
  isVerified?: boolean;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  project?: {
    name?: string | null;
    city?: string | null;
    district?: string | null;
  } | null;
  sharedBy?: { fullName: string; phone: string | null } | null;
};

function formatPrice(value?: number | null, currency?: string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat belirtilmemiş";

  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₺";
  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function typeLabel(type?: string | null) {
  if (!type) return "Portföy";
  return String(type).replaceAll("_", " ");
}

function getCoverImage(unit: SharedUnit) {
  const images = Array.isArray(unit.images) ? unit.images : [];
  const cover = images.find((item) => item.isCover) || images[0];
  return cover?.supabaseUrl || cover?.url || "";
}

function getWhatsAppLink(phone: string, ephId: string) {
  const digits = phone.replace(/\D/g, "");
  const message = `Merhaba, ${ephId} numaralı Havuz portföyü hakkında bilgi almak istiyorum.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function PoolSharePage() {
  const params = useParams();
  const token = String(params?.token || "");

  const [unit, setUnit] = useState<SharedUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    let active = true;

    (async () => {
      try {
        const response = await api.get(`/pool-share/${token}`);
        if (active) setUnit(response.data);
      } catch (err: any) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              "Bu paylaşım bağlantısı geçersiz veya artık aktif değil.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <p className="text-[13px] font-black text-[#64748B]">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F1F5F9] px-6 text-center">
        <Building2 size={40} className="text-[#94A3B8]" />
        <p className="max-w-xs text-[13px] font-black leading-5 text-[#1F2937]">
          {error || "Portföy bulunamadı."}
        </p>
      </div>
    );
  }

  const location =
    [unit.project?.city, unit.project?.district].filter(Boolean).join(" / ") ||
    "Konum belirtilmemiş";
  const cover = getCoverImage(unit);
  const verified = Boolean(
    unit.isVerified ||
      unit.yetkiVerified ||
      (unit.tapuVerified && unit.photoVerified),
  );
  const sharerPhone = unit.sharedBy?.phone || "";

  return (
    <div className="min-h-screen bg-[#F1F5F9] px-3 py-6">
      <div className="mx-auto w-full max-w-[430px]">
        <p className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.14em] text-[#2563EB]">
          EPH · Emlak Portföy Havuzu
        </p>

        <section className="overflow-hidden rounded-[26px] border-2 border-[#C7D6E8] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.12)]">
          <div className="relative h-[260px] bg-[#EAF1FB]">
            <PremiumPropertyImage
              src={cover}
              alt={unit.project?.name || "Portföy"}
              className="h-full w-full"
              fallback={<Building2 size={40} />}
              fallbackClassName="text-[#2563EB]"
            />
            <div
              className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-black text-white shadow-sm ${
                verified ? "bg-emerald-600" : "bg-amber-500"
              }`}
            >
              {verified ? "EPH Onaylı" : "Kontrol Bekliyor"}
            </div>
          </div>

          <div className="px-4 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
              {typeLabel(unit.type)} • {unit.ephId}
            </p>
            <h1 className="mt-1 text-[19px] font-black leading-tight text-[#0F172A]">
              {unit.project?.name || "EPH Portföyü"}
            </h1>
            <p className="mt-1 flex items-center justify-center gap-1 text-[12px] font-bold text-[#64748B]">
              <MapPin size={13} /> {location}
            </p>
            <p className="mt-2 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-5 py-1.5 text-[17px] font-black text-white">
              {formatPrice(unit.price, unit.priceCurrency)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 border-t-2 border-[#E2EAF5] bg-[#F8FAFC] p-2.5 text-center">
            <div className="rounded-[14px] bg-white px-1 py-2 text-[10px] font-black text-[#334155]">
              {unit.roomCount || "Oda belirtilmedi"}
            </div>
            <div className="rounded-[14px] bg-white px-1 py-2 text-[10px] font-black text-[#334155]">
              {unit.area ? `${unit.area} m²` : "Alan belirtilmedi"}
            </div>
            <div className="rounded-[14px] bg-white px-1 py-2 text-[10px] font-black text-[#334155]">
              {unit.status ? String(unit.status).replaceAll("_", " ") : "Havuz"}
            </div>
          </div>

          {unit.description && (
            <div className="border-t-2 border-[#E2EAF5] px-4 py-3 text-center text-[12.5px] font-bold leading-5 text-[#475569]">
              {unit.description}
            </div>
          )}
        </section>

        {unit.sharedBy && (
          <section className="mt-3 overflow-hidden rounded-[22px] border-2 border-[#C7D6E8] bg-white p-4 text-center shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
              Bu İlanı Sizinle Paylaşan
            </p>
            <p className="mt-1 text-[15px] font-black text-[#0F172A]">
              {unit.sharedBy.fullName}
            </p>

            {sharerPhone && (
              <a
                href={getWhatsAppLink(sharerPhone, unit.ephId)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#16A34A] px-4 text-[13px] font-black text-white"
              >
                <MessageCircle size={16} /> WhatsApp'tan Yaz
              </a>
            )}
          </section>
        )}

        <p className="mx-auto mt-4 max-w-[340px] text-center text-[10px] font-bold leading-4 text-[#94A3B8]">
          Bu sayfa yalnızca sizinle paylaşılan bu tekil portföyü gösterir. EPH
          Platformu'nun diğer bölümlerine erişim üyelik gerektirir.
        </p>
      </div>
    </div>
  );
}
