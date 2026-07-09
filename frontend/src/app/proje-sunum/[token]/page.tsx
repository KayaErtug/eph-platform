"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, CheckCircle2, ImageIcon, Loader2, MapPin } from "lucide-react";

import type { ProjectLaunchCenterResponse } from "@/app/proje-satis-sablonu/lib/projectSalesTypes";
import api from "@/lib/api";

type SharedPresentationResponse = Pick<
  ProjectLaunchCenterResponse,
  "project" | "presentation" | "publishReadiness"
>;

export default function ProjectPresentationSharePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<SharedPresentationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    let alive = true;

    api
      .get<SharedPresentationResponse>(
        `/project-presentation-share/${encodeURIComponent(token)}`,
      )
      .then((response) => {
        if (!alive) return;
        setData(response.data);
        setError("");
      })
      .catch((requestError) => {
        if (!alive) return;
        setError(
          requestError?.response?.data?.message ||
            "Proje sunumu şu anda görüntülenemiyor.",
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="share-state">
        <Loader2 className="spin" size={32} />
        <strong>Proje sunumu hazırlanıyor</strong>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="share-state">
        <Building2 size={34} />
        <strong>Sunum bağlantısı geçerli değil</strong>
        <span>{error || "Bu bağlantı süresi dolmuş olabilir."}</span>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const { presentation, project, publishReadiness } = data;

  return (
    <main className="page">
      <section className="hero">
        {presentation.coverUrl ? (
          <img src={presentation.coverUrl} alt={presentation.title} />
        ) : (
          <div className="imageFallback">
            <ImageIcon size={42} />
          </div>
        )}
        <div className="heroText">
          <span className="eyebrow">EPH Proje Sunumu</span>
          <h1>{presentation.title}</h1>
          <p>
            <MapPin size={15} />
            {presentation.subtitle}
          </p>
        </div>
      </section>

      <section className="metrics">
        <Metric label="Toplam" value={presentation.metrics.totalUnits} />
        <Metric label="Satışta" value={presentation.metrics.availableUnits} />
        <Metric label="Rezerve" value={presentation.metrics.reservedUnits} />
        <Metric label="Satılan" value={presentation.metrics.closedUnits} />
      </section>

      <section className="section">
        <h2>Proje Özeti</h2>
        <div className="chips">
          {presentation.highlights.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Öne Çıkan Bağımsız Bölümler</h2>
        <div className="units">
          {presentation.highlightedUnits.map((unit) => (
            <article key={unit.id}>
              <strong>{unit.title || unit.type}</strong>
              <span>
                {unit.type}
                {unit.roomCount ? ` • ${unit.roomCount}` : ""}
              </span>
              <b>
                {unit.price > 0
                  ? `${new Intl.NumberFormat("tr-TR").format(unit.price)} ${unit.priceCurrency || "TRY"}`
                  : "Fiyat bilgisi için iletişime geçiniz"}
              </b>
            </article>
          ))}
        </div>
      </section>

      <section className="notice">
        <CheckCircle2 size={18} />
        <span>
          {project.name} sunumu güvenli bağlantı üzerinden görüntüleniyor.
          Yayın durumu: {publishReadiness.ready ? "hazır" : "kontrolde"}.
        </span>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const styles = `
  .page {
    min-height: 100vh;
    background: #f6f9fd;
    color: #06194a;
    padding: 18px;
    display: grid;
    gap: 14px;
    align-content: start;
  }
  .hero {
    position: relative;
    overflow: hidden;
    border-radius: 22px;
    min-height: 360px;
    background: #dbeafe;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
  }
  .hero img,
  .imageFallback {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .imageFallback {
    display: grid;
    place-items: center;
    color: #2563eb;
    background: linear-gradient(135deg, #dbeafe, #f0fdf4);
  }
  .hero::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(6, 25, 74, 0.08), rgba(6, 25, 74, 0.78));
  }
  .heroText {
    position: absolute;
    z-index: 1;
    left: 18px;
    right: 18px;
    bottom: 18px;
    color: #fff;
  }
  .eyebrow {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  h1 {
    margin: 8px 0;
    font-size: 34px;
    line-height: 1.05;
  }
  .heroText p {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 750;
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
  .metrics div,
  .section,
  .notice {
    border: 1px solid #d6e2f0;
    border-radius: 18px;
    background: #fff;
    padding: 13px;
  }
  .metrics div {
    text-align: center;
  }
  .metrics strong {
    display: block;
    font-size: 20px;
  }
  .metrics span,
  .units span {
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
  }
  h2 {
    margin: 0 0 10px;
    font-size: 16px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .chips span {
    border-radius: 999px;
    background: #eff6ff;
    color: #1d4ed8;
    padding: 7px 10px;
    font-size: 11px;
    font-weight: 850;
  }
  .units {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
    gap: 8px;
  }
  .units article {
    border: 1px solid #d6e2f0;
    border-radius: 15px;
    padding: 11px;
    display: grid;
    gap: 5px;
  }
  .units b {
    color: #047857;
    font-size: 12px;
  }
  .notice {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    color: #047857;
    font-size: 12px;
    font-weight: 800;
  }
  .share-state {
    min-height: 100vh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    background: #f6f9fd;
    color: #06194a;
    text-align: center;
    padding: 20px;
  }
  .share-state span {
    color: #64748b;
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @media (max-width: 640px) {
    .page { padding: 10px; }
    .hero { min-height: 300px; border-radius: 18px; }
    h1 { font-size: 26px; }
    .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
`;
