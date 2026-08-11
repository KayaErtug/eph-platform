"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Flame,
  MessageCircle,
  Plus,
  Search,
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
  const router = useRouter();

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-[#F4F8FF] px-3 pb-[calc(112px+env(safe-area-inset-bottom,0px))] pt-3 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] space-y-3">
        <section className="rounded-[26px] border-2 border-[#C7D6E8] bg-white p-3 text-center shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
            <span className="h-11 w-11" />

            <div className="min-w-0 text-center">
              <p className="mx-auto inline-flex min-h-[26px] items-center justify-center rounded-full bg-[#EFF6FF] px-3 py-1 text-center text-[11px] font-black text-[#1557D6]">
                Talep Merkezi
              </p>

              <h1 className="mt-2 text-center text-[24px] font-black leading-none tracking-[-0.045em] text-[#06194A]">
                Sektörel Akış
              </h1>

              <p className="mx-auto mt-1 max-w-[300px] text-center text-[12px] font-bold leading-5 text-[#64748B]">
                Talepleri, portföyleri ve iş birliklerini tek ekranda takip edin.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/network")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#1557D6] text-white shadow-[0_14px_28px_rgba(21,87,214,0.24)]"
              aria-label="Talep Merkezi sayfasına git"
            >
              <Plus size={21} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <CompactStat label="Paylaşım" value="3" />
            <CompactStat label="Mesaj" value="5" />
            <CompactStat label="Takip" value="0" quiet />
          </div>
        </section>

        <section className="grid grid-cols-4 gap-2">
          <QuickCard icon={<Flame size={18} />} label="Sıcak" tone="orange" href="/network" />
          <QuickCard icon={<TrendingUp size={18} />} label="Trend" tone="blue" href="/network" />
          <QuickCard icon={<MessageCircle size={18} />} label="Mesaj" tone="purple" href="/messages" />
          <QuickCard icon={<Star size={18} />} label="Takip" tone="yellow" href="/network" />
        </section>

        <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-2 rounded-[18px] border-2 border-[#C7D6E8] bg-[#EEF3F8] px-3 py-2">
            <Search size={17} className="shrink-0 text-[#94A3B8]" />
            <input
              className="h-8 min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
              placeholder="Talep, portföy, bölge ara..."
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {categories.map((category, index) => (
              <button
                key={category}
                type="button"
                onClick={() => router.push("/network")}
                className={`shrink-0 rounded-full border-2 px-4 py-2 text-[12px] font-black ${
                  index === 0
                    ? "border-[#1557D6] bg-[#1557D6] text-white"
                    : "border-[#C7D6E8] bg-white text-[#475569]"
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
            href="/network"
          />
          <ColorBlock
            icon={<UsersRound size={20} />}
            title="İş Birliği"
            desc="Ortak satış fırsatları"
            color="#EA580C"
            bg="#FFF7ED"
            href="/network"
          />
        </section>

        <section className="space-y-2">
          <div className="grid grid-cols-[54px_1fr_54px] items-center gap-2 px-1">
            <span />
            <h2 className="text-center text-[18px] font-black tracking-[-0.035em] text-[#06194A]">
              Güncel Paylaşımlar
            </h2>

            <Link href="/network" className="text-center text-[12px] font-black text-[#1557D6]">
              Talep Merkezi
            </Link>
          </div>

          {posts.map((post) => (
            <PostCard key={post.title} post={post} />
          ))}
        </section>

        <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <h2 className="text-center text-[18px] font-black tracking-[-0.035em] text-[#06194A]">
            Bildirimler
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <ActionButton icon={<Bell size={17} />} label="Bildirim" href="/notification-settings" />
            <ActionButton icon={<MessageCircle size={17} />} label="Mesaj" href="/messages" />
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
    <div className="min-h-[58px] rounded-[18px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-2 py-2 text-center">
      <p className="text-[20px] font-black leading-none text-[#06194A]">{value}</p>
      <p className={`mt-1 break-words text-[10px] font-black ${quiet ? "text-[#94A3B8]" : "text-[#64748B]"}`}>
        {label}
      </p>
    </div>
  );
}

function QuickCard({
  icon,
  label,
  tone,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "orange" | "blue" | "purple" | "yellow";
  href: string;
}) {
  const styles = {
    orange: "bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]",
    blue: "bg-[#EFF6FF] text-[#1557D6] border-[#DBEAFE]",
    purple: "bg-[#F4F0FF] text-[#6D4AFF] border-[#DDD6FE]",
    yellow: "bg-[#FEFCE8] text-[#A16207] border-[#FEF3C7]",
  };

  return (
    <Link
      href={href}
      className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-[20px] border-2 px-1 text-center shadow-[0_8px_20px_rgba(15,23,42,0.045)] ${styles[tone]}`}
    >
      {icon}
      <span className="break-words text-center text-[11px] font-black">{label}</span>
    </Link>
  );
}

function ColorBlock({
  icon,
  title,
  desc,
  color,
  bg,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  bg: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="min-h-[96px] rounded-[22px] border-2 border-[#C7D6E8] p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.045)]"
      style={{ background: bg }}
    >
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-[15px] bg-white" style={{ color }}>
        {icon}
      </div>
      <h3 className="mt-2 break-words text-center text-[15px] font-black text-[#06194A]">{title}</h3>
      <p className="mt-0.5 break-words text-center text-[11px] font-bold leading-4 text-[#64748B]">{desc}</p>
    </Link>
  );
}

function PostCard({ post }: { post: (typeof posts)[number] }) {
  return (
    <article className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.055)]">
      <div className="grid grid-cols-[48px_1fr] items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-[23px]"
          style={{ background: post.soft }}
        >
          {post.emoji}
        </div>

        <div className="min-w-0 text-center">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <span />
            <div className="min-w-0 text-center">
              <h3 className="break-words text-center text-[15px] font-black leading-[18px] text-[#06194A]">
                {post.name}
              </h3>
              <p className="mt-0.5 break-words text-center text-[11px] font-bold leading-4 text-[#64748B]">
                {post.role} • {post.status} • {post.time}
              </p>
            </div>

            <span
              className="justify-self-end rounded-full px-2 py-1 text-center text-[10px] font-black leading-4"
              style={{ color: post.color, background: post.soft }}
            >
              {post.tag}
            </span>
          </div>

          <p className="mt-3 text-center text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: post.color }}>
            {post.type}
          </p>

          <h2 className="mt-1 break-words text-center text-[18px] font-black leading-[1.12] tracking-[-0.04em] text-[#06194A]">
            {post.title}
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <SmallInfo label="Bölge" value={post.location} />
            <SmallInfo label="Bütçe" value={post.budget} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/network"
              className="flex min-h-[38px] items-center justify-center rounded-[16px] border-2 border-[#C7D6E8] bg-white text-center text-[12px] font-black text-[#1557D6]"
            >
              Detay
            </Link>
            <Link
              href="/messages"
              className="flex min-h-[38px] items-center justify-center rounded-[16px] bg-[#1557D6] text-center text-[12px] font-black text-white"
            >
              Mesaj
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-3 py-2 text-center">
      <p className="break-words text-center text-[9px] font-black uppercase tracking-[0.08em] text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-0.5 break-words text-center text-[12px] font-black leading-4 text-[#27364F]">{value}</p>
    </div>
  );
}

function ActionButton({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[48px] items-center justify-center gap-1 rounded-[17px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-1 text-center text-[11px] font-black text-[#1557D6]"
    >
      {icon}
      <span className="break-words text-center">{label}</span>
    </Link>
  );
}
