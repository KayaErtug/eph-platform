import Link from "next/link";
import { ArrowLeft, RefreshCw, ShieldCheck, Truck } from "lucide-react";

export const metadata = {
  title: "Teslimat ve İade Şartları — EPH Platform",
  description: "Emlak Portföy Havuzu dijital hizmet teslimat, iptal ve iade koşulları.",
};

const sections = [
  {
    title: "1. Taraflar ve Kapsam",
    text: [
      "Bu Teslimat ve İade Şartları, EPH Platform (Emlak Portföy Havuzu) üzerinden sunulan dijital üyelik paketleri, portföy kredileri (PK) ve ek yazılım hizmetlerinin teslimat, iptal ve iade esaslarını belirler.",
      "Platformumuzda sunulan tüm ürün ve hizmetler gayrimenkul profesyonellerine yönelik elektronik/dijital hizmet niteliğindedir.",
    ],
  },
  {
    title: "2. Dijital Teslimat Esasları",
    text: [
      "EPH Platform üzerinde satın alınan üyelik paketleri ve kullanım hakları (Portföy Kredisi - PK), ödeme işlemi güvenli sanal POS (iyzico / 3D Secure) veya mobil mağaza (Apple / Google) üzerinden onaylandığı anda kullanıcının hesabına anında ve otomatik olarak tanımlanır.",
      "Dijital hizmet teslimatı tamamlandığında kullanıcıya kayıtlı e-posta ve SMS üzerinden işlem özeti ve fatura/dekont bilgisi iletilir. Fiziki bir kargo gönderimi söz konusu değildir.",
    ],
  },
  {
    title: "3. Cayma Hakkı ve Dijital Ürün İstisnası",
    text: [
      "6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin (ğ) bendi uyarınca; 'Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmeler' cayma hakkının istisnaları kapsamındadır.",
      "Bununla birlikte, kullanıcı memnuniyeti ilkemiz gereğince; satın alınan paketin veya PK bakiyesinin hiç kullanılmamış olması ve satın alma tarihinden itibaren 14 gün içerisinde yazılı başvuruda bulunulması durumunda iade talepleri EPH inceleme birimimiz tarafından değerlendirmeye alınır.",
    ],
  },
  {
    title: "4. İptal ve İade Prosedürü",
    text: [
      "İade talepleri info@emlakportfoyhavuzu.com e-posta adresi veya mobil uygulama içerisindeki 'Ödemelerim' ekranı üzerinden gerekçesiyle birlikte iletilir.",
      "Onaylanan iade tutarları, ödemenin yapıldığı kredi kartına veya banka hesabına yasal süre olan en geç 10 iş günü içerisinde iade edilir. İade tutarının kart ekstrenize yansıma süresi bankanıza bağlı olarak değişiklik gösterebilir.",
    ],
  },
  {
    title: "5. Hizmet Güvenliği ve Altyapı",
    text: [
      "Tüm finansal işlemler 256-bit SSL güvenlik sertifikası ve BDDK/TCMB lisanslı ödeme kuruluşu iyzico güvencesiyle 3D Secure doğrulamasıyla gerçekleştirilir.",
      "Kredi kartı bilgileriniz sunucularımızda kesinlikle saklanmaz ve işlenmez.",
    ],
  },
];

export default function TeslimatVeIadePage() {
  return (
    <main className="min-h-screen bg-[#071326] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[860px]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[13px] font-medium text-white/80 transition hover:bg-white/10"
        >
          <ArrowLeft size={16} /> Vitrine Dön
        </Link>

        <div className="mt-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#93C5FD]">
            <Truck size={14} /> Yasal Bilgilendirme
          </div>
          <h1 className="mt-4 text-[32px] font-bold tracking-tight sm:text-[40px]">
            Teslimat ve İade Şartları
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-white/70">
            EPH dijital hizmetlerinin teslimatı, iptal koşulları ve iade süreçlerine dair yasal bilgilendirme metni.
          </p>
        </div>

        <div className="mt-10 grid gap-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-[20px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8"
            >
              <h2 className="text-[18px] font-semibold text-[#BFDBFE]">
                {section.title}
              </h2>
              <div className="mt-3 grid gap-3 text-[14px] leading-7 text-white/80">
                {section.text.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[20px] border border-blue-400/20 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-6 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="text-[16px] font-bold text-white">Sorularınız mı var?</div>
            <div className="text-[13px] text-white/70">Destek ekibimiz 7/24 hizmetinizdedir.</div>
          </div>
          <a
            href="mailto:info@emlakportfoyhavuzu.com"
            className="mt-4 inline-flex items-center justify-center rounded-[12px] bg-[#2563EB] px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-[#1D4ED8] sm:mt-0"
          >
            Bize Ulaşın
          </a>
        </div>
      </div>
    </main>
  );
}
