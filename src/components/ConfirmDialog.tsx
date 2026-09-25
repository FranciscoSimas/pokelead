"use client";

import { BottomSheet } from "./BottomSheet";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  variant = "danger",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  /** danger = destructive (red). primary = affirmative action (evolve). */
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const confirmClass =
    variant === "primary"
      ? "btn btn-primary min-h-11 flex-1"
      : "btn min-h-11 flex-1 bg-danger text-[#2a0710] hover:brightness-110";

  return (
    <BottomSheet open={open} onClose={onClose} title={title} zClass="z-[240]">
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted">{body}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost min-h-11 flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={confirmClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
