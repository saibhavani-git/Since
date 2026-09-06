"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cx } from "@/lib/cx";

/**
 * Sheet on mobile, centred panel on desktop. Uses the native <dialog> for
 * focus trapping and Escape; motion handles enter/exit.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <dialog
          ref={ref}
          aria-label={title}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/30 backdrop:backdrop-blur-[2px] open:flex open:items-end open:justify-center sm:open:items-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cx(
              "w-full bg-surface border border-line-2 sm:max-w-[560px] rounded-t-[28px] sm:rounded-[28px] max-h-[92dvh] flex flex-col overflow-hidden",
              className,
            )}
          >
            {children}
          </motion.div>
        </dialog>
      ) : null}
    </AnimatePresence>
  );
}
