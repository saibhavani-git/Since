"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { OtpForm } from "./otp-form";
import { isIndianMobile, tenDigits } from "./phone";
import { useSignup } from "./use-session";

type Step = { kind: "details" } | { kind: "otp"; phone: string; devOtp?: string };

/** Two steps on one page: details, then the six-digit code. No page reload between them. */
export function SignUpForm() {
  const router = useRouter();
  const signup = useSignup();
  const [step, setStep] = useState<Step>({ kind: "details" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  if (step.kind === "otp") {
    return <OtpForm phone={step.phone} devOtp={step.devOtp} onVerified={() => router.replace("/catch-up?welcome=1")} onBack={() => setStep({ kind: "details" })} />;
  }

  const errors = {
    name: touched && !name.trim() ? "Tell us what to call you" : undefined,
    phone: touched && !isIndianMobile(phone) ? "Enter your 10-digit mobile number" : undefined,
    password: touched && password.length < 8 ? "Use at least 8 characters" : undefined,
  };
  const serverError =
    signup.error instanceof ApiError
      ? signup.error.status === 409
        ? "This number already has an account."
        : signup.error.message
      : signup.error
        ? "Couldn't reach Since. Check your connection."
        : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !isIndianMobile(phone) || password.length < 8) return;
    const fullPhone = `+91${tenDigits(phone)}`;
    signup.mutate(
      { name: name.trim(), phone: fullPhone, password },
      { onSuccess: (res) => setStep({ kind: "otp", phone: fullPhone, devOtp: res.devOtp }) },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="display text-[36px]">
          Start with <span className="serif-accent text-text-2">one stock.</span>
        </h1>
        <p className="mt-2 text-[15px] text-text-2">Since tells you what changed the next time you open it.</p>
      </div>
      <Field label="Your name" autoComplete="name" placeholder="Asha" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoFocus />
      <Field
        label="Mobile number"
        prefix="+91"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="98765 43210"
        value={phone}
        onChange={(e) => setPhone(tenDigits(e.target.value))}
        error={errors.phone}
        hint="We'll text a 6-digit code to confirm it's you."
      />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      {serverError ? (
        <p role="alert" className="rounded-[14px] bg-fall-tint px-4 py-3 text-[14px] text-fall-strong">
          {serverError}
        </p>
      ) : null}
      <Button type="submit" size="lg" block loading={signup.isPending}>
        Continue
      </Button>
      <p className="text-center text-[14px] text-text-2">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-text underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
