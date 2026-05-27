import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

const sections = [
  {
    title: "1. Genel İlke",
    text: [
      "EPH Platformu, kullanıcı mahremiyetini temel değer olarak kabul eder.",
      "Platform üzerinde oluşturulan müşteri kayıtları, CRM notları, portföy bilgileri, görüşme geçmişleri ve ticari ilişki detayları ilgili kullanıcıya aittir.",
    ],
  },
  {
    title: "2. Gizli Kabul Edilen Veriler",
    items: [
      "Müşteri adı ve soyadı",
      "Telefon numarası",
      "E-posta adresi",
      "Bütçe bilgileri",
      "CRM notları",
      "Görev ve aktivite kayıtları",
      "Mesajlaşma içerikleri",
      "Teklif ve görüşme detayları",
      "Kullanıcıya ait ticari ilişki bilgileri",
    ],
  },
  {
    title: "3. Platform Yönetiminin Erişim Sınırları",
    text: [
      "Platform adminleri kullanıcıların özel müşteri verilerine erişemez.",
      "Adminler; müşteri telefonlarını, özel notları, bütçe detaylarını, CRM görüşme geçmişini ve kullanıcı özel aktivitelerini görüntüleyemez.",
      "Admin yetkileri yalnızca platform operasyonu, kullanıcı onayı, paket yönetimi, ilan kontrolü ve sistem düzeniyle sınırlıdır.",
    ],
  },
  {
    title: "4. Yazılım Ekibi Teknik Erişimi",
    text: [
      "Yazılım Ekibi kullanıcı verilerine rutin erişim gerçekleştirmez.",
      "Teknik erişim yalnızca sistem güvenliği, teknik arıza, veri kurtarma, kullanıcı destek talebi veya hukuki zorunluluk hallerinde uygulanabilir.",
      "Bu erişim ticari amaçla kullanılamaz ve rekabet avantajı sağlayacak şekilde değerlendirilemez.",
    ],
  },
  {
    title: "5. Rekabet Koruma Politikası",
    text: [
      "EPH Platformu, kullanıcılar arasında adil rekabeti korumayı taahhüt eder.",
      "Hiçbir yönetici, ortak, admin veya kullanıcı; başka bir kullanıcının müşteri bilgilerini ticari amaçla kullanamaz.",
      "Kullanıcıların müşteri ilişkileri, portföy bağlantıları ve CRM kayıtları rekabet hassasiyeti taşıyan özel bilgiler olarak korunur.",
    ],
  },
  {
    title: "6. Veri Maskeleme",
    items: [
      "Yetkisiz erişimlerde özel veriler maskelenmiş şekilde gösterilir.",
      "Örnek: Ahmet Yılmaz → A*** Y*****",
      "Örnek: 0555 444 22 11 → 0555 *** ** **",
      "Maskeleme sistemi, kullanıcı mahremiyetini ve rekabet dengesini korumak için uygulanır.",
    ],
  },
  {
    title: "7. Bildirimler ve Görev Hatırlatmaları",
    text: [
      "EPH Platformu, kullanıcı deneyimini iyileştirmek amacıyla mesaj bildirimleri, görev hatırlatmaları ve sistem uyarıları gönderebilir.",
      "Bu bildirimler yalnızca platform kullanımıyla ilgili bilgilendirme amacı taşır.",
    ],
  },
  {
    title: "8. Log ve Denetim Kayıtları",
    text: [
      "Platform üzerindeki kritik yönetici işlemleri, veri erişim denemeleri ve sistem müdahaleleri güvenlik amacıyla kayıt altına alınabilir.",
      "Log kayıtları kullanıcı güvenliği ve sistem bütünlüğü amacıyla saklanır.",
      "Log kayıtları silinemez, değiştirilemez ve manipüle edilemez.",
    ],
  },
  {
    title: "9. Üçüncü Kişilerle Paylaşım",
    text: [
      "Kullanıcıların müşteri bilgileri, CRM notları ve ticari ilişki detayları platform ortakları, adminler veya diğer kullanıcılarla paylaşılmaz.",
      "Veriler yalnızca teknik altyapı, hukuki yükümlülük, güvenlik veya kullanıcı talebi kapsamında sınırlı şekilde işlenebilir.",
    ],
  },
  {
    title: "10. Kullanıcı Sorumluluğu",
    items: [
      "Kullanıcılar hesap bilgilerini güvenli tutmakla yükümlüdür.",
      "Başka kullanıcıların verilerine yetkisiz erişim girişiminde bulunamaz.",
      "Platform üzerinde elde ettiği bilgileri kötüye kullanamaz.",
      "Kendi müşteri verilerinin doğruluğundan ve hukuka uygun şekilde girilmesinden sorumludur.",
    ],
  },
  {
    title: "11. Politika Güncellemeleri",
    text: [
      "Bu Gizlilik Politikası, platform güvenliği, mevzuat değişiklikleri veya hizmet kapsamındaki gelişmeler nedeniyle güncellenebilir.",
      "Ancak kullanıcı mahremiyeti, adil rekabet, admin erişim sınırları ve veri güvenliği ilkeleri kullanıcı aleyhine değiştirilemez.",
    ],
  },
  {
    title: "12. Platform Anayasası ile Uyum",
    text: [
      "Bu Gizlilik Politikası, EPH Platform Anayasası v1.0’da yer alan kullanıcı mahremiyeti, veri güvenliği, adil rekabet, veri maskeleme ve admin erişim sınırları ilkeleriyle birlikte yorumlanır.",
    ],
  },
];

export default function GizlilikPolitikasiPage() {
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
              <LockKeyhole size={30} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-100">
                EPH Platformu
              </p>

              <h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight">
                Gizlilik Politikası
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Kullanıcı mahremiyetini, rekabet hassasiyetini ve özel ticari
                verilerin korunmasını açıklayan temel gizlilik metnidir.
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
              Mahremiyet, güven ve adil rekabet platformun temel değeridir.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}