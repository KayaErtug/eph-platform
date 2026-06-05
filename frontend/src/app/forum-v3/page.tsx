"use client";

import Link from "next/link";
import {
  Bell,
  Building2,
  Flame,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  UsersRound,
} from "lucide-react";

const categories = ["Tümü", "Satılık", "Kiralık", "Portföy", "Ortak", "Proje", "Arsa"];

const posts = [
  {
    name: "Murat Yavuz",
    role: "Emlakçı",
    status: "Çevrimdışı",
    tag: "Hazır Müşteri",
    type: "Talep",
    title: "Adalet Mahallesi'nde 3+1 kiralık daire arıyorum",
    location: "Denizli / Merkezefendi",
    budget: "22.000 TL",
    time: "2 gün önce",
    color: "#1557D6",
    soft: "#EFF6FF",
    emoji: "🏠",
  },
  {
    name: "Kemal Turgut",
    role: "Müteahhit",
    status: "Online",
    tag: "Sıcak Talep",
    type: "Proje",
    title: "Pamukkale bölgesinde satış ağı kurmak istiyoruz",
    location: "Denizli / Pamukkale",
    budget: "Proje bazlı",
    time: "Bugün",
    color: "#EA580C",
    soft: "#FFF7ED",
    emoji: "🏗️",
  },
  {
    name: "Selin Aksoy",
    role: "Emlakçı",
    status: "Online",
    tag: "Portföy",
    type: "Paylaşım",
    title: "Yenişehir'de yetkili satılık 2+1 portföy",
    location: "Denizli / Yenişehir",
    budget: "3.250.000 TL",
    time: "1 saat önce",
    color: "#6D4AFF",
    soft: "#F4F0FF",
    emoji: "🔑",
  },
];

export default function ForumV3PreviewPage() {
  return (
    <main className="min-h-screen bg-[#F7FBFF] px-3 pb-28 pt-3 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] space-y-3">
        <section className="rounded-[26px] border border-[#DDE7F3] bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-left">
              <p className="inline-flex rounded-full bg-[#EFF6FF] px-3 py-1 text-[11px] font-black text-[#1557D6]">
                Forum Merkezi
              </p>

              <h1 className="mt-2 text-[24px] font-black leading-none tracking-[-0.045em] text-[#06194A]">
                Sektörel Akış
              </h1>

              <p className="mt-1 max-w-[260px] text-[12px] font-bold leading-5 text-[#64748B]">
                Talepleri, portföyleri ve iş birliklerini tek ekranda takip edin.
              </p>
            </div>

            <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#1557D6] text-white shadow-[0_14px_28px_rgba(21,87,214,0.24)]">
              <Plus size={22} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <CompactStat label="Paylaşım" value="3" />
            <CompactStat label="Mesaj" value="5" />
            <CompactStat label="Takip" value="0" quiet />
          </div>
        </section>

        <section className="grid grid-cols-4 gap-2">
          <QuickCard icon={<Flame size={18} />} label="Sıcak" tone="orange" />
          <QuickCard icon={<TrendingUp size={18} />} label="Trend" tone="blue" />
          <QuickCard icon={<MessageCircle size={18} />} label="Mesaj" tone="purple" />
          <QuickCard icon={<Star size={18} />} label="Takip" tone="yellow" />
        </section>

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-2 rounded-[18px] bg-[#F7FBFF] px-3 py-2">
            <Search size={17} className="text-[#94A3B8]" />
            <input
              className="h-8 min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
              placeholder="Talep, portföy, bölge ara..."
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category, index) => (
              <button
                key={category}
                className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-black ${
                  index === 0
                    ? "bg-[#1557D6] text-white"
                    : "border border-[#DDE7F3] bg-white text-[#475569]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <ColorBlock
            icon={<Building2 size={20} />}
            title="Portföy"
            desc="Yeni yetkili kayıtlar"
            color="#1557D6"
            bg="#EFF6FF"
          />
          <ColorBlock
            icon={<UsersRound size={20} />}
            title="İş Birliği"
            desc="Ortak satış fırsatları"
            color="#EA580C"
            bg="#FFF7ED"
          />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[18px] font-black tracking-[-0.035em] text-[#06194A]">
              Güncel Paylaşımlar
            </h2>

            <Link href="/network" className="text-[12px] font-black text-[#1557D6]">
              Mevcut Forum
            </Link>
          </div>

          {posts.map((post) => (
            <PostCard key={post.title} post={post} />
          ))}
        </section>

        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <h2 className="text-center text-[18px] font-black tracking-[-0.035em] text-[#06194A]">
            Bildirimler
          </h2>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <ActionButton icon={<Bell size={17} />} label="Bildirim" />
            <ActionButton icon={<Sparkles size={17} />} label="Lina" />
            <ActionButton icon={<MessageCircle size={17} />} label="Mesaj" />
          </div>
        </section>
      </div>
    </main>
  );
}

function CompactStat({
  label,
  value,
  quiet,
}: {
  label: string;
  value: string;
  quiet?: boolean;
}) {
  return (
    <div className="min-h-[58px] rounded-[18px] bg-[#F7FBFF] px-2 py-2 text-center">
      <p className="text-[20px] font-black leading-none text-[#06194A]">{value}</p>
      <p className={`mt-1 text-[10px] font-black ${quiet ? "text-[#94A3B8]" : "text-[#64748B]"}`}>
        {label}
      </p>
    </div>
  );
}

function QuickCard({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "orange" | "blue" | "purple" | "yellow";
}) {
  const styles = {
    orange: "bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]",
    blue: "bg-[#EFF6FF] text-[#1557D6] border-[#DBEAFE]",
    purple: "bg-[#F4F0FF] text-[#6D4AFF] border-[#DDD6FE]",
    yellow: "bg-[#FEFCE8] text-[#A16207] border-[#FEF3C7]",
  };

  return (
    <button className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-[20px] border px-1 ${styles[tone]}`}>
      {icon}
      <span className="text-[11px] font-black">{label}</span>
    </button>
  );
}

function ColorBlock({
  icon,
  title,
  desc,
  color,
  bg,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  bg: string;
}) {
  return (
    <button
      className="min-h-[96px] rounded-[22px] border border-[#DDE7F3] p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.045)]"
      style={{ background: bg }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-white" style={{ color }}>
        {icon}
      </div>
      <h3 className="mt-2 text-[15px] font-black text-[#06194A]">{title}</h3>
      <p className="mt-0.5 text-[11px] font-bold leading-4 text-[#64748B]">{desc}</p>
    </button>
  );
}

function PostCard({ post }: { post: (typeof posts)[number] }) {
  return (
    <article className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.055)]">
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-[23px]"
          style={{ background: post.soft }}
        >
          {post.emoji}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-black text-[#06194A]">
                {post.name}
              </h3>
              <p className="mt-0.5 text-[11px] font-bold text-[#64748B]">
                {post.role} • {post.status} • {post.time}
              </p>
            </div>

            <span
              className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black"
              style={{ color: post.color, background: post.soft }}
            >
              {post.tag}
            </span>
          </div>

          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: post.color }}>
            {post.type}
          </p>

          <h2 className="mt-1 line-clamp-2 text-[18px] font-black leading-[1.12] tracking-[-0.04em] text-[#06194A]">
            {post.title}
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <SmallInfo label="Bölge" value={post.location} />
            <SmallInfo label="Bütçe" value={post.budget} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="min-h-[38px] rounded-[16px] border border-[#DDE7F3] bg-white text-[12px] font-black text-[#1557D6]">
              Detay
            </button>
            <button className="min-h-[38px] rounded-[16px] bg-[#1557D6] text-[12px] font-black text-white">
              Mesaj
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[#F7FBFF] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.08em] text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[12px] font-black text-[#27364F]">{value}</p>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex min-h-[48px] items-center justify-center gap-1 rounded-[17px] bg-[#F7FBFF] text-[11px] font-black text-[#1557D6]">
      {icon}
      {label}
    </button>
  );
}