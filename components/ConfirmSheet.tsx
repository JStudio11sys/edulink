"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { useUI } from "@/lib/store";
import { SheetHeader } from "./Sheet";
import { ErrorNote, PrimaryButton } from "./ui";

/** iOS-style action sheet: big, well-spaced rows (used for "•••" menus on mobile). */
export function ActionSheet({
  title,
  actions,
}: {
  title?: string;
  actions: { label: string; icon?: React.ReactNode; danger?: boolean; onClick: () => void }[];
}) {
  const { closeSheet } = useUI();
  return (
    <div className="pt-1">
      {title && <p className="mb-3 pr-10 text-center text-sm font-medium text-muted">{title}</p>}
      <div className="overflow-hidden rounded-[22px] bg-soft">
        {actions.map((a, i) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={cn(
              "flex min-h-14 w-full items-center gap-3 px-5 text-left text-[16px] font-medium transition-colors active:bg-line",
              i > 0 && "border-t border-white",
              a.danger ? "text-red-500" : "text-ink",
            )}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
      <PrimaryButton variant="soft" className="mt-3 h-14 w-full text-[16px]" onClick={closeSheet}>
        Cancel
      </PrimaryButton>
    </div>
  );
}

export function ConfirmSheet({
  title,
  text,
  confirmLabel = "Delete",
  onConfirm,
}: {
  title: string;
  text: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
}) {
  const { closeSheet } = useUI();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="pt-1">
      <SheetHeader title={title} />
      <p className="-mt-2 text-[15px] leading-relaxed text-ink-2">{text}</p>
      <div className="mt-4">
        <ErrorNote message={error} />
      </div>
      <div className="mt-5 flex gap-2">
        <PrimaryButton variant="soft" className="flex-1" onClick={closeSheet}>
          Cancel
        </PrimaryButton>
        <PrimaryButton
          variant="danger"
          className="flex-1"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onConfirm();
              closeSheet();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}
