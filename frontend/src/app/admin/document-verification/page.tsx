"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Landmark,
  Search,
  ShieldCheck,
} from "lucide-react";

import { useAuthStore } from "@/store/auth.store";

type VerificationTool = {
  id: string;
  title: string;
  description: string;
  institution: string;
  url: string;
  fields: string[];
  roles: string[];
};

const TOOLS: VerificationTool[] = [
  {
    id: "myk",
    title: "MYK Belge Sorgulama",
    description:
      "Emlak danışmanlarının Mesleki Yeterlilik Belgesi bilgilerini kontrol edin.",
    institution: "Mesleki Yeterlilik Kurumu",
    url: "https://portal.myk.gov.tr/index.php?option=com_belgesorgulama&view=belgesorgulama",
    fields: ["T.C. Kimlik No", "Belge No"],
    roles: ["Emlak Danışmanı"],
  },
  {
    id: "ttbs",
    title: "Taşınmaz Ticareti Yetki Belgesi",
    description:
      "Emlak işletmelerinin Taşınmaz Ticareti Yetki Belgesi durumunu inceleyin.",
    institution: "Ticaret Bakanlığı · TTBS",
    url: "https://ttbs.gtb.gov.tr/",
    fields: ["Yetki Belgesi No", "Vergi No", "İşletme Unvanı"],
    roles: ["Emlak Ofisi"],
  },
  {
    id: "yambis",
    title: "YAMBİS Müteahhit Kontrolü",
    description:
      "Yapı müteahhitliği yetki belgesi numarası ve kayıt durumunu kontrol edin.",
    institution: "Çevre, Şehircilik ve İklim Değişikliği Bakanlığı",
    url: "https://yambis.csb.gov.tr/",
    fields: ["Yetki Belge No", "T.C. / Vergi No", "Firma Unvanı"],
    roles: ["Müteahhit", "İnşaat Firması"],
  },
  {
    id: "mersis",
    title: "MERSİS Firma Kontrolü",
    description:
      "Şirketin MERSİS kaydı, ticaret sicili ve temel firma bilgilerini kontrol edin.",
    institution: "Ticaret Bakanlığı · MERSİS",
    url: "https://mersis.ticaret.gov.tr/",
    fields: ["MERSİS No", "Vergi No", "Firma Unvanı"],
    roles: ["İnşaat Firması", "Emlak Ofisi"],
  },
  {
    id: "sicil",
    title: "Türkiye Ticaret Sicili Gazetesi",
    description:
      "Kuruluş, ortaklık, unvan ve temsil-ilzam ilanlarını inceleyin.",
    institution: "TOBB · Ticaret Sicili Gazetesi",
    url: "https://www.ticaretsicil.gov.tr/",
    fields: ["Sicil No", "Firma Unvanı", "İlan Tarihi"],
    roles: ["İnşaat Firması", "Emlak Ofisi"],
  },
  {
    id: "gib",
    title: "Vergi Levhası / GİB Kontrolü",
    description:
      "Vergi mükellefiyetine ilişkin belge ve bilgileri GİB servislerinden kontrol edin.",
    institution: "Gelir İdaresi Başkanlığı",
    url: "https://ivd.gib.gov.tr/",
    fields: ["Vergi Kimlik No", "T.C. Kimlik No", "Doğrulama Kodu"],
    roles: ["Müteahhit", "İnşaat Firması", "Emlak Ofisi"],
  },
  {
    id: "edevlet",
    title: "e-Devlet Belge Doğrulama",
    description:
      "Barkodlu resmî belgeleri barkod numarası ve kimlik bilgisiyle doğrulayın.",
    institution: "Türkiye Cumhuriyeti · e-Devlet Kapısı",
    url: "https://www.turkiye.gov.tr/belge-dogrulama",
    fields: ["Barkod No", "T.C. Kimlik No"],
    roles: ["Tüm Roller"],
  },
];

function copyText(value: string) {
  return navigator.clipboard.writeText(value);
}

export default function DocumentVerificationPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const role = String(user?.role || "").toUpperCase();
  const canAccess = ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(role);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.replace("/giris");
      return;
    }

    if (!canAccess) {
      router.replace("/dashboard");
    }
  }, [canAccess, hasHydrated, router, user]);

  const filteredTools = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("tr-TR");

    if (!clean) return TOOLS;

    return TOOLS.filter((tool) =>
      [
        tool.title,
        tool.description,
        tool.institution,
        ...tool.fields,
        ...tool.roles,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(clean),
    );
  }, [query]);

  const handleCopy = async (tool: VerificationTool) => {
    await copyText(tool.url);
    setCopiedId(tool.id);
    window.setTimeout(() => setCopiedId(""), 1600);
  };

  if (!hasHydrated || !canAccess) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#F4F8FF]">
        <div className="text-sm font-black text-[#1557D6]">Yükleniyor...</div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#F4F8FF] px-3 py-4 text-[#1F2937] sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[28px] border border-[#C7D6E8] bg-white shadow-[0_20px_60px_rgba(15,23,42,.08)]">
          <header className="bg-gradient-to-br from-[#06194A] to-[#2563EB] px-5 py-6 text-white sm:px-7">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#2563EB]">
                <FileCheck2 size={28} />
              </div>
              <h1 className="mt-4 text-2xl font-black tracking-[-.03em] sm:text-3xl">
                Belge Doğrulama Merkezi
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-blue-100">
                Mesleki belgeleri resmî kurum servislerinden hızlı ve düzenli
                biçimde kontrol edin.
              </p>
            </div>
          </header>

          <div className="p-4 sm:p-6">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-[#2563EB]" size={20} />
                <p className="text-xs font-bold leading-5 text-blue-900 sm:text-sm">
                  Bu merkez yalnız kontrol kolaylığı sağlar. Nihai onay öncesinde
                  belge üzerindeki ad, numara, unvan, geçerlilik tarihi ve resmî
                  sorgu sonucu birlikte karşılaştırılmalıdır.
                </p>
              </div>
            </div>

            <div className="relative mt-5">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={19}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Belge, kurum veya rol ara..."
                className="h-14 w-full rounded-2xl border border-[#C7D6E8] bg-white pl-12 pr-4 text-sm font-bold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTools.map((tool) => (
                <article
                  key={tool.id}
                  className="flex min-h-[285px] flex-col rounded-3xl border border-[#D8E3F0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,.05)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                      {tool.id === "mersis" || tool.id === "sicil" ? (
                        <Building2 size={23} />
                      ) : tool.id === "gib" ? (
                        <Landmark size={23} />
                      ) : (
                        <FileSearch size={23} />
                      )}
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                      RESMÎ KONTROL
                    </span>
                  </div>

                  <h2 className="mt-4 text-[17px] font-black leading-6 text-[#06194A]">
                    {tool.title}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-[#2563EB]">
                    {tool.institution}
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                    {tool.description}
                  </p>

                  <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Hazır bulundurun
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tool.fields.map((field) => (
                        <span
                          key={field}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                    <button
                      type="button"
                      onClick={() => handleCopy(tool)}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#C7D6E8] bg-white text-xs font-black text-[#1557D6]"
                    >
                      {copiedId === tool.id ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Clipboard size={16} />
                      )}
                      {copiedId === tool.id ? "Kopyalandı" : "Linki Kopyala"}
                    </button>

                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-xs font-black text-white"
                    >
                      Sorgulamayı Aç
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </article>
              ))}
            </div>

            {filteredTools.length === 0 && (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-black text-slate-500">
                Aramanızla eşleşen doğrulama aracı bulunamadı.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
