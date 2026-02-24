import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";

import { Providers } from "@/providers";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Emovo - Emotion Tracker",
  description: "Track your emotional well-being and discover patterns in your mood.",
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sourceSerif.variable} font-serif antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
