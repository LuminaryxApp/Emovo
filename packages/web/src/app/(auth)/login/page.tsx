"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!email || !password) {
      setValidationError("Please fill in all fields");
      return;
    }

    try {
      await login(email, password);
      router.replace("/home");
    } catch {
      // Error is set in the store
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-text-primary">Welcome Back</h2>
        <p className="mt-1 text-sm text-text-secondary">Track your emotional well-being</p>
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

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 bottom-[11px] text-text-tertiary hover:text-text-primary"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {(error || validationError) && (
          <p className="text-sm text-error">{validationError || error}</p>
        )}

        <Button type="submit" loading={isLoading} size="lg" className="w-full">
          Sign In
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-brand-green hover:underline">
            Forgot password?
          </Link>
          <Link href="/register" className="text-brand-green hover:underline">
            Create Account
          </Link>
        </div>
      </form>
    </Card>
  );
}
