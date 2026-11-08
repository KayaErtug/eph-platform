"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Clock, FileText, MapPin, MessageCircle } from "lucide-react";

import api from "@/lib/api";

type SharedPost = {
  id: string;
  type?: string | null;
  title: string;
  description?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  urgency?: string | null;
  tags?: string[] | null;
  createdAt?: string | null;
  sharedBy?: { fullName: string; phone: string | null } | null;
};

type SpecItem = { label: string; value: string };

function typeLabel(value?: string | null) {
  if (!value) return "Talep Merkezi Kaydı";
  return String(value).replaceAll("_", " ");
}

function formatBudget(value?: number | null) {
  if (!value) return "";
  return `${Number(value).toLocaleString("tr-TR")} ₺`;
}

function formatRequestDate(value?: string | null) {
  if (!value) return "Tarih yok";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih yok";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}.${month}.${year}`;
}

function getUrgencyStyle(value?: string | null) {
  const urgency = String(value || "Normal").trim();

  if (urgency === "Acil") {
    return { label: urgency, className: "border-red-200 bg-red-50 text-red-600" };
  }
  if (urgency === "Sıcak Talep") {
    return { label: urgency, className: "border-orange-200 bg-orange-50 text-orange-700" };
  }
  if (urgency === "Müşteri Hazır") {
    return { label: urgency, className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  return { label: urgency, className: "border-slate-200 bg-slate-50 text-slate-600" };
}

function getSpecs(post: SharedPost): SpecItem[] {
  return [
    { label: "Talep Türü", value: typeLabel(post.type) },
    { label: "Yayın Tarihi", value: formatRequestDate(post.createdAt) },
  ];
}

function getWhatsAppLink(phone: string, title: string) {
  const digits = phone.replace(/\D/g, "");
  const message = `Merhaba, "${title}" başlıklı Talep Merkezi kaydı hakkında bilgi almak istiyorum.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function NetworkPostSharePage() {
  const params = useParams();
  const token = String(params?.token || "");

  const [post, setPost] = useState<SharedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    let active = true;

    (async () => {
      try {
        const response = await api.get(`/network-share/${token}`);
        if (active) setPost(response.data);
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
      <div className="flex min-h-screen items-center justify-center bg-[#FFF1D6]">
        <p className="text-[13px] font-black text-[#7A5A22]">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FFF1D6] px-6 text-center">
        <FileText size={40} className="text-[#C08A3E]" />
        <p className="max-w-xs text-[13px] font-black leading-5 text-[#3A2208]">
          {error || "Talep bulunamadı."}
        </p>
      </div>
    );
  }

  const location =
    [post.city, post.district, post.neighborhood].filter(Boolean).join(" / ") ||
    "Konum belirtilmemiş";
  const sharerPhone = post.sharedBy?.phone || "";
  const specs = getSpecs(post);
  const urgencyStyle = getUrgencyStyle(post.urgency);

  return (
    <div className="min-h-screen bg-[#FFF1D6] px-3 py-6">
      <div className="mx-auto w-full max-w-[430px]">
        <p className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.14em] text-[#EA580C]">
          EPH · Talep Merkezi
        </p>

        <section className="overflow-hidden rounded-[26px] border-2 border-[#F5A94A] bg-white shadow-[0_18px_44px_rgba(58,34,8,0.12)]">
          <div className="px-4 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#EA580C]">
              {typeLabel(post.type)}
            </p>
            <h1 className="mt-1 text-[19px] font-black leading-tight text-[#3A2208]">
              {post.title}
            </h1>
            <p className="mt-1 flex items-center justify-center gap-1 text-[12px] font-bold text-[#7A5A22]">
              <MapPin size={13} /> {location}
            </p>

            {Boolean(post.budget) && (
              <p className="mt-2 inline-flex items-center justify-center rounded-full bg-[#EA580C] px-5 py-1.5 text-[15px] font-black text-white">
                {formatBudget(post.budget)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 border-t-2 border-[#F5A94A]/40 bg-[#FFFBF3] px-3 py-2.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9.5px] font-black ${urgencyStyle.className}`}
            >
              <Clock size={11} />
              {urgencyStyle.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 border-t-2 border-[#F5A94A]/40 bg-[#FFFBF3] p-2.5">
            {specs.map((spec) => (
              <div
                key={spec.label}
                className="rounded-[14px] bg-white px-2 py-2 text-center"
              >
                <p className="text-[8.5px] font-black uppercase tracking-[0.05em] text-[#B08A52]">
                  {spec.label}
                </p>
                <p className="mt-0.5 text-[11px] font-black text-[#3A2208]">
                  {spec.value}
                </p>
              </div>
            ))}
          </div>

          {post.description && (
            <div className="border-t-2 border-[#F5A94A]/40 px-4 py-3 text-center text-[12.5px] font-bold leading-5 text-[#5C4419]">
              {post.description}
            </div>
          )}

          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 border-t-2 border-[#F5A94A]/40 px-4 py-3">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#FFE4B8] px-2.5 py-1 text-[10px] font-black text-[#7A5A22]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {post.sharedBy && (
          <section className="mt-3 overflow-hidden rounded-[22px] border-2 border-[#F5A94A] bg-white p-4 text-center shadow-[0_10px_22px_rgba(58,34,8,0.08)]">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#EA580C]">
              Bu Talebi Sizinle Paylaşan
            </p>
            <p className="mt-1 text-[15px] font-black text-[#3A2208]">
              {post.sharedBy.fullName}
            </p>

            {sharerPhone && (
              <a
                href={getWhatsAppLink(sharerPhone, post.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#16A34A] px-4 text-[13px] font-black text-white"
              >
                <MessageCircle size={16} /> WhatsApp'tan Yaz
              </a>
            )}
          </section>
        )}

        <p className="mx-auto mt-4 max-w-[340px] text-center text-[10px] font-bold leading-4 text-[#B08A52]">
          Bu sayfa yalnızca sizinle paylaşılan bu tekil talebi gösterir. EPH
          Platformu'nun diğer bölümlerine erişim üyelik gerektirir.
        </p>
      </div>
    </div>
  );
}
