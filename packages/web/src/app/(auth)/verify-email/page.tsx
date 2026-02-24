"use client";

import { CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import { Card } from "@/components/ui/card";
import { setAccessToken, setRefreshToken } from "@/lib/api";
import { verifyEmailApi } from "@/services/auth.api";
import { useAuthStore } from "@/stores/auth.store";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    verifyEmailApi(token)
      .then((result) => {
        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken);
        setUser(result.user);
        setStatus("success");
        setTimeout(() => router.replace("/home"), 2000);
      })
      .catch(() => {
        setStatus("error");
      });
  }, [token, router, setUser]);

  if (status === "loading") {
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
        <h2 className="text-xl font-bold text-text-primary">Verifying your email...</h2>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card className="p-6 text-center">
        <CheckCircle size={48} className="mx-auto mb-4 text-success" />
        <h2 className="text-xl font-bold text-text-primary">Email Verified!</h2>
        <p className="mt-2 text-sm text-text-secondary">Redirecting you to the dashboard...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 text-center">
      <XCircle size={48} className="mx-auto mb-4 text-error" />
      <h2 className="text-xl font-bold text-text-primary">Verification Failed</h2>
      <p className="mt-2 text-sm text-text-secondary">
        This verification link is invalid or has expired.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block text-sm font-semibold text-brand-green hover:underline"
      >
        Back to Sign In
      </Link>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
