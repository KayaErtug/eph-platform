import Image from "next/image";
import Link from "next/link";

export default function PaymentTrustBand() {
  return <section aria-label="Ödeme altyapısı ve sözleşmeler" className="bg-[#F6FAFF] px-4 py-6 sm:px-6">
    <div className="mx-auto max-w-[1180px] rounded-3xl border border-[#DCE7F5] bg-white px-4 py-6 text-center sm:px-8">
      <Image src="/payments/iyzico-payment-band.png" alt="iyzico ile Öde, Mastercard, Visa, American Express ve Troy" width={1712} height={128} className="mx-auto h-auto w-full max-w-[856px]" />
      <nav aria-label="Bilgilendirme ve sözleşmeler" className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold leading-6 text-[#1F3B64]">
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/hakkimizda">Hakkımızda</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/teslimat-ve-iade">Teslimat ve İade Şartları</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/gizlilik-politikasi">Gizlilik Politikası</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/kvkk">KVKK</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/kullanici-sozlesmesi">Kullanıcı Sözleşmesi</Link>
      </nav>
    </div>
  </section>;
}
