import type { Metadata } from "next";
import Link from "next/link";
import { AppNavigation } from "@/components/AppNavigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Reels Local MVP",
  description:
    "Локальний інструмент для підготовки AI Reels з ручного сюжету, сцен і фінального MP4.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-[var(--border)] bg-white">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/" className="max-w-sm">
                <span className="block text-lg font-semibold tracking-normal text-[var(--foreground)]">
                  AI Reels Local
                </span>
                <span className="mt-1 block text-sm leading-5 text-[var(--muted)]">
                  локальний workflow для vertical video
                </span>
              </Link>

              <AppNavigation />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
