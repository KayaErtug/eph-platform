import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";

const sections = [
  {
    title: "1. Veri Sorumlusu",
    text: [
      "Emlak Portföy Havuzu (EPH veya Platform) kapsamında kişisel verilerin veri sorumlusu MOB RESTORAN KAFE KAFETERYA GIDA ORGANİZASYON İNŞAAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ’dir.",
      "Adres: Siteler Mah. Bursa Cad. Deniz Apt. No: 27/A, Pamukkale / Denizli",
      "Ticaret Sicil No: Denizli – 43290",
      "Vergi Dairesi: Pamukkale",
      "Vergi No: 6221758768",
      "Yetkili: Murat Yavuz",
      "EPH Platformunun yazılım geliştirme çalışmaları Mustafa Ertuğ Kaya tarafından gerçekleştirilmiştir.",
      "Yazılım geliştiricisi, kendisine teknik görev kapsamında erişim sağlanan durumlar dışında Platform kullanıcı verilerini kendi ticari amaçları için kullanamaz.",
    ],
  },
  {
    title: "2. Genel Gizlilik İlkesi",
    text: [
      "EPH Platformu; kullanıcı mahremiyetini, kişisel verilerin korunmasını, ticari sırların gizliliğini, müşteri ilişkilerinin korunmasını ve kullanıcılar arasındaki adil rekabeti temel prensip olarak kabul eder.",
      "Kullanıcıların Platform üzerinde oluşturduğu CRM kayıtları, müşteri bilgileri, portföy bağlantıları, özel notları, görüşmeleri ve ticari ilişki bilgileri ilgili kullanıcının özel çalışma alanına aittir.",
      "Bu bilgiler başka kullanıcıların veya Platform yöneticilerinin ticari avantaj sağlaması amacıyla kullanılamaz.",
    ],
  },
  {
    title: "3. İşlenebilecek Kişisel Veriler",
    items: [
      "Kimlik bilgileri: ad, soyad, kullanıcı adı ve kullanıcı rolü.",
      "İletişim bilgileri: telefon numarası ve e-posta adresi.",
      "Mesleki ve kurumsal bilgiler: emlak ofisi, şirket, müteahhitlik veya inşaat firması bilgileri ile mesleki rol ve yetkiler.",
      "Hesap bilgileri: kullanıcı hesabı, oturum bilgileri, doğrulama bilgileri, üyelik ve hesap durumu.",
      "CRM ve müşteri bilgileri: müşteri adı ve soyadı, telefon, e-posta, bütçe, gayrimenkul talebi, CRM notları, görüşmeler, görevler ve aktiviteler.",
      "Portföy ve proje bilgileri: gayrimenkul bilgileri, fiyat, adres, konum, ada/parsel bilgileri, fotoğraflar, videolar, yetki belgeleri ve yüklenen dosyalar.",
      "İletişim içerikleri: Platform içi mesajlar, bildirimler, görüşme ve işlem kayıtları.",
      "Sesli komut verileri: Lina için kullanıcının başlattığı mikrofon kaydı ve bu kayıttan elde edilen metin.",
      "Teknik bilgiler: IP adresi, tarayıcı, işletim sistemi, cihaz bilgileri, hata kayıtları, güvenlik kayıtları ve işlem logları.",
      "Konum bilgileri: kullanıcının ilgili özelliği kullanması ve gerekli izni vermesi hâlinde cihaz veya gayrimenkul konumu.",
    ],
  },
  {
    title: "4. Veri Minimizasyonu",
    text: [
      "EPH yalnızca hizmetlerin sunulması için gerekli veya meşru amaçlarla bağlantılı verileri işlemeyi amaçlar.",
      "Hizmet için gerekli olmayan kişisel verilerin toplanmaması esastır.",
    ],
  },
  {
    title: "5. Özel Nitelikli Kişisel Veriler",
    text: [
      "EPH’nin normal kullanımında sağlık bilgisi, biyometrik veri, din, siyasi düşünce, ceza mahkûmiyeti, cinsel hayat veya benzeri özel nitelikli kişisel verilerin girilmesi talep edilmez.",
      "Kullanıcıların hizmet açısından gerekli olmayan özel nitelikli kişisel verileri Platforma yüklememeleri gerekir.",
    ],
  },
  {
    title: "6. Verilerin İşlenme Amaçları",
    items: [
      "Kullanıcı hesabı oluşturmak ve yönetmek.",
      "Kullanıcı giriş ve doğrulama işlemlerini gerçekleştirmek.",
      "Üyelik sistemini işletmek.",
      "Kullanıcı rollerini ve yetkilerini yönetmek.",
      "Gayrimenkul portföylerini yönetmek.",
      "Proje ve satış süreçlerini yürütmek.",
      "CRM ve müşteri yönetimi hizmetlerini sağlamak.",
      "Platform içi iletişimi gerçekleştirmek.",
      "Mesaj, görev ve sistem bildirimleri göndermek.",
      "Üyelik, paket ve kontör işlemlerini yürütmek.",
      "Güvenliği sağlamak ve kötüye kullanımı önlemek.",
      "Teknik sorunları tespit etmek ve kullanıcı desteği sağlamak.",
      "Yasal yükümlülükleri yerine getirmek.",
      "Hukuki hakların kurulması, kullanılması veya korunmasını sağlamak.",
    ],
  },
  {
    title: "7. Hukuki İşleme Sebepleri",
    text: [
      "Kişisel veriler; kanunlarda açıkça öngörülmesi, sözleşmenin kurulması veya ifası için gerekli olması, veri sorumlusunun hukuki yükümlülüğünün yerine getirilmesi, bir hakkın tesisi, kullanılması veya korunması ve ilgili kişinin temel haklarına zarar vermemek kaydıyla veri sorumlusunun meşru menfaati gibi KVKK’da belirtilen hukuki sebeplere dayanılarak işlenebilir.",
      "Açık rıza gerektiren işlemlerde kullanıcıdan ayrıca açık rıza alınır.",
      "Aydınlatma ve açık rıza süreçleri birbirinden ayrı şekilde yürütülür.",
    ],
  },
  {
    title: "8. Kullanıcının Sisteme Girdiği Üçüncü Kişi Verileri",
    text: [
      "EPH kullanıcıları kendi müşterilerine veya üçüncü kişilere ait verileri Platforma kaydedebilir.",
      "Bu verilerin hukuka uygun şekilde elde edilmesi, gerekli aydınlatmanın yapılması, gerektiğinde izin veya açık rızanın alınması ve yalnızca meşru amaçlarla kullanılması veriyi Platforma giren kullanıcının sorumluluğundadır.",
    ],
  },
  {
    title: "9. Platform Yöneticilerinin Erişim Sınırları",
    text: [
      "Standart Platform yöneticileri kullanıcıların özel CRM verilerine rutin olarak erişemez.",
      "Müşteri telefonları, müşteri e-postaları, bütçe bilgileri, özel CRM notları, görüşme geçmişleri, görev ve aktivite içerikleri yalnızca yetkili kullanıcıların erişimine açıktır.",
      "Admin yetkileri esas olarak Platform operasyonları, kullanıcı yönetimi, ilan ve portföy incelemeleri, paket ve üyelik yönetimi, güvenlik ve sistem düzeninin korunmasıyla sınırlıdır.",
    ],
  },
  {
    title: "10. Yazılım Ekibinin Teknik Erişimi",
    text: [
      "Yazılım Ekibi kullanıcı verilerine rutin olarak erişmez.",
      "Teknik erişim yalnızca sistem arızası, güvenlik sorunu, veri kurtarma, teknik destek, kullanıcı tarafından talep edilen sorun çözümü veya hukuki zorunluluk gibi gerekli durumlarda gerçekleştirilebilir.",
      "Teknik erişim yoluyla görülen bilgiler ticari amaçlarla kullanılamaz.",
    ],
  },
  {
    title: "11. Rekabet Koruma İlkesi",
    text: [
      "Hiçbir Platform yöneticisi, çalışanı, ortağı, yazılım personeli veya başka kullanıcı; başka bir kullanıcının müşteri bilgilerini, CRM kayıtlarını, portföy bağlantılarını veya ticari ilişkilerini kendi ticari çıkarı için kullanamaz.",
      "Kullanıcıların müşteri ilişkileri EPH tarafından rekabet açısından hassas bilgiler olarak kabul edilir.",
    ],
  },
  {
    title: "12. Veri Maskeleme",
    items: [
      "Yetkisiz veya sınırlı yetkili ekranlarda kişisel veriler maskelenebilir.",
      "Örnek: Ahmet Yılmaz → A*** Y*****",
      "Örnek: 0555 444 22 11 → 0555 *** ** **",
      "Maskeleme sistemi kullanıcı mahremiyetini ve Platform içindeki rekabet dengesini korumak amacıyla uygulanır.",
    ],
  },
  {
    title: "13. Kamera, Fotoğraf, Dosya, Mikrofon ve Konum İzinleri",
    text: [
      "EPH bazı özellikleri çalıştırmak için cihaz izinleri isteyebilir.",
    ],
    items: [
      "Portföy fotoğrafı çekmek için kamera erişimi.",
      "Kullanıcının başlattığı Lina sesli komutunu kaydetmek için mikrofon erişimi.",
      "Fotoğraf veya belge yüklemek için fotoğraf ve dosya erişimi.",
      "Gayrimenkul konumunu veya kullanıcının mevcut konumunu belirlemek için konum erişimi.",
      "İzinler yalnızca ilgili özelliğin çalıştırılması amacıyla kullanılır ve kullanıcı cihaz ayarlarından izinlerini değiştirebilir.",
    ],
  },
  {
    title: "14. Bildirimler",
    text: [
      "EPH; mesaj, görev hatırlatması, işlem durumu, güvenlik uyarısı ve sistem duyurusu gibi Platform kullanımıyla ilgili bildirimler gönderebilir.",
      "Cihaz bildirimi gerektiren durumlarda işletim sistemi veya tarayıcı tarafından kullanıcıdan gerekli izin istenebilir.",
      "Mobil bildirim özelliği kapsamında Expo bildirim hizmeti kullanılır. Bildirim belirteci, cihaz adı veya modeli ve platform bilgisi, bildirimin doğru cihaza yönlendirilmesi için hesapla ilişkilendirilerek işlenebilir.",
    ],
  },
  {
    title: "15. Yapay Zekâ Destekli Özellikler",
    text: [
      "Lina yapay zekâ asistanı; yanıt oluşturma, gayrimenkul talep taslağı hazırlama, sesli komutu yazıya dönüştürme ve sesli yanıt üretme işlemlerinde OpenAI hizmetlerinden yararlanır.",
      "İşlem için gerekli yazılı mesajlar, sohbet geçmişi ve ilgili CRM, portföy veya işlem bağlamı EPH sunucusu üzerinden OpenAI’a iletilebilir. Girdilerdeki belirli kişisel verileri maskelemeye yönelik kontroller bulunur; bu kontroller tüm kişisel verilerin çıkarıldığını garanti etmez. Gereksiz kişisel veya ticari veriler paylaşılmamalıdır.",
      "Sesli komut kullanıldığında mikrofon kaydı cihazda oluşturulur ve EPH sunucusu üzerinden OpenAI’ın ses çözümleme hizmetine gönderilir. EPH sunucusunda bu ses dosyasının kalıcı olarak saklanması yapılmaz. Kaydın metne dönüştürülen içeriği yazılı sohbet ve hafıza akışına dâhil olabilir.",
      "Lina sohbet metinleri ve hafıza kayıtları EPH hesabıyla ilişkilendirilerek tutulabilir. Kullanıcı bu kayıtları Lina’nın Hafıza bölümünden yönetebilir. Veri paylaşım izninin geri çekilmesi geçmiş kayıtların silinmesiyle aynı işlem değildir.",
      "Mobil uygulamada ilgili Lina işlemlerinden önce OpenAI ile veri paylaşımı açıklanır ve açık izin istenir. İzin verilmezse bu mobil işlemler için veri aktarımı başlatılmaz; diğer EPH özellikleri kullanılabilir. İzin, bu cihazdaki hesap için saklanır ve Lina > Tercihler > OpenAI veri paylaşım izni bölümünden geri çekilebilir.",
      "OpenAI hizmetleri verileri Türkiye dışında işleyebilir. Hizmet sağlayıcının güncel veri saklama ve kullanım açıklamaları https://developers.openai.com/api/docs/guides/your-data adresindedir. EPH’nin gizlilik yükümlülükleri ve kullanıcı başvuru hakları devam eder.",
    ],
  },
  {
    title: "16. Üçüncü Taraf Hizmet Sağlayıcıları",
    text: [
      "EPH; sunucu ve hosting, veritabanı, bulut depolama, içerik dağıtımı, e-posta, bildirim, yapay zekâ, güvenlik, analitik ve diğer teknik altyapı hizmet sağlayıcılarından yararlanabilir.",
      "Bu sağlayıcılara yalnızca ilgili hizmetin yerine getirilebilmesi için gerekli veriler aktarılır.",
      "EPH kullanıcıların kişisel veya ticari verilerini reklam verenlere satmaz.",
    ],
  },
  {
    title: "17. Yurt Dışına Veri Aktarımı",
    text: [
      "EPH’nin kullandığı bazı bulut, depolama, yapay zekâ veya teknik altyapı hizmetlerinin sunucuları Türkiye dışında bulunabilir.",
      "Bu nedenle bazı veriler teknik hizmetlerin sağlanması kapsamında yurt dışında işlenebilir.",
      "Yurt dışına kişisel veri aktarımı KVKK’nın 9. maddesi ve yürürlükteki mevzuatta öngörülen aktarım mekanizmaları ve uygun güvenceler çerçevesinde gerçekleştirilir.",
    ],
  },
  {
    title: "18. Veri Güvenliği",
    text: [
      "EPH; yetkisiz erişimi önlemek, verilerin hukuka aykırı kullanımını engellemek ve veri kaybı riskini azaltmak amacıyla uygun teknik ve idari tedbirler uygular.",
    ],
    items: [
      "Rol bazlı yetkilendirme.",
      "Kimlik doğrulama ve oturum güvenliği.",
      "Güvenli bağlantı ve veri aktarımında şifreleme.",
      "Veri maskeleme.",
      "Erişim ve güvenlik logları.",
      "Yedekleme ve veri kurtarma tedbirleri.",
      "Güvenlik güncellemeleri ve teknik kontroller.",
    ],
  },
  {
    title: "19. Log ve Denetim Kayıtları",
    text: [
      "Kritik yönetici işlemleri, sistem müdahaleleri, güvenlik olayları ve veri erişim girişimleri kayıt altına alınabilir.",
      "Loglar yalnızca sistem güvenliği, denetim, hata analizi, hukuki yükümlülüklerin yerine getirilmesi ve sistem bütünlüğünün korunması amacıyla kullanılır.",
      "Log kayıtları ilgili mevzuat ve belirlenen saklama süreleri doğrultusunda bütünlüğü korunarak muhafaza edilir.",
    ],
  },
  {
    title: "20. Verilerin Saklanması ve Silinmesi",
    text: [
      "Kişisel veriler yalnızca işlenme amaçlarının gerektirdiği süre boyunca ve mevzuattan doğan zorunlu saklama süreleri kapsamında muhafaza edilir.",
      "Verinin işlenmesini gerektiren sebepler ortadan kalktığında kişisel veriler mevzuata uygun olarak silinir, yok edilir veya anonim hâle getirilir.",
      "Yasal yükümlülük nedeniyle tutulması gereken kayıtlar gerekli süre tamamlanana kadar erişimleri sınırlandırılarak saklanabilir.",
    ],
  },
  {
    title: "21. Hesap Silme ve Üyelikten Ayrılma",
    text: [
      "EPH’ye üyelik isteğe bağlıdır. Kullanıcı dilediği zaman üyelikten ayrılabilir ve hesabının silinmesini talep edebilir.",
      "Uygulama içerisinden hesap silme işlemi Profil → Hesabımı Sil bölümünden gerçekleştirilebilir.",
      "Uygulamaya erişimi olmayan kullanıcılar https://emlakportfoyhavuzu.com/hesap-silme adresinden hesap ve ilişkili kişisel verilerinin silinmesini talep edebilir.",
      "Hesap silindiğinde hesapla ilişkili kişisel veriler de silinir. Hukuki yükümlülük, mali kayıt, güvenlik, dolandırıcılığın önlenmesi veya hukuki uyuşmazlık nedeniyle saklanması zorunlu veriler yalnızca gerekli süre boyunca muhafaza edilir.",
      "Hesabın yalnızca askıya alınması veya devre dışı bırakılması hesap silme işlemi olarak kabul edilmez.",
    ],
  },
  {
    title: "22. KVKK Kapsamındaki Kullanıcı Hakları",
    items: [
      "Kişisel verilerinin işlenip işlenmediğini öğrenme.",
      "İşlenen veriler hakkında bilgi isteme.",
      "Verilerin işlenme amacını öğrenme.",
      "Verilerin amacına uygun kullanılıp kullanılmadığını öğrenme.",
      "Verilerin aktarıldığı üçüncü kişileri bilme.",
      "Yanlış veya eksik verilerin düzeltilmesini isteme.",
      "Şartları oluştuğunda verilerin silinmesini veya yok edilmesini isteme.",
      "Düzeltme veya silme işlemlerinin verilerin aktarıldığı taraflara bildirilmesini isteme.",
      "Otomatik sistemler aracılığıyla yapılan işlemler nedeniyle aleyhe bir sonuç oluşmasına itiraz etme.",
      "Hukuka aykırı veri işleme nedeniyle zarar oluşması hâlinde zararın giderilmesini isteme.",
    ],
  },
  {
    title: "23. KVKK Başvuruları",
    text: [
      "Kullanıcılar kişisel verileriyle ilgili taleplerini info@emlakportfoyhavuzu.com adresine iletebilir.",
      "Başvurunun kimlik doğrulaması gerektirdiği durumlarda ek doğrulama talep edilebilir.",
      "Başvurular ilgili mevzuatta öngörülen süreler içerisinde değerlendirilir ve sonuçlandırılır.",
    ],
  },
  {
    title: "24. Çocuklar ve Yaş Grubu",
    text: [
      "EPH çocuklara yönelik olarak tasarlanmış bir uygulama değildir.",
      "Platformun hedef kitlesi gayrimenkul sektörüyle ilgilenen kullanıcılar ve profesyonellerdir.",
      "15 yaşından küçük kişilerin Platformu kullanması amaçlanmamaktadır.",
      "18 yaşından küçük kullanıcıların ücretli üyelik, sözleşme veya hukuki sonuç doğuran işlemlerinde yürürlükteki mevzuat kapsamında yasal temsilci onayı gerekebilir.",
    ],
  },
  {
    title: "25. Kullanıcı Sorumlulukları",
    items: [
      "Hesap güvenliğini korumak.",
      "Şifresini veya hesabını yetkisiz kişilerle paylaşmamak.",
      "Başka kullanıcı hesaplarına veya verilerine yetkisiz erişim girişiminde bulunmamak.",
      "Platform üzerinden elde ettiği bilgileri kötüye kullanmamak.",
      "Sisteme girdiği bilgilerin doğruluğunu sağlamak.",
      "Üçüncü kişilere ait verileri hukuka uygun olarak işlemek.",
    ],
  },
  {
    title: "26. Çerezler ve Web Teknolojileri",
    text: [
      "EPH web uygulaması oturum yönetimi, güvenlik, kullanıcı tercihleri, performans ve gerekli teknik fonksiyonlar için çerez veya benzeri teknolojiler kullanabilir.",
      "Zorunlu olmayan çerezler kullanıldığı durumlarda ilgili mevzuata uygun bilgilendirme ve gerektiğinde izin mekanizması uygulanır.",
    ],
  },
  {
    title: "27. Politika Güncellemeleri",
    text: [
      "Bu Gizlilik Politikası; Platform özelliklerinin değişmesi, mevzuat değişiklikleri, Google Play politikalarının değişmesi veya güvenlik ve teknik altyapı gereksinimleri nedeniyle güncellenebilir.",
      "Güncel politika EPH internet sitesinde yayımlanır.",
      "Önemli değişiklikler gerektiğinde kullanıcılara ayrıca bildirilebilir.",
    ],
  },
  {
    title: "28. Platform Anayasası ile Uyum",
    text: [
      "Bu Gizlilik Politikası; EPH Platformunda benimsenen kullanıcı mahremiyeti, veri güvenliği, adil rekabet, müşteri gizliliği, veri maskeleme ve yönetici erişim sınırları ilkeleriyle birlikte uygulanır.",
    ],
  },
];

export default function GizlilikPolitikasiPage() {
  return (
    <main className="min-h-screen bg-[#07111F] px-4 py-6 text-[#0F172A]">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[32px] bg-[#F8FAFC] shadow-2xl">
        <header className="bg-gradient-to-br from-[#0B1F44] via-[#123B7A] to-[#1D4ED8] p-6 text-white md:p-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15"
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

              <h1 className="mt-2 text-[32px] font-black leading-tight tracking-tight md:text-[36px]">
                Gizlilik Politikası
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Kullanıcı mahremiyeti, kişisel verilerin korunması, güvenlik ve
                adil rekabet ilkeleri.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-blue-100">
                <span className="rounded-full bg-white/10 px-3 py-2">
                  Sürüm: V2
                </span>
                <span className="rounded-full bg-white/10 px-3 py-2">
                  Yürürlük: 7 Ağustos 2026
                </span>
                <span className="rounded-full bg-white/10 px-3 py-2">
                  Son Güncelleme: 22 Eylül 2026
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-5 md:p-8">
          <section className="rounded-[26px] border border-blue-100 bg-blue-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Veri Sorumlusu
            </p>

            <h2 className="mt-2 text-lg font-black leading-7 text-[#0B1F44]">
              MOB RESTORAN KAFE KAFETERYA GIDA ORGANİZASYON İNŞAAT SANAYİ VE
              TİCARET LİMİTED ŞİRKETİ
            </h2>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Siteler Mah. Bursa Cad. Deniz Apt. No: 27/A, Pamukkale / Denizli
            </p>

            <a
              href="mailto:info@emlakportfoyhavuzu.com"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm"
            >
              <Mail size={16} />
              info@emlakportfoyhavuzu.com
            </a>
          </section>

          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
            >
              <h2 className="mb-4 text-[20px] font-black tracking-tight text-[#0B1F44] md:text-[21px]">
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

          <section className="rounded-[30px] bg-[#0B1F44] p-6 text-center text-white md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
              Emlak Portföy Havuzu
            </p>

            <h2 className="mt-2 text-[24px] font-black">EPH Platformu</h2>

            <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
              Mahremiyet, güven ve adil rekabet EPH&apos;nin temel
              değerleridir.
            </p>

            <div className="mt-5 border-t border-white/10 pt-5 text-xs font-semibold leading-6 text-white/60">
              <p>Platform Geliştiricisi: Mustafa Ertuğ Kaya</p>
              <p>Veri Sorumlusu: MOB RESTORAN KAFE KAFETERYA GIDA ORGANİZASYON İNŞAAT SANAYİ VE TİCARET LTD. ŞTİ.</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
