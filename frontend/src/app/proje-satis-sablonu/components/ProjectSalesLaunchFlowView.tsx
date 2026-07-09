"use client";

import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Eye,
  ImagePlus,
  Layers3,
  Link2,
  Megaphone,
  Palette,
  Share2,
  Sparkles,
} from "lucide-react";

import type {
  PageMode,
  ProjectLaunchCenterResponse,
  ProjectPresentationLinkResponse,
  ProjectRenderWorkOrderResponse,
  ProjectSummary,
} from "../lib/projectSalesTypes";
import {
  cardStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../lib/projectSalesStyles";
import { InfoBand, Metric, SectionTitle } from "./ProjectSalesPrimitives";

type LaunchMode = Extract<PageMode, "render" | "presentation" | "publish">;

const launchSteps: Array<{
  mode: LaunchMode;
  label: string;
  icon: typeof Sparkles;
}> = [
  { mode: "render", label: "3D Render", icon: Sparkles },
  { mode: "presentation", label: "Müşteri Sunumu", icon: Eye },
  { mode: "publish", label: "Havuza Yayın", icon: Megaphone },
];

export function ProjectSalesLaunchFlowView({
  project,
  launch,
  mode,
  onModeChange,
  onCreateRenderWorkOrder,
  onCreatePresentationLink,
  onPublishToPool,
  renderWorkOrder,
  presentationLink,
  busyAction,
}: {
  project: ProjectSummary;
  launch: ProjectLaunchCenterResponse;
  mode: LaunchMode;
  onModeChange: (mode: LaunchMode) => void;
  onCreateRenderWorkOrder: () => void;
  onCreatePresentationLink: () => void;
  onPublishToPool: () => void;
  renderWorkOrder: ProjectRenderWorkOrderResponse | null;
  presentationLink: ProjectPresentationLinkResponse | null;
  busyAction: string | null;
}) {
  const activeIndex = launchSteps.findIndex((step) => step.mode === mode);

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        marginTop: 12,
        paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
      }}
    >
      <section
        style={{
          ...cardStyle,
          borderColor: "#93C5FD",
          background:
            "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 48%, #F0FDF4 100%)",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<Sparkles size={22} />}
          title="Proje Lansman Merkezi"
          subtitle={`${project.name} • render, sunum ve havuz yayını`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
            gap: 7,
            marginTop: 12,
          }}
        >
          <Metric label="Blok" value={project._count.blocks} />
          <Metric label="Bağımsız" value={launch.presentation.metrics.totalUnits} />
          <Metric label="Görsel" value={launch.presentation.metrics.imageCount} />
          <Metric
            label="Yayın"
            value={launch.publishReadiness.ready ? "Hazır" : "Eksik"}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 7,
            marginTop: 12,
          }}
        >
          {launchSteps.map((step, index) => {
            const Icon = step.icon;
            const active = step.mode === mode;
            const completed = index < activeIndex;

            return (
              <button
                key={step.mode}
                type="button"
                onClick={() => onModeChange(step.mode)}
                style={{
                  border: active
                    ? "1.5px solid #2563EB"
                    : completed
                      ? "1.5px solid #86EFAC"
                      : "1.5px solid #D6E2F0",
                  borderRadius: 14,
                  background: active
                    ? "#EAF2FF"
                    : completed
                      ? "#F0FDF4"
                      : "#FFFFFF",
                  color: active
                    ? "#1557D6"
                    : completed
                      ? "#047857"
                      : "#64748B",
                  minHeight: 58,
                  display: "grid",
                  placeItems: "center",
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                <Icon size={18} />
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {mode === "render" ? (
        <RenderBriefPanel
          launch={launch}
          renderWorkOrder={renderWorkOrder}
          busyAction={busyAction}
          onCreateRenderWorkOrder={onCreateRenderWorkOrder}
          onNext={() => onModeChange("presentation")}
        />
      ) : mode === "presentation" ? (
        <PresentationPreviewPanel
          launch={launch}
          presentationLink={presentationLink}
          busyAction={busyAction}
          onCreatePresentationLink={onCreatePresentationLink}
          onNext={() => onModeChange("publish")}
        />
      ) : (
        <PublishReadinessPanel
          launch={launch}
          busyAction={busyAction}
          onPublishToPool={onPublishToPool}
        />
      )}
    </div>
  );
}

function RenderBriefPanel({
  launch,
  renderWorkOrder,
  busyAction,
  onCreateRenderWorkOrder,
  onNext,
}: {
  launch: ProjectLaunchCenterResponse;
  renderWorkOrder: ProjectRenderWorkOrderResponse | null;
  busyAction: string | null;
  onCreateRenderWorkOrder: () => void;
  onNext: () => void;
}) {
  const sceneIcons = [Building2, Layers3, Palette];

  return (
    <section style={{ ...cardStyle, padding: 13 }}>
      <SectionTitle
        icon={<ImagePlus size={22} />}
        title="3D Render Oluştur"
        subtitle="Müteahhitin verdiği bilgilerden satışa hazır render brief'i üretin."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
          gap: 9,
          marginTop: 12,
        }}
      >
        {launch.renderBrief.renderScenes.map((item, index) => {
          const Icon = sceneIcons[index % sceneIcons.length];

          return (
            <article
              key={item.title}
              style={{
                border: "1.5px solid #C7D6E8",
                borderRadius: 16,
                background: "#F8FAFC",
                padding: 12,
                display: "grid",
                gap: 8,
              }}
            >
              <Icon size={22} color="#1557D6" />
              <strong style={{ color: "#1F2937", fontSize: 12, fontWeight: 950 }}>
                {item.title}
              </strong>
              <span style={{ color: "#64748B", fontSize: 10, lineHeight: 1.45, fontWeight: 750 }}>
                {item.prompt}
              </span>
            </article>
          );
        })}
      </div>

      <InfoBand tone="info">
        Mimari stil: {launch.renderBrief.architecturalStyle}. Negatif prompt:
        {" "}{launch.renderBrief.negativePrompt}
      </InfoBand>

      {renderWorkOrder && (
        <InfoBand tone="info">
          Render iş emri hazır: {renderWorkOrder.id}.{" "}
          {renderWorkOrder.scenes.length} sahne üretim kuyruğuna hazırlanacak.
        </InfoBand>
      )}

      <button
        type="button"
        onClick={onCreateRenderWorkOrder}
        disabled={busyAction === "render-work-order"}
        style={{
          ...secondaryButtonStyle,
          width: "100%",
          marginTop: 12,
          borderColor: "#C4B5FD",
          background: "#F5F3FF",
          color: "#6D28D9",
        }}
      >
        <ImagePlus size={18} />
        {busyAction === "render-work-order"
          ? "İş Emri Hazırlanıyor"
          : "Render İş Emri Oluştur"}
      </button>

      <button
        type="button"
        onClick={onNext}
        style={{ ...primaryButtonStyle, width: "100%", marginTop: 12 }}
      >
        <Eye size={18} />
        Müşteri Sunum Önizlemeye Geç
      </button>
    </section>
  );
}

function PresentationPreviewPanel({
  launch,
  presentationLink,
  busyAction,
  onCreatePresentationLink,
  onNext,
}: {
  launch: ProjectLaunchCenterResponse;
  presentationLink: ProjectPresentationLinkResponse | null;
  busyAction: string | null;
  onCreatePresentationLink: () => void;
  onNext: () => void;
}) {
  const { presentation } = launch;

  return (
    <section style={{ ...cardStyle, padding: 13 }}>
      <SectionTitle
        icon={<Share2 size={22} />}
        title="Müşteri Sunum Önizleme"
        subtitle="Render, stok ve proje bilgilerini müşteriye gösterilecek kapalı sunumda birleştirin."
      />

      <div
        style={{
          border: "1.5px solid #D6E2F0",
          borderRadius: 18,
          background: "#F8FAFC",
          minHeight: 220,
          marginTop: 12,
          padding: 14,
          display: "grid",
          alignContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <strong style={{ color: "#06194A", fontSize: 20, fontWeight: 950 }}>
            {presentation.title}
          </strong>
          <p style={{ color: "#64748B", fontSize: 11, fontWeight: 750 }}>
            {presentation.subtitle} • {presentation.metrics.availableUnits} aktif stok
          </p>
        </div>

        {presentation.coverUrl ? (
          <img
            src={presentation.coverUrl}
            alt={presentation.title}
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              objectFit: "cover",
              borderRadius: 16,
              border: "1.5px solid #D6E2F0",
            }}
          />
        ) : (
          <div
            style={{
              border: "1.5px dashed #93C5FD",
              borderRadius: 16,
              background: "#EFF6FF",
              minHeight: 110,
              display: "grid",
              placeItems: "center",
              color: "#1557D6",
              fontSize: 12,
              fontWeight: 900,
              textAlign: "center",
              padding: 12,
            }}
          >
            Render kapak görseli veya proje genel fotoğrafı burada görünecek.
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
            gap: 7,
          }}
        >
          <Metric label="Aktif" value={presentation.metrics.availableUnits} />
          <Metric label="Rezerve" value={presentation.metrics.reservedUnits} />
          <Metric label="Satılan" value={presentation.metrics.closedUnits} />
        </div>
      </div>

      {presentation.highlightedUnits.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          {presentation.highlightedUnits.map((unit) => (
            <article
              key={unit.id}
              style={{
                border: "1.5px solid #D6E2F0",
                borderRadius: 14,
                background: "#FFFFFF",
                padding: 10,
                display: "grid",
                gap: 4,
              }}
            >
              <strong style={{ color: "#1F2937", fontSize: 11, fontWeight: 950 }}>
                {unit.title || unit.type}
              </strong>
              <span style={{ color: "#64748B", fontSize: 9, fontWeight: 750 }}>
                {unit.type} {unit.roomCount ? `• ${unit.roomCount}` : ""}
              </span>
              <span style={{ color: "#047857", fontSize: 10, fontWeight: 900 }}>
                {unit.price > 0
                  ? `${new Intl.NumberFormat("tr-TR").format(unit.price)} ${unit.priceCurrency || "TRY"}`
                  : "Fiyat bekleniyor"}
              </span>
            </article>
          ))}
        </div>
      )}

      {presentationLink && (
        <InfoBand tone="info">
          Müşteri sunum linki hazır: {presentationLink.url}
        </InfoBand>
      )}

      <button
        type="button"
        onClick={onCreatePresentationLink}
        disabled={busyAction === "presentation-link"}
        style={{
          ...secondaryButtonStyle,
          width: "100%",
          marginTop: 12,
          borderColor: "#BFDBFE",
          background: "#EFF6FF",
          color: "#1D4ED8",
        }}
      >
        <Link2 size={18} />
        {busyAction === "presentation-link"
          ? "Link Hazırlanıyor"
          : "Güvenli Müşteri Linki Oluştur"}
      </button>

      <button
        type="button"
        onClick={onNext}
        style={{ ...primaryButtonStyle, width: "100%", marginTop: 12 }}
      >
        <Megaphone size={18} />
        Havuza Yayın Adımına Geç
      </button>
    </section>
  );
}

function PublishReadinessPanel({
  launch,
  busyAction,
  onPublishToPool,
}: {
  launch: ProjectLaunchCenterResponse;
  busyAction: string | null;
  onPublishToPool: () => void;
}) {
  return (
    <section style={{ ...cardStyle, padding: 13 }}>
      <SectionTitle
        icon={<Megaphone size={22} />}
        title="Havuza Yayınla"
        subtitle="Proje satış stoğu, sunum ve görseller hazır olduğunda havuza kontrollü yayınlanır."
      />

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {launch.publishReadiness.checks.map((item) => (
          <div
            key={item.key}
            style={{
              border: item.passed
                ? "1.5px solid #BBF7D0"
                : "1.5px solid #FED7AA",
              borderRadius: 14,
              background: item.passed ? "#F0FDF4" : "#FFF7ED",
              color: item.passed ? "#047857" : "#9A3412",
              padding: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              fontWeight: 850,
            }}
          >
            <CheckCircle2 size={17} />
            {item.label}
            {item.detail ? ` • ${item.detail}` : ""}
          </div>
        ))}
      </div>

      <InfoBand tone="warning">
        {launch.publishReadiness.warning}
      </InfoBand>

      <button
        type="button"
        onClick={onPublishToPool}
        disabled={!launch.publishReadiness.ready || busyAction === "publish-to-pool"}
        style={{
          ...secondaryButtonStyle,
          width: "100%",
          marginTop: 12,
          borderColor: "#A7F3D0",
          background: launch.publishReadiness.ready ? "#DCFCE7" : "#F0FDF4",
          color: "#047857",
          cursor:
            launch.publishReadiness.ready && busyAction !== "publish-to-pool"
              ? "pointer"
              : "not-allowed",
        }}
      >
        <BadgeDollarSign size={18} />
        {busyAction === "publish-to-pool"
          ? "Havuza Yayınlanıyor"
          : launch.publishReadiness.ready
            ? "Projeyi Havuza Yayınla"
            : "Eksikler Tamamlanmadan Yayın Kapalı"}
      </button>

      <button
        type="button"
        disabled
        style={{
          ...secondaryButtonStyle,
          width: "100%",
          marginTop: 8,
          borderColor: "#BFDBFE",
          background: "#EFF6FF",
          color: "#1D4ED8",
          cursor: "not-allowed",
        }}
      >
        <Link2 size={18} />
        Müşteri Linki Oluşturma Bir Sonraki Faz
      </button>
    </section>
  );
}
