"use client";

import {
  useEffect,
  type FormEvent,
  type ReactNode,
} from "react";

import type { EPHCreateMode } from "./create-system.types";

type Props = {
  open: boolean;
  mode?: EPHCreateMode;
  title: string;
  subtitle?: string;
  submitLabel?: string;
  cancelLabel?: string;
  saving?: boolean;
  canSubmit?: boolean;
  error?: string;
  warning?: string;
  success?: string;
  headerActions?: ReactNode;
  footerBefore?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
};

function getDefaultSubmitLabel(mode: EPHCreateMode) {
  if (mode === "EDIT") {
    return "Değişiklikleri Kaydet";
  }

  if (mode === "DUPLICATE") {
    return "Kopyayı Oluştur";
  }

  if (mode === "BULK_CREATE") {
    return "Toplu Oluştur";
  }

  return "Kaydet ve Oluştur";
}

export default function CreateSystemShell({
  open,
  mode = "CREATE",
  title,
  subtitle,
  submitLabel,
  cancelLabel = "Vazgeç",
  saving = false,
  canSubmit = true,
  error,
  warning,
  success,
  headerActions,
  footerBefore,
  children,
  onClose,
  onSubmit,
}: Props) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, saving]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (saving || !canSubmit) {
      return;
    }

    await onSubmit();
  };

  return (
    <div
      data-eph-create-system="true"
      className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-[3px]"
        aria-hidden="true"
      />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="eph-create-system-title"
        onSubmit={handleSubmit}
        className="relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-[28px] border-2 border-[#C7D6E8] bg-[#F4F8FF] shadow-[0_28px_90px_rgba(15,23,42,0.32)] sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-[30px]"
      >
        <header className="shrink-0 border-b border-[#C7D6E8] bg-white px-4 py-3 sm:px-5">
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Pencereyi kapat"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-xl font-black text-[#1F2937] disabled:opacity-40"
            >
              ×
            </button>

            <div className="min-w-0 text-center">
              <h2
                id="eph-create-system-title"
                className="break-words text-center text-[20px] font-black leading-tight text-[#1F2937] sm:text-[24px]"
              >
                {title}
              </h2>

              {subtitle && (
                <p className="mx-auto mt-1 max-w-2xl break-words text-center text-[12px] font-bold leading-5 text-[#64748B]">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex h-11 w-11 items-center justify-center">
              {headerActions}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          {error && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-center text-[12px] font-black text-red-700">
              {error}
            </div>
          )}

          {warning && (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-[12px] font-black text-amber-800">
              {warning}
            </div>
          )}

          {success && (
            <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-[12px] font-black text-emerald-700">
              {success}
            </div>
          )}

          {children}
        </div>

        <footer
          className="shrink-0 border-t border-[#C7D6E8] bg-white px-3 py-3 sm:px-5"
          style={{
            paddingBottom:
              "calc(12px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {footerBefore}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-[#C7D6E8] bg-white px-3 text-[12px] font-black text-[#1F2937] disabled:opacity-40"
            >
              {cancelLabel}
            </button>

            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="flex min-h-12 items-center justify-center rounded-2xl bg-[#2563EB] px-3 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(37,99,235,0.24)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving
                ? "Kaydediliyor..."
                : submitLabel || getDefaultSubmitLabel(mode)}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
