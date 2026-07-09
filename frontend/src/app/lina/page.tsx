import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LinaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F8FF] px-4 py-8">
      <section className="w-full max-w-md rounded-[32px] border-2 border-[#C7D6E8] bg-white p-6 text-center shadow-[0_18px_55px_rgba(31,41,55,0.10)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF3F8] text-4xl">
          ⏸
        </div>

        <h1 className="mt-5 text-2xl font-black text-[#0B2559]">
          Lina Geçici Olarak Pasif
        </h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-[#52637A]">
          Platformdaki ana modüller ve işlemler tamamlandıktan sonra Lina yeniden
          ele alınacak ve kontrollü biçimde devreye alınacaktır.
        </p>

        <div className="mt-5 rounded-2xl border border-[#D7E2EF] bg-[#F8FAFC] px-4 py-3 text-sm font-bold leading-6 text-[#334155]">
          Mevcut Lina kodları ve geliştirmeleri korunmuştur. Herhangi bir veri
          silinmemiştir.
        </div>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition hover:bg-[#1D4ED8]"
        >
          Ana Sayfaya Dön
        </Link>
      </section>
    </main>
  );
}