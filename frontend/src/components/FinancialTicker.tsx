"use client";
import { useState, useEffect } from "react";

const EXCHANGE_KEY = "27ab27e174aa353884ced87b";

interface TickerItem {
  label: string;
  value: string;
  change?: number;
  prefix?: string;
  suffix?: string;
}

interface NewsItem {
  title: string;
  link: string;
}

export default function FinancialTicker() {
  const [items, setItems] = useState<TickerItem[]>([
    { label: "USD", value: "39.21", change: 0.42, suffix: "₺" },
    { label: "EUR", value: "44.10", change: -0.11, suffix: "₺" },
    { label: "GBP", value: "51.20", change: 0.18, suffix: "₺" },
    { label: "BTC", value: "108,420", change: 1.8, prefix: "$" },
    { label: "ETH", value: "3,240", change: 0.9, prefix: "$" },
    { label: "GRAM ALTIN", value: "4.352", suffix: "₺" },
    { label: "BIST100", value: "10.421", change: 0.76 },
    { label: "Mortgage", value: "%2.89" },
  ]);

  const [news, setNews] = useState<NewsItem[]>([
    { title: "EPH Platformu Denizli'de pilot çalışmalarını başarıyla tamamladı", link: "#" },
    { title: "Türkiye'de konut satışları bu yıl rekor kırdı", link: "#" },
    { title: "Denizli'de gayrimenkul yatırımlarına ilgi artıyor", link: "#" },
  ]);
  const [newsIdx, setNewsIdx] = useState(0);
  const [newsVisible, setNewsVisible] = useState(true);

  useEffect(() => {
    const fetchFinancial = async () => {
      try {
        const [fxRes, cryptoRes] = await Promise.all([
          fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_KEY}/latest/USD`),
          fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"),
        ]);
        const fxData = await fxRes.json();
        const cryptoData = await cryptoRes.json();
        if (fxData.conversion_rates) {
          const TRY = fxData.conversion_rates.TRY;
          const EUR = fxData.conversion_rates.EUR;
          const GBP = fxData.conversion_rates.GBP;
          setItems([
            { label: "USD", value: TRY.toFixed(2), change: 0.42, suffix: "₺" },
            { label: "EUR", value: (TRY / EUR).toFixed(2), change: -0.11, suffix: "₺" },
            { label: "GBP", value: (TRY / GBP).toFixed(2), change: 0.18, suffix: "₺" },
            { label: "BTC", value: Math.round(cryptoData.bitcoin?.usd ?? 108420).toLocaleString("en"), change: parseFloat((cryptoData.bitcoin?.usd_24h_change ?? 1.8).toFixed(2)), prefix: "$" },
            { label: "ETH", value: Math.round(cryptoData.ethereum?.usd ?? 3240).toLocaleString("en"), change: parseFloat((cryptoData.ethereum?.usd_24h_change ?? 0.9).toFixed(2)), prefix: "$" },
            { label: "GRAM ALTIN", value: "4.352", suffix: "₺" },
            { label: "BIST100", value: "10.421", change: 0.76 },
            { label: "Mortgage", value: "%2.89" },
          ]);
        }
      } catch (e) {
        console.error("Finansal veri hatası:", e);
      }
    };
    fetchFinancial();
    const iv = setInterval(fetchFinancial, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent("https://www.bloomberght.com/rss")}&count=8`
        );
        const data = await res.json();
        if (data.status === "ok" && data.items?.length > 0) {
          setNews(data.items.map((item: any) => ({ title: item.title, link: item.link })));
        }
      } catch (e) {
        console.error("Haber hatası:", e);
      }
    };
    fetchNews();
    const iv = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setNewsVisible(false);
      setTimeout(() => {
        setNewsIdx(i => (i + 1) % news.length);
        setNewsVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(iv);
  }, [news.length]);

  return (
    <>
      <style>{`
        @keyframes tk-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "stretch", overflow: "hidden", height: 30 }}>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", animation: "tk-scroll 50s linear infinite", whiteSpace: "nowrap" }}>
            {[0, 1].map(ri => (
              <span key={ri} style={{ display: "inline-flex", alignItems: "center" }}>
                {items.map((item, i) => (
                  <span key={`${ri}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginRight: 20 }}>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.8px" }}>{item.label}</span>
                    <span style={{ color: "#fff", fontSize: 10.5, fontWeight: 700 }}>{item.prefix}{item.value}{item.suffix}</span>
                    {item.change !== undefined && (
                      <span style={{ color: item.change >= 0 ? "#86efac" : "#fca5a5", fontSize: 9.5, fontWeight: 700 }}>
                        {item.change >= 0 ? "▲" : "▼"} %{Math.abs(item.change)}
                      </span>
                    )}
                    <span style={{ color: "rgba(255,255,255,0.1)", marginLeft: 8 }}>|</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <div style={{ background: "#1e3a8a", padding: "0 14px", display: "flex", alignItems: "center", gap: 7, flexShrink: 0, width: 320, borderLeft: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <span style={{ color: "#60a5fa", fontSize: 9, fontWeight: 700, letterSpacing: "1px", flexShrink: 0 }}>HABER</span>
          <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>·</span>
          <a href={news[newsIdx]?.link ?? "#"} target="_blank" rel="noopener noreferrer" style={{ color: "#bfdbfe", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "none", opacity: newsVisible ? 1 : 0, transition: "opacity 0.4s" }}>{news[newsIdx]?.title}</a>
        </div>
      </div>
    </>
  );
}