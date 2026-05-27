import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "Değiştirilemez Temel İlkeler",
    items: [
      "Kullanıcı mahremiyeti",
      "Veri güvenliği",
      "Adil rekabet ilkesi",
      "Admin erişim sınırları",
      "Log kayıtlarının korunması",
      "Kullanıcı verilerinin ticari amaçla kullanılamaması",
    ],
  },
  {
    title: "Giriş Bildirgesi",
    text: [
      "EPH Platformu; emlakçılar, müteahhitler, inşaat firmaları ve sektör profesyonellerinin güvenli, adil, şeffaf ve etik kurallar çerçevesinde bir araya gelebilmesi amacıyla kurulmuştur.",
      "EPH Platformu yalnızca bir ilan sistemi değil; aynı zamanda güven, etik ve dijital mahremiyet ilkeleri üzerine kurulmuş profesyonel bir iş ağıdır.",
    ],
  },
  {
    title: "Temel İlkeler",
    items: [
      "Platform üzerinde bulunan müşteri bilgileri, kullanıcı notları, iletişim kayıtları, CRM içerikleri ve özel ticari veriler kullanıcıya aittir.",
      "Bu bilgiler başka kullanıcılarla paylaşılmaz, ticari amaçla kullanılamaz, kullanıcı izni veya hukuki zorunluluk bulunmadıkça görüntülenemez.",
      "Platform yönetimi kullanıcı müşterilerini devralamaz, müşteri bilgilerini göremez ve kopyalayamaz.",
      "Platform kuralları, kullanıcı hakları ve yönetim ilkeleri kamuya açık şekilde yayınlanır.",
    ],
  },
  {
    title: "Kullanıcı Hakları",
    items: [
      "Platform üzerinde oluşturulan müşteri kayıtları, kullanıcı notları ve CRM içerikleri ilgili kullanıcıya aittir.",
      "Platform yönetimi bu içeriklerin sahibi değildir.",
      "Müşteri adı soyadı, telefon numarası, e-posta adresi, bütçe bilgisi, müşteri notları, görüşme geçmişi ve CRM aktiviteleri özel veri kabul edilir.",
      "Bu veriler yalnızca kayıt sahibi kullanıcı ve sistem güvenliği zorunluluğu halinde sadece Yazılım Ekibi tarafından görüntülenebilir.",
    ],
  },
  {
    title: "Yönetim Hiyerarşisi",
    items: [
      "EMLAKÇI: Portföy, müşteri ve CRM yönetimi yapabilir.",
      "MÜTEAHHİT: Proje ve bağımsız bölüm yönetimi yapabilir.",
      "İNŞAAT FİRMASI: Kurumsal proje ve ekip yönetimi gerçekleştirebilir.",
      "ADMİN: Platform operasyonlarını yönetebilir ancak kullanıcı özel verilerine erişemez.",
      "DENETÇİ ADMİN: Sistem loglarını ve yönetici işlemlerini denetler.",
      "YAZILIM EKİBİ: Sistem güvenliği, teknik müdahale ve veri bütünlüğünden sorumlu çekirdek teknik yönetici rolüdür.",
    ],
  },
  {
    title: "Admin Yetki Sınırları",
    items: [
      "Admin müşteri telefonlarına, özel notlara, bütçe detaylarına, CRM görüşme geçmişine ve kullanıcı özel aktivitelerine erişemez.",
      "Admin yalnızca kullanıcı yönetimi, paket yönetimi, ilan kontrolü ve sistem düzeniyle ilgili işlemleri gerçekleştirebilir.",
      "Platform yöneticileri kullanıcı verilerini ticari rekabet amacıyla kullanamaz.",
    ],
  },
  {
    title: "Yazılım Ekibi Yapısı",
    items: [
      "Yazılım Ekibi rolü sistem güvenliği, veri bütünlüğü, olağanüstü teknik müdahale ve platform kurtarma işlemleri amacıyla oluşturulmuştur.",
      "Bu yetki ticari avantaj sağlamak, kullanıcı müşterilerine erişmek veya rekabet oluşturmak amacıyla kullanılamaz.",
      "Yazılım Ekibi kullanıcı verilerine rutin erişim gerçekleştirmez.",
      "Teknik erişimler yalnızca sistem güvenliği, teknik arıza, veri kurtarma, hukuki zorunluluk veya kullanıcı destek talebi durumlarında uygulanabilir.",
      "Yazılım Ekibi rolü platform arayüzlerinde görünmeyebilir.",
    ],
  },
  {
    title: "Denetim Sistemi",
    items: [
      "Kullanıcı yetki değişiklikleri, veri erişim denemeleri, yönetici işlemleri ve sistem müdahaleleri kayıt altına alınır.",
      "Log kayıtları silinemez, değiştirilemez ve manipüle edilemez.",
      "Bu kayıtlar kullanıcı güvenliği amacıyla saklanır ve yalnızca mahkeme kararıyla yetkili makamlarla paylaşılabilir.",
    ],
  },
  {
    title: "Veri Maskeleme İlkesi",
    items: [
      "Yetkisiz erişimlerde kullanıcı verileri maskeleme yöntemiyle gösterilir.",
      "Örnek: Ahmet Yılmaz → A*** Y*****",
      "Örnek: 0555 444 22 11 → 0555 *** ** **",
      "Bu sistem kullanıcı güvenliğini ve rekabet dengesini korumak amacıyla uygulanır.",
    ],
  },
  {
    title: "Etik İlkeler",
    items: [
      "EPH Platformu kullanıcıyı sömürmeyi değil korumayı temel prensip kabul eder.",
      "EPH Platformu rekabeti bozmayı değil düzenlemeyi hedefler.",
      "EPH Platformu veri toplamayı değil güven oluşturmayı esas alır.",
      "Hiçbir ticari kazanç kullanıcı mahremiyetinin, veri güvenliğinin ve etik kuralların önüne geçemez.",
    ],
  },
];

export default function PlatformAnayasasiPage() {
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
              <ShieldCheck size={30} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-100">
                EPH Platformu
              </p>

              <h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight">
                Platform Anayasası v1.0
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                EPH Platformu’nun güven, mahremiyet, adil rekabet ve etik yönetim
                ilkelerini tanımlayan temel metindir.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-5 md:p-8">
          {sections.map((section, index) => (
            <section
              key={section.title}
              className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EEF4FF] text-sm font-black text-[#1D4ED8]">
                  {index + 1}
                </div>

                <h2 className="text-[21px] font-black tracking-tight text-[#0B1F44]">
                  {section.title}
                </h2>
              </div>

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
              “Güven üzerine kurulan dijital emlak ekosistemi.”
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}