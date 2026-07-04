"use client";

import { Loader2, X } from "lucide-react";
import { useState } from "react";

import type {
  EPHBulkActionContext,
  EPHBulkActionDefinition,
} from "./schema.types";

const TONE_CLASSES = {
  default: "border-[#D9E2EF] bg-white text-[#0F172A]",
  primary: "border-[#2563EB] bg-[#2563EB] text-white",
  success: "border-emerald-600 bg-emerald-600 text-white",
  warning: "border-amber-500 bg-amber-500 text-white",
  danger: "border-red-600 bg-red-600 text-white",
};

export default function SchemaBulkActionBar<T>({
  selectedIds,
  selectedItems,
  allItems,
  actions,
  onClear,
}: {
  selectedIds: string[];
  selectedItems: T[];
  allItems: T[];
  actions: EPHBulkActionDefinition<T>[];
  onClear: () => void;
}) {
  const [runningId, setRunningId] = useState("");

  if (selectedIds.length === 0) return null;

  const context: EPHBulkActionContext<T> = {
    selectedIds,
    selectedItems,
    allItems,
  };

  const runAction = async (action: EPHBulkActionDefinition<T>) => {
    if (action.requiresConfirmation) {
      const approved = window.confirm(
        action.confirmationText ||
          `${selectedIds.length} kayıt için “${action.label}” işlemi uygulansın mı?`,
      );

      if (!approved) return;
    }

    try {
      setRunningId(action.id);
      await action.execute(context);
    } finally {
      setRunningId("");
    }
  };

  return (
    <div className="fixed inset-x-2 bottom-[calc(78px+env(safe-area-inset-bottom,0px))] z-[90] mx-auto max-w-[720px] rounded-[22px] border border-[#D9E2EF] bg-white p-2.5 shadow-[0_18px_46px_rgba(15,23,42,0.24)]">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-black text-[#1D4ED8]">
          {selectedIds.length} kayıt seçildi
        </span>

        <button
          type="button"
          onClick={onClear}
          className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-[#D9E2EF] bg-[#F8FAFC]"
          aria-label="Seçimi temizle"
        >
          <X size={17} />
        </button>
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
        {actions.map((action) => {
          const disabled =
            Boolean(runningId) || Boolean(action.disabled?.(context));
          const tone = action.tone || "default";

          return (
            <button
              key={action.id}
              type="button"
              disabled={disabled}
              onClick={() => runAction(action)}
              className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-[15px] border px-3 text-[11px] font-black disabled:opacity-45 ${TONE_CLASSES[tone]}`}
            >
              {runningId === action.id ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                action.icon
              )}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
