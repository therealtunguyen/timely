import type { Metadata } from "next";
import { Work_Sans, Outfit } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { FlashToast } from "@/components/flash-toast";
import { DashboardHeader } from "@/components/layout/dashboard-header";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Timely — Find a time that works for everyone",
    template: "%s | Timely",
  },
  description: "Share a link, mark your times, see the overlap.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${workSans.variable} ${outfit.variable}`}>
      <body className="antialiased flex flex-col min-h-dvh">
        <DashboardHeader />
        <div className="flex-1">{children}</div>
        <footer className="px-4 py-6 text-center border-t border-border-default">
          <Link
            href="/privacy"
            className="text-xs text-text-disabled hover:text-text-secondary underline underline-offset-2 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
          >
            Privacy
          </Link>
        </footer>
        <FlashToast />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
