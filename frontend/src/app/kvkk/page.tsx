import Link from "next/link";
import { ArrowLeft, FileShield } from "lucide-react";

const sections = [
  {
    title: "1. Amaç ve Kapsam",
    text: [
      "Bu KVKK Aydınlatma Metni, EPH Platformu kullanıcılarının kişisel verilerinin hangi amaçlarla işlendiğini, nasıl korunduğunu, kimlerle hangi şartlarda paylaşılabileceğini ve kullanıcıların haklarını açıklamak amacıyla hazırlanmıştır.",
      "EPH Platformu; emlakçılar, müteahhitler, inşaat firmaları ve sektör profesyonellerinin güvenli, adil ve etik bir dijital ekosistemde çalışmasını hedefler.",
    ],
  },
  {
    title: "2. İşlenen Kişisel Veriler",
    items: [
      "Kimlik bilgileri: ad, soyad, kullanıcı rolü",
      "İletişim bilgileri: e-posta, telefon numarası",
      "Hesap bilgileri: kullanıcı adı, şifrelenmiş parola, üyelik durumu",
      "Mesleki bilgiler: şirket adı, meslek, kullanıcı rolü",
      "Portföy bilgileri: ilan, proje, bağımsız bölüm ve stok kayıtları",
      "CRM bilgileri: müşteri kayıtları, müşteri notları, görevler ve aktiviteler",
      "İşlem güvenliği bilgileri: IP adresi, oturum bilgisi, erişim kayıtları",
      "Bildirim bilgileri: push notification abonelik bilgileri",
    ],
  },
  {
    title: "3. Özel Rekabet ve Mahremiyet Kuralı",
    text: [
      "EPH Platformu’nda kullanıcıların CRM kayıtları, müşteri notları, müşteri iletişim bilgileri ve ticari ilişki detayları özel veri kabul edilir.",
      "Bu veriler platform yönetimi tarafından ticari amaçla kullanılamaz, başka kullanıcılarla paylaşılamaz ve rekabet avantajı sağlayacak şekilde görüntülenemez.",
    ],
  },
  {
    title: "4. Kişisel Verilerin İşlenme Amaçları",
    items: [
      "Kullanıcı hesabının oluşturulması ve yönetilmesi",
      "Platform üyelik süreçlerinin yürütülmesi",
      "İlan, portföy, proje ve CRM işlemlerinin sağlanması",
      "Mesajlaşma, bildirim ve görev hatırlatma hizmetlerinin çalıştırılması",
      "Kullanıcı güvenliğinin sağlanması",
      "Hukuki yükümlülüklerin yerine getirilmesi",
      "Sistem performansı, hata takibi ve teknik güvenliğin sağlanması",
      "Platform Anayasası’nda belirtilen adil rekabet ve mahremiyet ilkelerinin uygulanması",
    ],
  },
  {
    title: "5. Hukuki Sebepler",
    items: [
      "Sözleşmenin kurulması veya ifası için gerekli olması",
      "Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi",
      "Bir hakkın tesisi, kullanılması veya korunması için veri işlemenin zorunlu olması",
      "İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat",
      "Gerekli hallerde açık rıza",
    ],
  },
  {
    title: "6. Verilerin Aktarımı",
    text: [
      "Kişisel veriler, yalnızca platform hizmetlerinin yürütülmesi, teknik altyapının sağlanması, hukuki yükümlülüklerin yerine getirilmesi ve güvenlik süreçlerinin işletilmesi amacıyla sınırlı olarak aktarılabilir.",
      "Kullanıcıların müşteri bilgileri, CRM notları ve ticari ilişki detayları; platform ortakları, adminler veya diğer kullanıcılarla paylaşılmaz.",
    ],
  },
  {
    title: "7. Yazılım Ekibi ve Teknik Erişim",
    text: [
      "Yazılım Ekibi, kullanıcı verilerine rutin erişim gerçekleştirmez.",
      "Teknik erişim yalnızca sistem güvenliği, teknik arıza, veri kurtarma, kullanıcı destek talebi veya hukuki zorunluluk hallerinde uygulanabilir.",
      "Bu erişimler mümkün olan durumlarda kayıt altına alınır ve platform güvenliği amacıyla denetlenebilir.",
    ],
  },
  {
    title: "8. Veri Güvenliği",
    items: [
      "Yetkisiz erişimlerin önlenmesi",
      "Admin erişimlerinin sınırlandırılması",
      "Özel verilerin maskeleme yöntemiyle korunması",
      "Kritik işlemlerin loglanması",
      "Şifrelerin güvenli şekilde saklanması",
      "Teknik güvenlik tedbirlerinin uygulanması",
    ],
  },
  {
    title: "9. Kullanıcı Hakları",
    items: [
      "Kişisel verilerinin işlenip işlenmediğini öğrenme",
      "İşlenmişse buna ilişkin bilgi talep etme",
      "İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme",
      "Eksik veya yanlış işlenen verilerin düzeltilmesini isteme",
      "Mevzuatta öngörülen şartlarda verilerin silinmesini veya yok edilmesini isteme",
      "İşlenen verilerin aktarıldığı üçüncü kişileri öğrenme",
      "Kanuni şartlarda işleme faaliyetlerine itiraz etme",
    ],
  },
  {
    title: "10. Başvuru ve İletişim",
    text: [
      "Kullanıcılar, kişisel verilerine ilişkin taleplerini EPH Platformu iletişim kanalları üzerinden platform yönetimine iletebilir.",
      "Başvurular, ilgili mevzuat ve platformun veri güvenliği ilkeleri çerçevesinde değerlendirilir.",
    ],
  },
  {
    title: "11. Platform Anayasası ile Uyum",
    text: [
      "Bu KVKK Aydınlatma Metni, EPH Platform Anayasası v1.0’da yer alan kullanıcı mahremiyeti, adil rekabet, veri maskeleme ve admin erişim sınırları ilkeleriyle birlikte yorumlanır.",
    ],
  },
];

export default function KvkkPage() {
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
              <FileShield size={30} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-100">
                EPH Platformu
              </p>

              <h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight">
                KVKK Aydınlatma Metni
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Kullanıcı verilerinin hangi amaçlarla işlendiğini, nasıl korunduğunu
                ve kullanıcı haklarını açıklayan bilgilendirme metnidir.
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
              Kullanıcı mahremiyeti, adil rekabet ve veri güvenliği önceliğimizdir.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}