"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Share2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface DashboardHeaderProps {
  /** Participant name from session — if provided, shows initials avatar */
  userName?: string | null;
}

/**
 * Branded topbar with logo, brand text, Help, Share, and optional user avatar.
 * Applied globally to all pages via root layout.
 * Extracts the event ID from the current URL to show the Share button on event pages.
 */
export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const pathname = usePathname();
  // Match /e/[id] or /e/[id]/anything
  const eventId = pathname.match(/^\/e\/([^/]+)/)?.[1] ?? null;

  const handleShare = () => {
    if (!eventId) return;
    const url = `${window.location.origin}/e/${eventId}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <header className="sticky top-0 z-50 bg-page-bg/95 backdrop-blur-sm border-b border-border-default/50">
      <div className="w-full mx-auto px-4 md:px-6 lg:px-20">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* Logo: gradient square with "T" */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-heading font-bold text-lg shadow-[var(--shadow-soft)]"
              style={{
                background:
                  "linear-gradient(180deg, var(--color-brand) 0%, var(--color-brand-hover) 100%)",
              }}
              aria-hidden="true"
            >
              T
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-semibold text-base text-text-primary group-hover:text-brand transition-colors">
                Timely
              </span>
              <span className="text-xs text-text-secondary hidden sm:block">
                Event scheduling
              </span>
            </div>
          </Link>

          {/* Right side: Help, Share, User avatar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-subtle rounded-lg transition-colors"
              aria-label="Help"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Help</span>
            </button>

            {eventId && (
              <>
                <div
                  className="h-6 w-px bg-border-default"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-cta hover:bg-cta-hover rounded-lg transition-colors"
                  aria-label="Share event link"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </>
            )}

            {userName && (
              <>
                <div
                  className="h-6 w-px bg-border-default"
                  aria-hidden="true"
                />
                <Avatar name={userName} size="md" />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
