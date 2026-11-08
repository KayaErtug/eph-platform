import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  Trash2,
  UserRoundX,
} from "lucide-react";

export default function HesapSilmePage() {
  const email = "bildirim@emlakportfoyhavuzu.com";
  const subject = encodeURIComponent("EPH Hesap ve Veri Silme Talebi");
  const body = encodeURIComponent(
    [
      "EPH hesabımın ve hesabımla ilişkili kişisel verilerimin silinmesini talep ediyorum.",
      "",
      "Ad Soyad:",
      "EPH hesabında kayıtlı e-posta adresi:",
      "EPH hesabında kayıtlı telefon numarası:",
      "",
      "Not: Hesap sahibinin doğrulanması amacıyla ek bilgi istenebileceğini kabul ediyorum.",
    ].join("\n"),
  );

  const deleteRequestUrl = `mailto:${email}?subject=${subject}&body=${body}`;

  return (
    <main className="min-h-screen bg-[#07111F] px-4 py-6 text-[#0F172A]">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[32px] bg-[#F8FAFC] shadow-2xl">
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
              <UserRoundX size={30} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-100">
                EPH Platformu
              </p>

              <h1 className="mt-2 text-[32px] font-black leading-tight tracking-tight md:text-[36px]">
                Hesap ve Veri Silme
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                Emlak Portföy Havuzu hesabınızı ve hesabınızla ilişkili kişisel
                verileri silme talebi oluşturabilirsiniz.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-5 md:p-8">
          <section className="rounded-[26px] border border-blue-100 bg-blue-50 p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <Trash2 size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-[#0B1F44]">
                  Hesabınızı istediğiniz zaman silebilirsiniz
                </h2>

                <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                  EPH üyeliği isteğe bağlıdır. Kullanıcı dilediği zaman
                  üyelikten ayrılabilir ve hesabının kalıcı olarak silinmesini
                  talep edebilir.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-[#0B1F44]">
              1. Uygulama içinden hesap silme
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              EPH hesabınıza erişebiliyorsanız hesap silme işlemini uygulama
              içerisindeki hesap ayarlarından başlatabilirsiniz.
            </p>

            <div className="mt-4 rounded-2xl bg-[#F8FAFC] px-4 py-4 text-sm font-black leading-6 text-[#0B1F44]">
              Profil → Hesabımı Sil
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-[#0B1F44]">
              2. Web üzerinden silme talebi
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Uygulamaya veya hesabınıza erişemiyorsanız aşağıdaki butonu
              kullanarak hesap silme talebinizi EPH’ye gönderebilirsiniz.
            </p>

            <a
              href={deleteRequestUrl}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-center text-sm font-black !text-white transition hover:bg-red-700"
            >
              <Mail size={18} />
              Hesabımı ve Verilerimi Silme Talebi Gönder
            </a>

            <p className="mt-4 text-center text-xs font-semibold leading-5 text-slate-500">
              Talep adresi: {email}
            </p>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-[#0B1F44]">
              Doğrulama işlemi
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Yetkisiz hesap silme işlemlerini önlemek amacıyla talebin hesap
              sahibinden geldiğinin doğrulanması istenebilir.
            </p>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Doğrulama için EPH hesabında kayıtlı e-posta adresi, telefon
              numarası veya gerekli görülen diğer hesap bilgileri
              karşılaştırılabilir.
            </p>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-[#0B1F44]">
              Hesap silindiğinde hangi veriler silinir?
            </h2>

            <ul className="mt-4 space-y-2">
              {[
                "Kullanıcı profil bilgileri",
                "Hesapla ilişkili iletişim bilgileri",
                "Kullanıcının özel CRM kayıtları",
                "Kullanıcı tarafından oluşturulan özel not ve görevler",
                "Hesapla ilişkili kişisel tercih ve ayarlar",
                "Silinmesi hukuken mümkün olan diğer kişisel veriler",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm font-semibold leading-6 text-slate-600"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[26px] border border-amber-200 bg-amber-50 p-5 md:p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={22}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <h2 className="text-lg font-black text-amber-950">
                  Yasal olarak saklanması gereken kayıtlar
                </h2>

                <p className="mt-2 text-sm font-medium leading-7 text-amber-900/75">
                  Mevzuat, mali yükümlülükler, güvenlik, dolandırıcılığın
                  önlenmesi veya devam eden hukuki uyuşmazlıklar nedeniyle
                  saklanması zorunlu bazı kayıtlar, yalnızca gerekli süre
                  boyunca ve kullanım amacı sınırlandırılarak muhafaza
                  edilebilir.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-[#0B1F44]">
              Gizlilik ve KVKK
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Kişisel verilerin işlenmesi, saklanması ve silinmesine ilişkin
              ayrıntılı bilgi için EPH Gizlilik Politikasını inceleyebilirsiniz.
            </p>

            <Link
              href="/gizlilik-politikasi"
              className="mt-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700"
            >
              Gizlilik Politikasını Görüntüle
            </Link>
          </section>

          <section className="rounded-[30px] bg-[#0B1F44] p-6 text-center text-white md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
              Emlak Portföy Havuzu
            </p>

            <h2 className="mt-2 text-[23px] font-black">
              Hesap Silme ve Veri Talebi
            </h2>

            <a
              href={`mailto:${email}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-200"
            >
              <Mail size={16} />
              {email}
            </a>

            <p className="mt-5 text-xs font-semibold leading-5 text-white/50">
              Veri Sorumlusu: MOB RESTORAN KAFE KAFETERYA GIDA ORGANİZASYON
              İNŞAAT SANAYİ VE TİCARET LTD. ŞTİ.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
