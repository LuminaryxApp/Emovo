"use client";

import { CheckCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resetPasswordApi } from "@/services/auth.api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-xl font-bold text-text-primary">Invalid Link</h2>
        <p className="mt-2 text-sm text-text-secondary">
          This password reset link is invalid or has expired.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-semibold text-brand-green hover:underline"
        >
          Request a new link
        </Link>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      setSuccess(true);
    } catch {
      setError("Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle size={48} className="mx-auto mb-4 text-success" />
        <h2 className="text-xl font-bold text-text-primary">Password Reset!</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Your password has been successfully reset.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-semibold text-brand-green hover:underline"
        >
          Sign In
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-text-primary">Reset Password</h2>
        <p className="mt-1 text-sm text-text-secondary">Enter your new password</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <Input
            label="New Password"
            type={showPassword ? "text" : "password"}
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 bottom-[11px] text-text-tertiary hover:text-text-primary"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        {error && <p className="text-sm text-error">{error}</p>}

        <Button type="submit" loading={loading} size="lg" className="w-full">
          Reset Password
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
