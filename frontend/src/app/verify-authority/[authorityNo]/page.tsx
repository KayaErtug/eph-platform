import Link from "next/link";
import { CheckCircle2, FileText, ShieldCheck, XCircle } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://api.emlakportfoyhavuzu.com";

type PageProps = {
  params: Promise<{
    authorityNo: string;
  }>;
};

type VerifyResponse = {
  valid?: boolean;
  message?: string;
  authorityNo?: string;
  status?: string;
  authorityType?: string;
  authorityStartDate?: string;
  authorityEndDate?: string;
  createdAt?: string;
  ownerName?: string;
  portfolio?: {
    ephId?: string;
    type?: string;
    status?: string;
    city?: string;
    district?: string;
    projectName?: string;
  };
  consultant?: {
    name?: string;
    memberCode?: string | null;
  };
};

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function authorityTypeLabel(value?: string) {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "SATIS") return "Satış";
  if (normalized === "KIRALAMA") return "Kiralama";
  if (normalized === "SATIS_VE_KIRALAMA") return "Satış ve Kiralama";
  return value || "Yetki";
}

async function getVerification(authorityNo: string): Promise<VerifyResponse> {
  try {
    const response = await fetch(
      `${API_URL}/eph-authority-letters/verify/${encodeURIComponent(authorityNo)}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        valid: false,
        message: "Belge doğrulama servisine ulaşılamadı.",
      };
    }

    return response.json();
  } catch {
    return {
      valid: false,
      message: "Belge doğrulama servisine ulaşılamadı.",
    };
  }
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-h-[66px] rounded-[18px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-3 py-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-black leading-5 text-[#06194A] break-words [overflow-wrap:anywhere]">
        {value || "—"}
      </p>
    </div>
  );
}

export default async function VerifyAuthorityPage({ params }: PageProps) {
  const { authorityNo } = await params;
  const data = await getVerification(authorityNo);
  const valid = Boolean(data.valid);

  return (
    <main className="min-h-dvh bg-[#F4F8FF] px-3 py-4 text-[#1F2937]">
      <section className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[28px] border-2 border-[#C7D6E8] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="bg-[#EFF6FF] px-4 py-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)]">
            <ShieldCheck size={28} />
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">
            EPH Belge Doğrulama
          </p>
          <h1 className="mt-1 text-[22px] font-black tracking-[-0.04em] text-[#06194A]">
            Yetki Belgesi Kontrolü
          </h1>
          <p className="mx-auto mt-2 max-w-[330px] text-[12px] font-bold leading-5 text-[#64748B]">
            Bu ekran, QR kod ile açılan EPH yetki belgesinin sistem kaydını gösterir.
          </p>
        </div>

        <div className="p-4">
          <section
            className={`rounded-[22px] border-2 p-4 text-center ${
              valid
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white">
              {valid ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
            </div>
            <h2 className="mt-2 text-[18px] font-black">
              {valid ? "Belge Geçerli" : "Belge Doğrulanamadı"}
            </h2>
            <p className="mt-1 text-[12px] font-black leading-5">
              {data.message ||
                (valid
                  ? "EPH yetki belgesi sistemde doğrulandı."
                  : "Belge kaydı bulunamadı veya pasif durumda.")}
            </p>
          </section>

          <section className="mt-4 grid grid-cols-2 gap-2">
            <InfoCard label="Belge No" value={data.authorityNo || authorityNo} />
            <InfoCard label="Durum" value={data.status} />
            <InfoCard label="Yetki Türü" value={authorityTypeLabel(data.authorityType)} />
            <InfoCard label="Malik" value={data.ownerName} />
            <InfoCard label="Başlangıç" value={formatDate(data.authorityStartDate)} />
            <InfoCard label="Bitiş" value={formatDate(data.authorityEndDate)} />
          </section>

          <section className="mt-4 rounded-[22px] border-2 border-[#C7D6E8] bg-white p-3 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#EFF6FF] text-[#2563EB]">
              <FileText size={22} />
            </div>
            <h3 className="mt-2 text-[16px] font-black text-[#06194A]">
              Portföy Bilgileri
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <InfoCard label="Portföy ID" value={data.portfolio?.ephId} />
              <InfoCard label="Portföy Tipi" value={data.portfolio?.type} />
              <InfoCard label="İşlem" value={data.portfolio?.status} />
              <InfoCard
                label="Konum"
                value={
                  data.portfolio?.city || data.portfolio?.district
                    ? `${data.portfolio?.city || ""} / ${data.portfolio?.district || ""}`
                    : "—"
                }
              />
            </div>
          </section>

          <section className="mt-4 rounded-[22px] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-3 text-center">
            <h3 className="text-[15px] font-black text-[#06194A]">
              Danışman Bilgisi
            </h3>
            <p className="mt-1 text-[13px] font-black text-[#2563EB]">
              {data.consultant?.name || "EPH Danışmanı"}
            </p>
            <p className="mt-1 text-[11px] font-bold text-[#64748B]">
              Üye Kodu: {data.consultant?.memberCode || "—"}
            </p>
          </section>

          <Link
            href="/"
            className="mt-4 flex min-h-[46px] items-center justify-center rounded-[18px] bg-[#2563EB] px-4 text-center text-[13px] font-black text-white"
          >
            EPH Ana Sayfa
          </Link>
        </div>
      </section>
    </main>
  );
}
