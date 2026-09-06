"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { isIndianMobile, tenDigits } from "./phone";
import { useLogin } from "./use-session";

export function SignInForm() {
  const router = useRouter();
  const login = useLogin();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const phoneError = touched && !isIndianMobile(phone) ? "Enter your 10-digit mobile number" : undefined;
  const serverError =
    login.error instanceof ApiError
      ? login.error.status === 401
        ? "That number and password don't match."
        : login.error.status === 429
          ? "Too many attempts. Give it a minute."
          : login.error.message
      : login.error
        ? "Couldn't reach Since. Check your connection."
        : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isIndianMobile(phone) || !password) return;
    login.mutate({ phone: `+91${tenDigits(phone)}`, password }, { onSuccess: () => router.replace("/catch-up") });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="display text-[36px]">
          Welcome <span className="serif-accent text-text-2">back.</span>
        </h1>
        <p className="mt-2 text-[15px] text-text-2">Let&apos;s see what changed.</p>
      </div>
      <Field
        label="Mobile number"
        prefix="+91"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="98765 43210"
        value={phone}
        onChange={(e) => setPhone(tenDigits(e.target.value))}
        error={phoneError}
        autoFocus
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={touched && !password ? "Enter your password" : undefined}
      />
      {serverError ? (
        <p role="alert" className="rounded-[14px] bg-fall-tint px-4 py-3 text-[14px] text-fall-strong">
          {serverError}
        </p>
      ) : null}
      <Button type="submit" size="lg" block loading={login.isPending}>
        Sign in
      </Button>
      <p className="text-center text-[14px] text-text-2">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-text underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
