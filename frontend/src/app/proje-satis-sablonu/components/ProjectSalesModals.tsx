import { AlertTriangle, CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import type { NoticeState, ProjectSummary } from "../lib/projectSalesTypes";
import { primaryButtonStyle, secondaryButtonStyle } from "../lib/projectSalesStyles";

export function DeleteProjectModal({
  project,
  deleting,
  onCancel,
  onConfirm,
}: {
  project: ProjectSummary;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10060,
        overflowY: "auto",
        display: "grid",
        placeItems: "center",
        padding:
          "calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))",
        background: "rgba(15, 23, 42, 0.66)",
        backdropFilter: "blur(8px)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 22,
          border: "1px solid #FECACA",
          background: "#FFFFFF",
          padding: 17,
          boxShadow: "0 26px 80px rgba(15, 23, 42, 0.30)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            margin: "0 auto",
            display: "grid",
            placeItems: "center",
            borderRadius: 16,
            background: "#FEE2E2",
            color: "#B91C1C",
          }}
        >
          <Trash2 size={25} />
        </div>

        <h2
          style={{
            margin: "12px 0 0",
            textAlign: "center",
            color: "#1F2937",
            fontSize: 17,
            lineHeight: 1.35,
            fontWeight: 950,
          }}
        >
          Projeyi kalıcı olarak sil?
        </h2>

        <p
          style={{
            margin: "7px 0 0",
            textAlign: "center",
            color: "#64748B",
            fontSize: 12,
            lineHeight: 1.6,
            fontWeight: 700,
          }}
        >
          <strong style={{ color: "#334155" }}>{project.name}</strong> ile
          birlikte blok, kat, bağımsız bölüm ve proje alanları silinir. Bu işlem
          geri alınamaz.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            marginTop: 15,
          }}
        >
          <button 
            type="button"
            onClick={onCancel}
            disabled={deleting}
            style={{ ...secondaryButtonStyle, width: "100%" }}
          >
            Vazgeç
          </button>

          <button 
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            style={{
              ...primaryButtonStyle,
              width: "100%",
              background: "linear-gradient(135deg, #DC2626, #B91C1C)",
              boxShadow: "0 10px 24px rgba(185, 28, 28, 0.20)",
            }}
          >
            {deleting ? (
              <Loader2 size={18} className="eph-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            {deleting ? "Siliniyor" : "Projeyi Sil"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function NoticeModal({
  notice,
  onClose,
}: {
  notice: Exclude<NoticeState, null>;
  onClose: () => void;
}) {
  const tone = {
    success: {
      background: "#DCFCE7",
      color: "#15803D",
      icon: <CheckCircle2 size={24} />,
    },
    warning: {
      background: "#FFEDD5",
      color: "#C2410C",
      icon: <AlertTriangle size={24} />,
    },
    error: {
      background: "#FEE2E2",
      color: "#B91C1C",
      icon: <AlertTriangle size={24} />,
    },
  }[notice.tone];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        overflowY: "auto",
        display: "grid",
        placeItems: "center",
        padding:
          "calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))",
        background: "rgba(15, 23, 42, 0.60)",
        backdropFilter: "blur(8px)",
      }}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 430,
          borderRadius: 22,
          border: "1px solid #D6E2F0",
          background: "#FFFFFF",
          padding: 17,
          boxShadow: "0 26px 80px rgba(15, 23, 42, 0.28)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px minmax(0, 1fr) 36px",
            alignItems: "start",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              borderRadius: 14,
              background: tone.background,
              color: tone.color,
            }}
          >
            {tone.icon}
          </div>

          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                color: "#1F2937",
                fontSize: 16,
                fontWeight: 950,
              }}
            >
              {notice.title}
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                color: "#64748B",
                fontSize: 12,
                lineHeight: 1.6,
                fontWeight: 700,
              }}
            >
              {notice.message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Pencereyi kapat"
            style={{
              width: 36,
              height: 36,
              border: "1.5px solid #D6E2F0",
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "#F8FAFC",
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <X size={17} />
          </button>
        </div>

        <button 
          type="button"
          onClick={onClose}
          style={{ ...primaryButtonStyle, width: "100%", marginTop: 14 }}
        >
          Tamam
        </button>
      </section>
    </div>
  );
}
