"use client";
import { useState, useEffect } from "react";

const EXCHANGE_KEY = "27ab27e174aa353884ced87b";
const GOLD_KEY = "goldapi-8f600a41111b003f1bb7efb1940f033f-io";
const FINNHUB_KEY = "d81ns29r01qrojfcdtug";

interface TickerItem {
  label: string;
  value: string;
  change?: number;
  prefix?: string;
  suffix?: string;
}

export default function FinancialTicker() {
  const [items, setItems] = useState<TickerItem[]>([
    { label: "USD", value: "39.21", suffix: "₺" },
    { label: "EUR", value: "44.10", suffix: "₺" },
    { label: "GBP", value: "51.20", suffix: "₺" },
    { label: "BTC", value: "108,420", change: 1.8, prefix: "$" },
    { label: "ETH", value: "3,240", change: 0.9, prefix: "$" },
    { label: "GRAM ALTIN", value: "4.352", suffix: "₺" },
    { label: "BIST100", value: "10.421", change: 0.76 },
  ]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [fxRes, cryptoRes] = await Promise.all([
          fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_KEY}/latest/USD`),
          fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"),
        ]);
        const fxData = await fxRes.json();
        const cryptoData = await cryptoRes.json();

        let gramAltin = "4.352";
        let altinChange: number | undefined = undefined;
        let bist = "10.421";
        let bistChange: number | undefined = undefined;

        try {
          const goldRes = await fetch("https://www.goldapi.io/api/XAU/USD", {
            headers: { "x-access-token": GOLD_KEY },
          });
          const goldData = await goldRes.json();
          if (goldData.price_gram_24k && fxData.conversion_rates?.TRY) {
            const gramTRY = goldData.price_gram_24k * fxData.conversion_rates.TRY;
            gramAltin = Math.round(gramTRY).toLocaleString("tr-TR");
            altinChange = parseFloat((goldData.chp ?? 0).toFixed(2));
          }
        } catch (e) {
          console.error("Altın verisi hatası:", e);
        }

        try {
          const bistRes = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=XU100.IS&token=${FINNHUB_KEY}`
          );
          const bistData = await bistRes.json();
          if (bistData.c) {
            bist = Math.round(bistData.c).toLocaleString("tr-TR");
            const change = ((bistData.c - bistData.pc) / bistData.pc) * 100;
            bistChange = parseFloat(change.toFixed(2));
          }
        } catch (e) {
          console.error("BIST100 verisi hatası:", e);
        }

        if (fxData.conversion_rates) {
          const TRY = fxData.conversion_rates.TRY;
          const EUR = fxData.conversion_rates.EUR;
          const GBP = fxData.conversion_rates.GBP;

          setItems([
            { label: "USD", value: TRY.toFixed(2), suffix: "₺" },
            { label: "EUR", value: (TRY / EUR).toFixed(2), suffix: "₺" },
            { label: "GBP", value: (TRY / GBP).toFixed(2), suffix: "₺" },
            {
              label: "BTC",
              value: Math.round(cryptoData.bitcoin?.usd ?? 108420).toLocaleString("en"),
              change: parseFloat((cryptoData.bitcoin?.usd_24h_change ?? 1.8).toFixed(2)),
              prefix: "$",
            },
            {
              label: "ETH",
              value: Math.round(cryptoData.ethereum?.usd ?? 3240).toLocaleString("en"),
              change: parseFloat((cryptoData.ethereum?.usd_24h_change ?? 0.9).toFixed(2)),
              prefix: "$",
            },
            { label: "GRAM ALTIN", value: gramAltin, change: altinChange, suffix: "₺" },
            { label: "BIST100", value: bist, change: bistChange },
          ]);
        }
      } catch (e) {
        console.error("Finansal veri hatası:", e);
      }
    };

    fetchAll();
    const iv = setInterval(fetchAll, 8 * 60 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <style>{`
        @keyframes tk-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div style={{
        background: "#0f172a",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        height: 30,
        display: "flex",
        alignItems: "center",
      }}>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", animation: "tk-scroll 50s linear infinite", whiteSpace: "nowrap" }}>
            {[0, 1].map(ri => (
              <span key={ri} style={{ display: "inline-flex", alignItems: "center" }}>
                {items.map((item, i) => (
                  <span key={`${ri}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginRight: 20 }}>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.8px" }}>
                      {item.label}
                    </span>
                    <span style={{ color: "#fff", fontSize: 10.5, fontWeight: 700 }}>
                      {item.prefix}{item.value}{item.suffix}
                    </span>
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
      </div>
    </>
  );
}