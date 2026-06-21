"use client";

import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";

import api from "@/lib/api";

type Props = {
  open: boolean;
  unitId: string;
  defaultOwnerName?: string | null;
  defaultOwnerPhone?: string | null;
  defaultOwnerEmail?: string | null;
  onClose: () => void;
  onCreated: () => void;
};

type AuthorityLetterQuota = {
  limit: number;
  used: number;
  remaining: number;
  overLimitCost: number;
  isOverLimit?: boolean;
  package?: {
    code?: string;
    name?: string;
    activePortfolioLimit?: number;
  };
};

const authorityTypes = [
  { value: "SATIS", label: "Satış" },
  { value: "KIRALAMA", label: "Kiralama" },
  { value: "SATIS_VE_KIRALAMA", label: "Satış + Kiralama" },
];

const durationOptions = [30, 90, 180, 365];

export default function EphAuthorityLetterModal({
  open,
  unitId,
  defaultOwnerName,
  defaultOwnerPhone,
  defaultOwnerEmail,
  onClose,
  onCreated,
}: Props) {
  const [authorityType, setAuthorityType] = useState("SATIS");
  const [durationDays, setDurationDays] = useState(180);
  const [ownerName, setOwnerName] = useState(defaultOwnerName || "");
  const [ownerPhone, setOwnerPhone] = useState(defaultOwnerPhone || "");
  const [ownerEmail, setOwnerEmail] = useState(defaultOwnerEmail || "");
  const [loading, setLoading] = useState(false);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quota, setQuota] = useState<AuthorityLetterQuota | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setOwnerName(defaultOwnerName || "");
    setOwnerPhone(defaultOwnerPhone || "");
    setOwnerEmail(defaultOwnerEmail || "");
    setError("");
  }, [open, defaultOwnerName, defaultOwnerPhone, defaultOwnerEmail]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    setQuotaLoading(true);

    api
      .get("/eph-authority-letters/quota")
      .then((response) => {
        if (!alive) return;
        setQuota(response?.data || null);
      })
      .catch(() => {
        if (!alive) return;
        setQuota(null);
      })
      .finally(() => {
        if (alive) setQuotaLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!unitId) return;

    if (!ownerName.trim()) {
      setError("Malik adı soyadı zorunludur.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/eph-authority-letters", {
        unitId,
        authorityType,
        durationDays,
        ownerName,
        ownerPhone,
        ownerEmail,
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "EPH yetki belgesi oluşturulamadı.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10020] flex min-h-[100dvh] items-end justify-center bg-[#06194A]/55 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:items-center">
      <section className="relative max-h-[calc(100dvh-24px)] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-[#C7D6E8] bg-white p-4 text-center text-[#1F2937] shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:rounded-[28px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-[#DDE7F3] bg-white text-[#64748B] shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
          aria-label="Kapat"
        >
          <X size={18} />
        </button>

        <div className="mx-auto flex max-w-[330px] flex-col items-center justify-center text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#2563EB]">
            <FileText size={22} />
          </div>
          <h2 className="mt-2 text-center text-[18px] font-black leading-6 text-[#06194A]">
            EPH Yetki Belgesi Oluştur
          </h2>
          <p className="mt-1 text-center text-[11px] font-bold leading-5 text-[#64748B]">
            Tek sayfalık satış / kiralama yetkilendirme sözleşmesi için taslak oluşturulur.
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-[16px] border border-rose-100 bg-rose-50 px-3 py-2 text-center text-[12px] font-black leading-5 text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-3 rounded-[18px] border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-3 text-center text-[#06194A]">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-center text-[11px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
              Yetki Belgesi Hakkınız
            </p>
            {quota?.package?.name && (
              <span className="rounded-full bg-white px-2.5 py-1 text-center text-[10px] font-black text-[#2563EB]">
                {quota.package.name}
              </span>
            )}
            <p className="text-center text-[12px] font-black leading-5 text-[#06194A]">
              {quotaLoading
                ? "Hak bilgisi yükleniyor..."
                : quota
                  ? `Bu ay ${quota.used} / ${quota.limit} kullanıldı.`
                  : "Hak bilgisi şu an alınamadı."}
            </p>
            <p className="text-center text-[11px] font-bold leading-5 text-[#475569]">
              {quota
                ? quota.remaining > 0
                  ? `Kalan ücretsiz hakkınız: ${quota.remaining}`
                  : `Ücretsiz hakkınız doldu. Limit sonrası ${quota.overLimitCost} kontör / belge.`
                : "Limit sonrası maliyet: 5 kontör / belge."}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-center">
          <label className="block text-center">
            <span className="block text-center text-[11px] font-black text-[#06194A]">
              Malik Ad Soyad
            </span>
            <input
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              className="mt-1 h-11 w-full rounded-[16px] border border-[#C7D6E8] bg-[#EEF3F8] px-3 text-center text-[13px] font-bold outline-none"
              placeholder="Tapu sahibi adı soyadı"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-center">
              <span className="block text-center text-[11px] font-black text-[#06194A]">
                Telefon
              </span>
              <input
                value={ownerPhone}
                onChange={(event) => setOwnerPhone(event.target.value)}
                className="mt-1 h-11 w-full rounded-[16px] border border-[#C7D6E8] bg-[#EEF3F8] px-3 text-center text-[13px] font-bold outline-none"
                placeholder="05..."
              />
            </label>

            <label className="block text-center">
              <span className="block text-center text-[11px] font-black text-[#06194A]">
                E-posta
              </span>
              <input
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                className="mt-1 h-11 w-full rounded-[16px] border border-[#C7D6E8] bg-[#EEF3F8] px-3 text-center text-[13px] font-bold outline-none"
                placeholder="opsiyonel"
              />
            </label>
          </div>

          <div className="text-center">
            <p className="text-center text-[11px] font-black text-[#06194A]">
              Yetki Türü
            </p>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {authorityTypes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAuthorityType(item.value)}
                  className={`flex min-h-[42px] items-center justify-center rounded-[15px] border px-2 text-center text-[10px] font-black leading-4 ${
                    authorityType === item.value
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : "border-[#C7D6E8] bg-white text-[#334155]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-center text-[11px] font-black text-[#06194A]">
              Yetki Süresi
            </p>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {durationOptions.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDurationDays(day)}
                  className={`flex min-h-[42px] items-center justify-center rounded-[15px] border px-2 text-center text-[10px] font-black leading-4 ${
                    durationDays === day
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-[#C7D6E8] bg-white text-[#334155]"
                  }`}
                >
                  {day} Gün
                </button>
              ))}
            </div>
          </div>
        </div>

        {quota && (
          <p className="mt-3 text-center text-[11px] font-black leading-5 text-[#64748B]">
            {quota.remaining > 0
              ? `Taslak oluşturunca kalan ücretsiz hakkınız ${Math.max(quota.remaining - 1, 0)} olacak.`
              : `Taslak oluşturunca ${quota.overLimitCost} kontör harcanacak.`}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex min-h-[46px] items-center justify-center rounded-[16px] border border-[#C7D6E8] bg-white px-3 text-center text-[12px] font-black text-[#475569]"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex min-h-[46px] items-center justify-center rounded-[16px] bg-[#2563EB] px-3 text-center text-[12px] font-black text-white disabled:opacity-60"
          >
            {loading ? "Oluşturuluyor..." : "Taslak Oluştur"}
          </button>
        </div>
      </section>
    </div>
  );
}
