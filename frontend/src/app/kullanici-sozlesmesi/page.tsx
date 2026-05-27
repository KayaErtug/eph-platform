import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";

const sections = [
  {
    title: "1. Taraflar ve Kapsam",
    text: [
      "Bu Kullanıcı Sözleşmesi, EPH Platformu ile platforma üye olan kullanıcılar arasındaki kullanım şartlarını düzenler.",
      "Platforma üye olan her kullanıcı, bu sözleşmede yer alan kuralları, EPH Platform Anayasası’nı, KVKK Aydınlatma Metni’ni ve Gizlilik Politikası’nı kabul etmiş sayılır.",
    ],
  },
  {
    title: "2. Platformun Amacı",
    text: [
      "EPH Platformu; emlakçılar, müteahhitler, inşaat firmaları ve sektör profesyonelleri için güvenli, adil ve kapalı devre bir dijital iş ağı oluşturmayı amaçlar.",
      "Platform yalnızca ilan yayınlama alanı değil; portföy, müşteri, CRM, network, mesajlaşma ve görev yönetimi sağlayan profesyonel bir iş sistemidir.",
    ],
  },
  {
    title: "3. Kullanıcı Rolleri",
    items: [
      "EMLAKÇI: Portföy, müşteri ve CRM yönetimi yapabilir.",
      "MÜTEAHHİT: Proje ve bağımsız bölüm yönetimi yapabilir.",
      "İNŞAAT FİRMASI: Kurumsal proje ve ekip yönetimi gerçekleştirebilir.",
      "ADMİN: Platform operasyonlarını yönetebilir ancak kullanıcı özel verilerine erişemez.",
      "DENETÇİ ADMİN: Sistem loglarını ve yönetici işlemlerini denetler.",
      "YAZILIM EKİBİ: Sistem güvenliği, teknik müdahale ve veri bütünlüğünden sorumludur.",
    ],
  },
  {
    title: "4. Kullanıcı Yükümlülükleri",
    items: [
      "Kullanıcı, platforma doğru ve güncel bilgi girmekle yükümlüdür.",
      "Kullanıcı, başka kullanıcıların verilerine yetkisiz erişmeye çalışamaz.",
      "Kullanıcı, platformu haksız rekabet, veri toplama, spam, taciz veya kötüye kullanım amacıyla kullanamaz.",
      "Kullanıcı, kendi hesabının güvenliğinden sorumludur.",
      "Kullanıcı, platformda paylaştığı ilan, proje, müşteri ve ticari bilgilerin hukuka uygun olmasından sorumludur.",
    ],
  },
  {
    title: "5. Yasaklı Kullanımlar",
    items: [
      "Başka kullanıcıların müşteri bilgilerini kopyalamak veya ticari amaçla kullanmak yasaktır.",
      "Platformdaki verileri izinsiz dışa aktarmak yasaktır.",
      "Yanıltıcı ilan, sahte müşteri kaydı veya gerçek dışı portföy bilgisi eklemek yasaktır.",
      "Platformun teknik altyapısına zarar vermeye yönelik işlem yapmak yasaktır.",
      "Diğer kullanıcıların ticari ilişkilerine müdahale etmek yasaktır.",
    ],
  },
  {
    title: "6. Müşteri Verileri ve CRM İçerikleri",
    text: [
      "Kullanıcının platforma girdiği müşteri bilgileri, CRM notları, görevler, aktiviteler ve görüşme geçmişleri ilgili kullanıcıya aittir.",
      "Platform yönetimi bu verilerin sahibi değildir.",
      "Bu veriler, kullanıcı izni veya hukuki zorunluluk bulunmadıkça görüntülenemez, başka kullanıcılarla paylaşılamaz ve ticari amaçla kullanılamaz.",
    ],
  },
  {
    title: "7. Admin Yetki Sınırları",
    text: [
      "Adminler platform operasyonlarını yönetebilir; ancak kullanıcıların müşteri telefonları, özel notları, bütçe detayları, CRM görüşme geçmişi ve özel aktivitelerine erişemez.",
      "Admin yetkileri; kullanıcı yönetimi, paket yönetimi, ilan kontrolü ve sistem düzeniyle sınırlıdır.",
    ],
  },
  {
    title: "8. Yazılım Ekibi Teknik Yetkisi",
    text: [
      "Yazılım Ekibi, platform güvenliği ve teknik süreklilikten sorumludur.",
      "Yazılım Ekibi kullanıcı verilerine rutin erişim gerçekleştirmez.",
      "Teknik erişim yalnızca sistem güvenliği, teknik arıza, veri kurtarma, kullanıcı destek talebi veya hukuki zorunluluk hallerinde uygulanabilir.",
    ],
  },
  {
    title: "9. Paketler ve Kullanım Limitleri",
    text: [
      "Platformda Silver, Gold, Premium veya benzeri üyelik paketleri bulunabilir.",
      "Her paket için ilan, portföy, kullanım veya özellik limitleri belirlenebilir.",
      "Paket limitleri kullanıcıya açık şekilde bildirilir ve platform yönetimi tarafından uygulanır.",
    ],
  },
  {
    title: "10. Bildirimler",
    text: [
      "Platform; mesaj, görev hatırlatma, güvenlik uyarısı, sistem bildirimi ve kullanım bilgilendirmesi gönderebilir.",
      "Bildirimler platform deneyimini iyileştirmek ve kullanıcıyı zamanında bilgilendirmek amacıyla kullanılır.",
    ],
  },
  {
    title: "11. Denetim ve Log Kayıtları",
    text: [
      "Platform üzerinde kritik işlemler, güvenlik ve denetim amacıyla kayıt altına alınabilir.",
      "Log kayıtları kullanıcı güvenliği, sistem bütünlüğü ve kötüye kullanımın önlenmesi amacıyla saklanır.",
      "Log kayıtları silinemez, değiştirilemez ve manipüle edilemez.",
    ],
  },
  {
    title: "12. Hesap Askıya Alma ve Sonlandırma",
    text: [
      "Kullanıcının platform kurallarını ihlal etmesi, haksız rekabet oluşturması, başka kullanıcıların verilerini kötüye kullanması veya sahte bilgi girmesi halinde hesabı geçici veya kalıcı olarak sınırlandırılabilir.",
      "Ağır ihlallerde platform yönetimi gerekli teknik, idari ve hukuki işlemleri başlatabilir.",
    ],
  },
  {
    title: "13. Sorumluluk Sınırları",
    text: [
      "EPH Platformu, kullanıcıların kendi aralarındaki ticari ilişkilerden, anlaşmalardan, görüşmelerden ve doğabilecek uyuşmazlıklardan doğrudan sorumlu değildir.",
      "Platform, güvenli dijital altyapı ve iş ağı sunar; kullanıcılar kendi ticari işlemlerinden kendileri sorumludur.",
    ],
  },
  {
    title: "14. Platform Anayasası ile Uyum",
    text: [
      "Bu Kullanıcı Sözleşmesi, EPH Platform Anayasası v1.0’da yer alan kullanıcı mahremiyeti, veri güvenliği, adil rekabet, admin erişim sınırları ve veri maskeleme ilkeleriyle birlikte yorumlanır.",
      "Platform Anayasası’nda yer alan değiştirilemez temel ilkeler kullanıcı aleyhine değiştirilemez.",
    ],
  },
];

export default function KullaniciSozlesmesiPage() {
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
              <ScrollText size={30} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-100">
                EPH Platformu
              </p>

              <h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight">
                Kullanıcı Sözleşmesi
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Platform kullanım şartlarını, kullanıcı yükümlülüklerini ve
                EPH’nin etik kullanım kurallarını açıklayan temel sözleşmedir.
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
              Güvenli, adil ve etik kullanım herkes için bağlayıcıdır.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}