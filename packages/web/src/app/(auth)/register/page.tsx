"use client";

import { Eye, EyeOff, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";

export default function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuthStore();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!displayName || !email || !password || !confirmPassword) {
      setValidationError("Please fill in all required fields");
      return;
    }

    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    try {
      await register(email, password, displayName, undefined, username || undefined);
      setSuccess(true);
    } catch {
      // Error is set in the store
    }
  };

  if (success) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle size={48} className="mx-auto mb-4 text-success" />
        <h2 className="text-xl font-bold text-text-primary">Account Created!</h2>
        <p className="mt-2 text-sm text-text-secondary">Check your email to verify your account.</p>
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
        <h2 className="text-xl font-bold text-text-primary">Create Account</h2>
        <p className="mt-1 text-sm text-text-secondary">Start tracking your emotional journey</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Display Name"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
        />

        <Input
          label="Username (optional)"
          placeholder="letters, numbers, underscores"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <div className="relative">
          <Input
            label="Password"
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

        {(error || validationError) && (
          <p className="text-sm text-error">{validationError || error}</p>
        )}

        <Button type="submit" loading={isLoading} size="lg" className="w-full">
          Create Account
        </Button>

        <p className="text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-green hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Card>
  );
}
