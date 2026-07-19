const membershipPlans = [
  {
    name: "STARTER",
    price: "₺499",
    period: "/ Ay",
    subtitle: "Giriş seviyesi kullanım için",
    popular: false,
    features: [
      "10 aktif portföy",
      "5 talep kaydı",
      "Temel CRM kullanımı",
      "Mesajlaşma",
      "Mobil PWA erişimi",
      "250 kontör",
    ],
  },
  {
    name: "SILVER",
    price: "₺999",
    period: "/ Ay",
    subtitle: "Yeni başlayan emlak profesyonelleri için",
    popular: false,
    features: [
      "20 aktif portföy",
      "10 talep kaydı",
      "CRM kullanımı",
      "Mesajlaşma",
      "Mobil PWA erişimi",
      "500 kontör",
    ],
  },
  {
    name: "GOLD",
    price: "₺1.499",
    period: "/ Ay",
    subtitle: "En çok tercih edilen paket",
    popular: true,
    features: [
      "50 aktif portföy",
      "30 talep kaydı",
      "Havuz erişimi",
      "CRM kullanımı",
      "Mesajlaşma",
      "1500 kontör",
    ],
  },
  {
    name: "PREMIUM",
    price: "₺2.499",
    period: "/ Ay",
    subtitle: "Profesyonel portföy yöneticileri için",
    popular: false,
    features: [
      "100 aktif portföy",
      "Sınırsız talep kaydı",
      "Lina AI asistan",
      "250 mesaj",
      "Gelişmiş bildirimler",
      "2500 kontör",
    ],
  },
  {
    name: "PLATINUM",
    price: "₺4.499",
    period: "/ Ay",
    subtitle: "Kurumsal ve yoğun kullanım için",
    popular: false,
    features: [
      "200 aktif portföy",
      "Sınırsız talep kaydı",
      "Sınırsız mesaj",
      "Lina AI asistan",
      "Öncelikli eşleşmeler",
      "5000 kontör",
    ],
  },
];

const creditPackages = [
  {
    name: "EPH Market Mini",
    credits: "1000 Kontör",
    price: "₺999",
  },
  {
    name: "EPH Market Plus",
    credits: "2500 Kontör",
    price: "₺1.999",
  },
  {
    name: "EPH Market Pro",
    credits: "5000 Kontör",
    price: "₺2.999",
  },
];

const creditUses = [
  ["Talep Merkezi mesajı", "3 kontör"],
  ["Talep Merkezi’nde ilgileniyorum", "10 kontör"],
  ["Talep Merkezi’nde yardımcı olabilirim", "10 kontör"],
  ["Portföy öne çıkar", "150 kontör"],
  ["Lina AI ilan metni", "10 kontör"],
  ["Ses kaydından ilan oluştur", "25 kontör"],
  ["WhatsApp portföy kartı", "10 kontör"],
  ["PDF portföy dosyası", "20 kontör"],
  ["Toplu portföy işlemleri", "25 kontör"],
  ["Profesyonel sosyal medya metni", "20 kontör"],
];

const faqs = [
  {
    question: "EPH aboneliği neyi kapsar?",
    answer:
      "Abonelik; CRM, portföy yönetimi, Talep Merkezi, mesajlaşma, havuz erişimi ve seçilen pakete göre Lina AI özelliklerini kapsar.",
  },
  {
    question: "Kontörler temel işlemler için mi harcanır?",
    answer:
      "Hayır. Portföy eklemek, CRM kullanmak, Talep Merkezi ve Havuz içeriklerini listelemek ve detaylarını görüntülemek ücretsizdir. Mesaj ve iş fırsatı oluşturan aksiyonlar kontör ile çalışır.",
  },
  {
    question: "Abonelik aylık mı?",
    answer:
      "Evet. Paketler aylık olarak planlanmıştır. Yıllık ödeme seçenekleri daha sonra ayrıca sunulacaktır.",
  },
  {
    question: "Lina AI hangi paketlerde var?",
    answer:
      "Lina AI, Premium ve Platinum paketlerinde yer alır. Bazı Lina işlemleri kontör ile de kullanılabilir.",
  },
  {
    question: "Aboneliğimi istediğim zaman iptal edebilir miyim?",
    answer:
      "Evet. Herhangi bir taahhüt olmadan aboneliğinizi sonlandırabilirsiniz.",
  },
  {
    question: "Kontör satın almak zorunlu mu?",
    answer:
      "Hayır. Üyelik paketleri platform erişimi sağlar. Kontörler mesajlaşma, iş fırsatı aksiyonları, ek görünürlük ve üretkenlik araçlarında kullanılır.",
  },
];

export default function UcretlendirmePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#172033]">
      <div className="mx-auto max-w-7xl">
        <section className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#1557D6]">
            EPH Platform
          </p>

          <h1 className="mx-auto mt-3 max-w-4xl text-3xl font-black leading-tight tracking-[-0.04em] md:text-5xl">
            Gayrimenkul Profesyonelleri İçin Üyelik ve Kontör Sistemi
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-7 text-[#64748B] md:text-base">
            EPH; CRM, portföy yönetimi, Talep Merkezi, havuz, mesajlaşma ve Lina AI
            araçlarını tek platformda sunar. Temel kullanım aboneliğe dahildir;
            iletişim, iş fırsatı ve üretkenliği artıran işlemler kontör ile kullanılır.
          </p>

          <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
            {["CRM", "Portföy", "Talep Merkezi", "Havuz", "Lina AI", "Mobil PWA"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#DDE7F3] bg-white px-4 py-2 text-xs font-black text-[#1557D6]"
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-[-0.03em] md:text-3xl">
              Üyelik Paketleri
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#64748B]">
              Kullanım hacmine göre gerçek ve sürdürülebilir fiyatlandırma.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {membershipPlans.map((plan) => (
              <article
                key={plan.name}
                className={`relative rounded-[28px] border bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] ${
                  plan.popular
                    ? "border-[#1557D6] ring-2 ring-[#1557D6]/10"
                    : "border-[#DDE7F3]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1557D6] px-4 py-1 text-[10px] font-black text-white">
                    EN ÇOK TERCİH EDİLEN
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-black text-[#06194A]">
                    {plan.name}
                  </h3>

                  <p className="mt-2 min-h-[40px] text-xs font-bold leading-5 text-[#64748B]">
                    {plan.subtitle}
                  </p>

                  <div className="mt-4">
                    <span className="text-4xl font-black tracking-[-0.05em] text-[#1557D6]">
                      {plan.price}
                    </span>
                    <span className="ml-1 text-xs font-black text-[#64748B]">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-sm font-bold text-[#172033]"
                    >
                      <span className="mt-0.5 text-emerald-600">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button className="mt-5 w-full rounded-2xl bg-[#1557D6] py-3 text-sm font-black text-white">
                  Ödeme Sistemi Hazırlanıyor
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] md:p-8">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-[-0.03em] md:text-3xl">
              Kontör Paketleri
            </h2>
            <p className="mx-auto mt-2 max-w-3xl text-sm font-semibold leading-7 text-[#64748B]">
              Kontörler temel kullanım için değil; mesajlaşma, iş fırsatı, Lina AI,
              sosyal medya içeriği, PDF dosyası ve toplu işlemler gibi premium
              araçlar için kullanılır.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {creditPackages.map((pack) => (
              <article
                key={pack.name}
                className="rounded-[26px] border border-[#DDE7F3] bg-[#F8FAFC] p-5 text-center"
              >
                <h3 className="text-lg font-black text-[#06194A]">
                  {pack.name}
                </h3>
                <p className="mt-2 text-2xl font-black text-[#1557D6]">
                  {pack.credits}
                </p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#172033]">
                  {pack.price}
                </p>
                <button className="mt-5 w-full rounded-2xl border border-[#1557D6] bg-white py-3 text-sm font-black text-[#1557D6]">
                  Ödeme Sistemi Hazırlanıyor
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] md:p-8">
            <h2 className="text-center text-2xl font-black tracking-[-0.03em]">
              Kontör ile Neler Yapabilirsiniz?
            </h2>
            <p className="mt-3 text-center text-sm font-semibold leading-7 text-[#64748B]">
              Kontör sistemi, platformun ana kullanımını engellemez. Sadece
              görünürlük, üretim ve hız sağlayan premium işlemlerde kullanılır.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                "Acil Talep",
                "Vitrine Çıkar",
                "Portföy Öne Çıkar",
                "Lina AI",
                "PDF Portföy",
                "Sosyal Medya",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-2xl bg-[#F8FAFC] px-3 py-2 text-center text-xs font-black text-[#1557D6]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#DDE7F3] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)] md:p-6">
            <div className="grid gap-2 sm:grid-cols-2">
              {creditUses.map(([name, credit]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-4 py-3"
                >
                  <span className="text-sm font-bold text-[#172033]">
                    {name}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-black text-[#1557D6]">
                    {credit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] md:p-8">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-[-0.03em]">
              Özellik Karşılaştırması
            </h2>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[880px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-[#64748B]">
                  <th className="px-4 py-3 text-left">Özellik</th>
                  <th className="px-4 py-3 text-center">Starter</th>
                  <th className="px-4 py-3 text-center">Silver</th>
                  <th className="px-4 py-3 text-center">Gold</th>
                  <th className="px-4 py-3 text-center">Premium</th>
                  <th className="px-4 py-3 text-center">Platinum</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Aktif Portföy", "10", "20", "50", "100", "200"],
                  ["Talep Kaydı", "5", "10", "30", "Sınırsız", "Sınırsız"],
                  ["CRM", "✓", "✓", "✓", "✓", "✓"],
                  ["Havuz", "—", "—", "✓", "✓", "✓"],
                  ["Lina AI", "—", "—", "—", "✓", "✓"],
                  ["Mesajlaşma", "✓", "✓", "✓", "250", "Sınırsız"],
                  ["Kontör", "250", "500", "1500", "2500", "5000"],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td
                        key={`${row[0]}-${index}`}
                        className={`px-4 py-3 ${
                          index === 0
                            ? "rounded-l-2xl bg-[#F8FAFC] text-left font-black text-[#172033]"
                            : index === row.length - 1
                              ? "rounded-r-2xl bg-[#F8FAFC] text-center font-black text-[#1557D6]"
                              : "bg-[#F8FAFC] text-center font-black text-[#1557D6]"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-4">
          {[
            ["Mobil PWA", "Telefon üzerinden hızlı kullanım."],
            ["Güvenli Altyapı", "Rol bazlı erişim ve kullanıcı mahremiyeti."],
            ["Lina AI", "İlan, metin ve iş akışında yapay zeka desteği."],
            ["Sürekli Gelişim", "Platform ihtiyaçlara göre düzenli gelişir."],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-[26px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_10px_28px_rgba(15,23,42,0.045)]"
            >
              <h3 className="text-lg font-black text-[#06194A]">{title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                {text}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] md:p-8">
          <h2 className="text-center text-2xl font-black tracking-[-0.03em]">
            Sık Sorulan Sorular
          </h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-[24px] bg-[#F8FAFC] p-5"
              >
                <h3 className="text-base font-black text-[#06194A]">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[34px] bg-[#06194A] px-5 py-8 text-center text-white md:px-10">
          <h2 className="text-2xl font-black tracking-[-0.03em] md:text-4xl">
            EPH Platform ile profesyonel iş akışına geçin.
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/75">
            Üyelik sistemi platform erişimi sağlar. Kontör sistemi ise
            görünürlük, üretim ve hız sağlayan premium araçları destekler.
          </p>
          <button className="mt-6 rounded-2xl bg-white px-7 py-3 text-sm font-black text-[#06194A]">
            Ödeme Sistemi Hazırlanıyor
          </button>
          <p className="mx-auto mt-5 max-w-3xl text-xs font-semibold leading-6 text-white/55">
            Abonelikler aylık olarak yenilenir. İptal işlemleri kullanıcı
            panelinden yapılabilir. İade koşulları hizmet sözleşmesinde
            belirtilir.
          </p>
        </section>
      </div>
    </main>
  );
}