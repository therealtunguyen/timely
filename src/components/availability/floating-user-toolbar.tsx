"use client";

import { Edit3, CalendarPlus, Settings } from "lucide-react";
import { AvailabilityDrawer } from "./availability-drawer";

interface FloatingUserToolbarProps {
  participantName: string;
  hasSubmitted: boolean;
  eventId: string;
  dates: string[];
  dayStart: number;
  dayEnd: number;
  dateMode: "specific_dates" | "date_range";
}

export function FloatingUserToolbar({
  participantName,
  hasSubmitted,
  eventId,
  dates,
  dayStart,
  dayEnd,
  dateMode,
}: FloatingUserToolbarProps) {
  const Icon = hasSubmitted ? Edit3 : CalendarPlus;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-3.5 bg-surface rounded-4xl border border-border-default/40 shadow-[var(--shadow-card)] whitespace-nowrap">
      {/* Status */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-disabled">
          Your Status
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${hasSubmitted ? "bg-cta" : "bg-text-disabled"}`}
          />
          <span className="text-sm font-semibold text-text-primary">
            {hasSubmitted ? "Submitted" : "Not submitted"}
          </span>
        </div>
      </div>

      {/* Gear icon */}
      <button
        type="button"
        className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-subtle rounded-lg transition-colors shrink-0"
        aria-label={`${participantName}'s settings`}
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* CTA */}
      <AvailabilityDrawer
        eventId={eventId}
        dates={dates}
        dayStart={dayStart}
        dayEnd={dayEnd}
        dateMode={dateMode}
        trigger={
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-full transition-colors shrink-0"
            aria-label="Edit my availability"
          >
            <Icon className="w-4 h-4" />
            Edit My Availability
          </button>
        }
      />
    </div>
  );
}
