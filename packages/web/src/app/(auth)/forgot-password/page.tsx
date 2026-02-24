"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { forgotPasswordApi } from "@/services/auth.api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(email);
      setSent(true);
    } catch {
      // Anti-enumeration: always show success
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="p-6 text-center">
        <Mail size={48} className="mx-auto mb-4 text-brand-green" />
        <h2 className="text-xl font-bold text-text-primary">Check Your Email</h2>
        <p className="mt-2 text-sm text-text-secondary">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent password reset
          instructions.
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

  return (
    <Card className="p-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-text-primary">Forgot Password</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Enter your email and we&apos;ll send you instructions to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        {error && <p className="text-sm text-error">{error}</p>}

        <Button type="submit" loading={loading} size="lg" className="w-full">
          Send Reset Link
        </Button>

        <Link href="/login" className="text-center text-sm text-brand-green hover:underline">
          Back to Sign In
        </Link>
      </form>
    </Card>
  );
}
