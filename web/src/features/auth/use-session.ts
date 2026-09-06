"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, ApiError, unwrap } from "@/lib/api/client";
import type { AuthUser, LoginRequest, SignupRequest } from "@/lib/api/types";

export const sessionKey = ["session"] as const;

/** The signed-in user, or null. 401 is a normal answer here, not an error. */
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: async (): Promise<AuthUser | null> => {
      try {
        const { user } = await unwrap(api.GET("/v1/auth/me"));
        return user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => unwrap(api.POST("/v1/auth/login", { body })),
    onSuccess: ({ user }) => qc.setQueryData(sessionKey, user),
  });
}

export function useSignup() {
  return useMutation({ mutationFn: (body: SignupRequest) => unwrap(api.POST("/v1/auth/signup", { body })) });
}

export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phone: string; code: string }) => unwrap(api.POST("/v1/auth/otp/verify", { body })),
    onSuccess: ({ user }) => qc.setQueryData(sessionKey, user),
  });
}

export function useResendOtp() {
  return useMutation({ mutationFn: (body: { phone: string }) => unwrap(api.POST("/v1/auth/otp/resend", { body })) });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/v1/auth/logout")),
    onSettled: () => {
      qc.clear();
      router.replace("/sign-in");
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string }) => unwrap(api.PATCH("/v1/auth/me", { body })),
    onSuccess: ({ user }) => qc.setQueryData(sessionKey, user),
  });
}
