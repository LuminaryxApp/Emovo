import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-cream px-4">
      <h1 className="text-6xl font-bold text-brand-green">404</h1>
      <p className="mt-4 text-lg text-text-secondary">Page not found</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-brand-green px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-green-dark"
      >
        Go Home
      </Link>
    </div>
  );
}
