"use client";

import {
  Bell,
  Building2,
  CheckCircle2,
  CircleUserRound,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const posts = [
  {
    author: "Ercan Gayrimenkul",
    role: "Doğrulanmış Emlakçı",
    time: "2 dk önce",
    type: "Talep",
    title: "Akkonak’ta 3+1 satılık daire aranıyor",
    desc: "Müşteri hazır. 5.5M bütçe. Ara kat, krediye uygun portföy öncelikli.",
    tags: ["Satılık", "Akkonak", "3+1", "Hazır müşteri"],
  },
  {
    author: "Denizli Proje Ofisi",
    role: "Müteahhit",
    time: "18 dk önce",
    type: "Portföy",
    title: "Merkezefendi’de yeni proje ortak satışa açık",
    desc: "Teslim tarihi yakın, sınırlı sayıda 2+1 ve 3+1 daire için meslektaş iş birliği alınır.",
    tags: ["Proje", "Ortak satış", "Merkezefendi"],
  },
  {
    author: "Akva İnşaat",
    role: "İnşaat Firması",
    time: "1 saat önce",
    type: "Arsa",
    title: "Kat karşılığı uygun arsa aranıyor",
    desc: "Pamukkale ve çevresinde imarlı, minimum 800 m² arsa değerlendirilir.",
    tags: ["Arsa", "Kat karşılığı", "Pamukkale"],
  },
];

const categories = [
  "Tüm Akış",
  "Satılık Talepleri",
  "Kiralık Talepleri",
  "Portföy Paylaşımı",
  "Ortak Satış",
  "Müteahhit & Proje",
  "Arsa & Kat Karşılığı",
];

export default function NetworkPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#111827]">
      <section className="mx-auto min-h-screen max-w-6xl px-5 py-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-black text-[#1D4ED8]">
              <LockKeyhole size={15} />
              Kapalı profesyonel ağ
            </div>

            <h1 className="text-[34px] font-black tracking-tight text-[#0B1F44]">
              EPH Network
            </h1>

            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-500">
              Meslektaşlarınızla talep, portföy, proje ve iş birliği
              fırsatlarını yalnızca EPH üyeleri içinde paylaşın.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600">
              <Bell size={19} />
            </button>

            <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#1D4ED8]">
              <CircleUserRound size={24} />
            </button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[260px_1fr_300px]">
          <aside className="rounded-[26px] border border-slate-200 bg-white p-4">
            <h2 className="mb-4 text-[16px] font-black text-[#0B1F44]">
              Kategoriler
            </h2>

            <div className="space-y-2">
              {categories.map((category, index) => (
                <button
                  key={category}
                  className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-bold ${
                    index === 0
                      ? "bg-[#EEF4FF] text-[#1D4ED8]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-[26px] border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
                <Search size={18} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  placeholder="Talep, portföy, mahalle veya meslektaş ara..."
                />
              </div>

              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] text-sm font-black text-white">
                <Plus size={18} />
                Yeni paylaşım oluştur
              </button>
            </div>

            {posts.map((post) => (
              <article
                key={post.title}
                className="rounded-[26px] border border-slate-200 bg-white p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] font-black text-[#1D4ED8]">
                      {post.author[0]}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#0B1F44]">
                          {post.author}
                        </h3>
                        <CheckCircle2 size={15} className="text-[#1D4ED8]" />
                      </div>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {post.role} · {post.time}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                    {post.type}
                  </span>
                </div>

                <h2 className="text-[20px] font-black tracking-tight text-[#111827]">
                  {post.title}
                </h2>

                <p className="mt-2 text-[14px] leading-6 text-slate-600">
                  {post.desc}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-1 text-xs font-bold text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <button className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">
                    Mesaj Gönder
                  </button>

                  <button className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">
                    Portföy Öner
                  </button>

                  <button className="rounded-2xl bg-[#1D4ED8] px-3 py-3 text-sm font-black text-white">
                    İlgileniyorum
                  </button>
                </div>
              </article>
            ))}
          </section>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-slate-200 bg-white p-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
                <ShieldCheck size={24} />
              </div>

              <h2 className="text-[17px] font-black text-[#0B1F44]">
                Sadece EPH üyeleri
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Bu akış Google’da görünmez. Paylaşımlar yalnızca giriş yapan
                doğrulanmış profesyoneller içindir.
              </p>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-[17px] font-black text-[#0B1F44]">
                Hızlı Erişim
              </h2>

              <div className="space-y-2">
                <QuickLink icon={<MessageCircle size={18} />} label="Mesajlar" />
                <QuickLink icon={<UsersRound size={18} />} label="Meslektaşlar" />
                <QuickLink icon={<Building2 size={18} />} label="Portföy Eşleştir" />
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function QuickLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-bold text-slate-700">
      <span className="text-[#1D4ED8]">{icon}</span>
      {label}
    </button>
  );
}