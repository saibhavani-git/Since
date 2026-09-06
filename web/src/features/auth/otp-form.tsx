"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { cx } from "@/lib/cx";
import { useResendOtp, useVerifyOtp } from "./use-session";

const LENGTH = 6;

/**
 * Six boxes, one hidden input. Pasting a code fills all six; the form submits
 * itself on the last digit so the user never hunts for a button.
 */
export function OtpForm({ phone, devOtp, onVerified, onBack }: { phone: string; devOtp?: string; onVerified: () => void; onBack: () => void }) {
  const verify = useVerifyOtp();
  const resend = useResendOtp();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(30);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = (value: string) => verify.mutate({ phone, code: value }, { onSuccess: onVerified });

  const error =
    verify.error instanceof ApiError
      ? verify.error.status === 400 || verify.error.status === 401
        ? "That code isn't right. Try again."
        : verify.error.message
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button type="button" onClick={onBack} className="text-[13px] text-text-2 hover:text-text">
          ← Back
        </button>
        <h1 className="display mt-4 text-[36px]">
          Check your <span className="serif-accent text-text-2">phone.</span>
        </h1>
        <p className="mt-2 text-[15px] text-text-2">
          We sent a 6-digit code to <span className="font-medium text-text num">{phone.replace("+91", "+91 ")}</span>.
        </p>
      </div>

      <label className="block cursor-text" onClick={() => input.current?.focus()}>
        <span className="sr-only">One-time code</span>
        <input
          ref={input}
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={LENGTH}
          value={code}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, LENGTH);
            setCode(next);
            verify.reset();
            if (next.length === LENGTH) submit(next); // auto-submit on the last digit
          }}
          className="sr-only"
        />
        <div className="flex gap-2" aria-hidden>
          {Array.from({ length: LENGTH }).map((_, i) => (
            <div
              key={i}
              className={cx(
                "flex h-14 flex-1 items-center justify-center rounded-[14px] border bg-surface font-mono text-[22px] num transition-colors",
                error ? "border-fall" : i === code.length ? "border-text" : "border-line-2",
              )}
            >
              {code[i] ?? ""}
            </div>
          ))}
        </div>
      </label>

      {error ? (
        <p role="alert" className="text-[14px] text-fall-strong">
          {error}
        </p>
      ) : null}
      {devOtp ? (
        <p className="rounded-[14px] bg-iris-tint px-4 py-3 text-[13px] text-iris-strong">
          Development build — your code is <span className="font-mono font-medium num">{devOtp}</span>.
        </p>
      ) : null}

      <Button size="lg" block loading={verify.isPending} disabled={code.length < LENGTH} onClick={() => submit(code)}>
        Verify
      </Button>
      <p className="text-center text-[14px] text-text-2">
        {cooldown > 0 ? (
          <span className="num">Resend in {cooldown}s</span>
        ) : (
          <button
            type="button"
            className="font-medium text-text underline-offset-4 hover:underline"
            disabled={resend.isPending}
            onClick={() =>
              resend.mutate(
                { phone },
                {
                  onSuccess: () => {
                    setCooldown(30);
                    setCode("");
                  },
                },
              )
            }
          >
            Resend code
          </button>
        )}
      </p>
    </div>
  );
}
