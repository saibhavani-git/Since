"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  prefix?: string;
}

/** Labelled input with hint and inline error. Errors are announced via aria-describedby. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, prefix, className, id, ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={inputId} className="label text-text-2">
        {label}
      </label>
      <div className={cx("flex h-12 items-center rounded-full border bg-surface transition-colors focus-within:border-ink", error ? "border-fall" : "border-line-2")}>
        {prefix ? <span className="pl-5 pr-1 font-mono text-[14px] text-text-3 num">{prefix}</span> : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cx("h-full min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-text-3 num", prefix ? "pr-5 pl-1" : "px-5")}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-[13px] text-fall-strong">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-text-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
