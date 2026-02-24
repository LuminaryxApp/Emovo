"use client";

import { Heart, BarChart3, Users, ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

import { useAuthStore } from "@/stores/auth.store";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/home");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setVisible(true);
    }
  }, [isLoading, isAuthenticated]);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Close mobile menu on anchor click
  const handleNavClick = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* ===== STICKY NAVBAR ===== */}
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-border-light bg-brand-cream/90 shadow-sm backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* Left: Logo + name */}
          <a href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Emovo logo"
              width={36}
              height={36}
              className="h-9 w-9"
              priority
            />
            <span className="font-serif text-xl font-bold text-brand-green">Emovo</span>
          </a>

          {/* Center/Right: Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-brand-green"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-brand-green"
            >
              How It Works
            </a>
            <a
              href="/login"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-brand-green"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="inline-flex items-center rounded-lg bg-brand-green px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-green-dark hover:shadow-md"
            >
              Get Started
            </a>
          </div>

          {/* Mobile: Hamburger toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary transition-colors hover:bg-brand-green/10 hover:text-brand-green md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile: Dropdown menu */}
        <div
          className={`overflow-hidden transition-all duration-300 md:hidden ${
            mobileMenuOpen ? "max-h-64 border-b border-border-light" : "max-h-0"
          }`}
        >
          <div className="flex flex-col gap-1 bg-brand-cream/95 px-6 pb-4 pt-2 backdrop-blur-md">
            <a
              href="#features"
              onClick={handleNavClick}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-brand-green/10 hover:text-brand-green"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={handleNavClick}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-brand-green/10 hover:text-brand-green"
            >
              How It Works
            </a>
            <a
              href="/login"
              onClick={handleNavClick}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-brand-green/10 hover:text-brand-green"
            >
              Sign In
            </a>
            <a
              href="/register"
              onClick={handleNavClick}
              className="mt-1 inline-flex items-center justify-center rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-green-dark"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
        {/* Decorative background gradient mesh */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(117,134,60,0.08), transparent)",
              "radial-gradient(ellipse 60% 50% at 80% 60%, rgba(111,152,184,0.06), transparent)",
              "radial-gradient(ellipse 90% 70% at 50% 10%, rgba(254,250,224,0.4), transparent)",
            ].join(", "),
          }}
        />
        {/* Large decorative blob */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "min(800px, 90vw)",
            height: "min(800px, 90vw)",
            borderRadius: "50%",
            background: "rgba(117,134,60,0.05)",
            filter: "blur(80px)",
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className={`landing-stagger ${visible ? "landing-stagger--active" : ""}`}>
            <p className="landing-stagger-item mb-4 text-sm font-semibold uppercase tracking-widest text-brand-green">
              Emotional Well-being
            </p>
            <h1 className="landing-stagger-item font-serif text-5xl font-bold leading-tight text-text-primary md:text-7xl">
              Track Your Emotional Journey
            </h1>
            <p className="landing-stagger-item mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-secondary md:text-xl">
              Emovo helps you understand your emotions, recognize patterns, and cultivate well-being
              through daily mood tracking and community support.
            </p>
            <div className="landing-stagger-item mt-10 flex items-center justify-center">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-brand-green-dark hover:shadow-xl"
              >
                Start Your Journey
                <ArrowRight size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2 text-text-tertiary">
            <span className="text-xs tracking-wider">Scroll to explore</span>
            <div className="h-8 w-5 rounded-full border-2 border-text-tertiary/40">
              <div className="mx-auto mt-1.5 h-2 w-1 animate-bounce rounded-full bg-text-tertiary/60" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="landing-reveal scroll-mt-20 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="font-serif text-3xl font-bold text-text-primary md:text-5xl">
              Why Emovo?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-text-secondary">
              Everything you need to build emotional awareness and grow.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-border-default bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-green/10">
                <Heart size={28} className="text-brand-green" strokeWidth={2} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-text-primary">Daily Mood Tracking</h3>
              <p className="leading-relaxed text-text-secondary">
                Log your mood with a simple 1&ndash;5 scale, add triggers, and write reflective
                notes. Build a picture of your emotional landscape.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-border-default bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-blue/10">
                <BarChart3 size={28} className="text-brand-blue" strokeWidth={2} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-text-primary">Insightful Analytics</h3>
              <p className="leading-relaxed text-text-secondary">
                Discover patterns in your emotions with beautiful charts. See trends over weeks,
                months, and years.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-border-default bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-green/10">
                <Users size={28} className="text-brand-green" strokeWidth={2} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-text-primary">Supportive Community</h3>
              <p className="leading-relaxed text-text-secondary">
                Share your journey with others who understand. Connect, support, and grow together
                in a safe space.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section id="how-it-works" className="landing-reveal scroll-mt-20 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2 className="font-serif text-3xl font-bold text-text-primary md:text-5xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-text-secondary">
              Three simple steps to a deeper understanding of yourself.
            </p>
          </div>

          <div className="relative grid gap-12 md:grid-cols-3 md:gap-8">
            {/* Connector lines (desktop only) */}
            <div className="pointer-events-none absolute left-0 right-0 top-8 hidden md:block">
              <div className="mx-auto flex max-w-[70%] items-center justify-between">
                <div className="h-px flex-1 bg-gradient-to-r from-brand-green/30 to-brand-green/10" />
                <div className="mx-4 h-px flex-1 bg-gradient-to-r from-brand-green/10 to-brand-green/30" />
              </div>
            </div>

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-2xl font-bold text-white shadow-md">
                1
              </div>
              <h3 className="mb-2 text-lg font-bold text-text-primary">Log Your Mood</h3>
              <p className="text-text-secondary">
                Take 30 seconds each day to check in with yourself.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-2xl font-bold text-white shadow-md">
                2
              </div>
              <h3 className="mb-2 text-lg font-bold text-text-primary">Discover Patterns</h3>
              <p className="text-text-secondary">
                Watch as insights emerge from your emotional data.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-2xl font-bold text-white shadow-md">
                3
              </div>
              <h3 className="mb-2 text-lg font-bold text-text-primary">Grow &amp; Thrive</h3>
              <p className="text-text-secondary">Use your understanding to build better habits.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA SECTION ===== */}
      <section className="landing-reveal px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-bold text-text-primary md:text-5xl">
            Start Your Journey Today
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-text-secondary">
            Free to use. Private by design. Your emotions, your data.
          </p>
          <a
            href="/register"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-brand-green px-10 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-brand-green-dark hover:shadow-xl"
          >
            Create Account
            <ArrowRight size={20} />
          </a>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border-light px-6 py-12">
        <div className="mx-auto max-w-5xl">
          {/* Top row: brand + links */}
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            {/* Left: Logo + tagline */}
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Emovo logo" width={32} height={32} className="h-8 w-8" />
              <div>
                <p className="font-serif text-xl font-bold text-brand-green">Emovo</p>
                <p className="text-sm text-text-tertiary">
                  Built with care for your emotional well-being.
                </p>
              </div>
            </div>

            {/* Right: Legal links */}
            <div className="flex items-center gap-6">
              <a
                href="/terms"
                className="text-sm text-text-tertiary transition-colors hover:text-brand-green"
              >
                Terms of Service
              </a>
              <a
                href="/privacy"
                className="text-sm text-text-tertiary transition-colors hover:text-brand-green"
              >
                Privacy Policy
              </a>
            </div>
          </div>

          {/* Bottom: Copyright */}
          <div className="mt-8 border-t border-border-light pt-6 text-center">
            <p className="text-xs text-text-tertiary">&copy; 2026 Emovo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
