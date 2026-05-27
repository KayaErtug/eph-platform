import Link from "next/link";
import { ArrowLeft, Cookie } from "lucide-react";

const sections = [
  {
    title: "1. Amaç",
    text: [
      "Bu Çerez Politikası, EPH Platformu üzerinde kullanılan çerezlerin ve benzeri teknolojilerin hangi amaçlarla kullanıldığını açıklamak için hazırlanmıştır.",
      "EPH Platformu, kullanıcı deneyimini geliştirmek, oturum güvenliğini sağlamak ve platformun teknik işleyişini sürdürebilmek amacıyla çerezlerden yararlanabilir.",
    ],
  },
  {
    title: "2. Çerez Nedir?",
    text: [
      "Çerezler, internet siteleri tarafından kullanıcının tarayıcısına veya cihazına kaydedilen küçük veri dosyalarıdır.",
      "Bu dosyalar sayesinde platform; oturum bilgilerini, kullanıcı tercihlerini ve teknik çalışma verilerini hatırlayabilir.",
    ],
  },
  {
    title: "3. Kullanılan Çerez Türleri",
    items: [
      "Zorunlu çerezler: Platformun güvenli ve doğru şekilde çalışması için gereklidir.",
      "Oturum çerezleri: Kullanıcının giriş durumunu ve oturum güvenliğini sağlar.",
      "Tercih çerezleri: Kullanıcının tema, bildirim veya görünüm tercihlerini hatırlamak için kullanılabilir.",
      "Performans çerezleri: Platformun teknik performansını ve hata takibini iyileştirmek için kullanılabilir.",
      "Bildirim teknolojileri: Push notification abonelikleri ve görev hatırlatmaları için kullanılabilir.",
    ],
  },
  {
    title: "4. Çerez Kullanım Amaçları",
    items: [
      "Kullanıcı oturumunun güvenli şekilde sürdürülmesi",
      "Platform özelliklerinin düzgün çalışması",
      "Kullanıcı tercihlerinin hatırlanması",
      "Bildirim ve görev hatırlatma sistemlerinin çalıştırılması",
      "Sistem performansının ölçülmesi",
      "Hata tespiti ve teknik iyileştirme yapılması",
      "Yetkisiz erişimlerin önlenmesi",
    ],
  },
  {
    title: "5. Reklam ve Takip Çerezleri",
    text: [
      "EPH Platformu’nun temel işleyişinde kullanıcıların özel müşteri verilerini hedefli reklam amacıyla kullanan bir yapı bulunmaz.",
      "Kullanıcı CRM verileri, müşteri notları, portföy ilişkileri ve özel ticari bilgiler reklam, pazarlama veya üçüncü kişi takibi amacıyla kullanılamaz.",
    ],
  },
  {
    title: "6. Zorunlu Çerezler",
    text: [
      "Zorunlu çerezler, platformun güvenli şekilde çalışması için gereklidir.",
      "Bu çerezler devre dışı bırakıldığında giriş yapma, oturum koruma, bildirim alma veya bazı platform özelliklerini kullanma konusunda sorun yaşanabilir.",
    ],
  },
  {
    title: "7. Bildirim ve PWA Teknolojileri",
    text: [
      "EPH Platformu, kullanıcı izniyle push notification, PWA kayıtları ve görev hatırlatma sistemleri kullanabilir.",
      "Bu teknolojiler; mesaj bildirimleri, görev alarmı, sistem uyarıları ve güvenlik bildirimleri göndermek için kullanılabilir.",
    ],
  },
  {
    title: "8. Kullanıcı Tercihleri",
    text: [
      "Kullanıcılar tarayıcı ayarları üzerinden çerezleri silebilir, sınırlandırabilir veya engelleyebilir.",
      "Ancak bazı zorunlu çerezlerin kapatılması platformun düzgün çalışmasını engelleyebilir.",
    ],
  },
  {
    title: "9. Veri Güvenliği",
    text: [
      "Çerezler ve benzeri teknolojiler aracılığıyla elde edilen teknik veriler, platform güvenliği ve kullanıcı deneyimi amacıyla sınırlı şekilde işlenir.",
      "EPH Platformu, kullanıcı mahremiyeti ve veri güvenliği ilkelerine uygun hareket eder.",
    ],
  },
  {
    title: "10. Platform Anayasası ile Uyum",
    text: [
      "Bu Çerez Politikası, EPH Platform Anayasası v1.0’da yer alan kullanıcı mahremiyeti, veri güvenliği, adil rekabet ve admin erişim sınırları ilkeleriyle birlikte yorumlanır.",
    ],
  },
];

export default function CerezPolitikasiPage() {
  return (
    <main className="min-h-screen bg-[#07111F] px-4 py-6 text-[#0F172A]">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[32px] bg-[#F8FAFC] shadow-2xl">
        <header className="bg-gradient-to-br from-[#0B1F44] via-[#123B7A] to-[#1D4ED8] p-6 text-white">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white"
          >
            <ArrowLeft size={16} />
            Ana Sayfaya Dön
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Cookie size={30} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-100">
                EPH Platformu
              </p>

              <h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight">
                Çerez Politikası
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Platformun teknik işleyişi, kullanıcı tercihleri ve bildirim
                sistemleri için kullanılan çerezleri açıklayan metindir.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-5 md:p-8">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-4 text-[21px] font-black tracking-tight text-[#0B1F44]">
                {section.title}
              </h2>

              {section.text?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mb-3 text-sm font-medium leading-7 text-slate-600"
                >
                  {paragraph}
                </p>
              ))}

              {section.items && (
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm font-semibold leading-6 text-slate-600"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="rounded-[30px] bg-[#0B1F44] p-6 text-center text-white">
            <h2 className="text-[24px] font-black">EPH Platformu</h2>
            <p className="mt-2 text-sm font-semibold text-white/70">
              Teknik güvenlik, kullanıcı deneyimi ve mahremiyet birlikte korunur.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}