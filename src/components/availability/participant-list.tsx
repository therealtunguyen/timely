"use client";

import { useHeatmapStore } from "@/lib/stores/heatmap-store";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Panel, PanelTitle } from "@/components/layout/panel";
import { Users } from "lucide-react";

interface Participant {
  name: string;
  submittedAt: Date | null;
  isCreator?: boolean;
}

interface ParticipantListProps {
  participants: Participant[];
  totalInvited?: number;
  className?: string;
}

type ParticipantStatus = "Organizer" | "Available" | "Viewed";

function getStatus(p: Participant): ParticipantStatus {
  if (p.isCreator) return "Organizer";
  if (p.submittedAt != null) return "Available";
  return "Viewed";
}

const statusStyles: Record<ParticipantStatus, string> = {
  Organizer: "text-brand font-medium",
  Available: "text-cta",
  Viewed: "text-text-disabled",
};

export function ParticipantList({
  participants,
  className,
}: ParticipantListProps) {
  const { selectedNames, toggleName } = useHeatmapStore();

  // Sort: creator first, then responded, then not-yet-responded.
  // Within each group: alphabetical by name.
  const sorted = [...participants].sort((a, b) => {
    // Creator first
    if (a.isCreator && !b.isCreator) return -1;
    if (!a.isCreator && b.isCreator) return 1;
    // Then by response status
    const aResponded = a.submittedAt != null ? 0 : 1;
    const bResponded = b.submittedAt != null ? 0 : 1;
    if (aResponded !== bResponded) return aResponded - bResponded;
    return a.name.localeCompare(b.name);
  });

  return (
    <Panel as="section" className={className}>
      <PanelTitle icon={<Users className="w-4 h-4" />}>Respondents</PanelTitle>

      <div className="flex flex-col gap-2.5">
        {sorted.map((p) => {
          const isSelected = selectedNames.has(p.name);
          const hasResponded = p.submittedAt != null;
          const status = getStatus(p);

          return (
            <button
              key={p.name}
              onClick={() => toggleName(p.name)}
              disabled={!hasResponded}
              className={cn(
                "flex items-center gap-3 p-2 -mx-2 rounded-lg transition-colors text-left",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                isSelected
                  ? "bg-brand-subtle"
                  : hasResponded
                    ? "hover:bg-surface-subtle"
                    : "opacity-60 cursor-default",
              )}
              aria-pressed={isSelected}
              aria-label={`${p.name} — ${status}${isSelected ? ", selected for filter" : ""}`}
            >
              <Avatar name={p.name} size="md" />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold text-text-primary truncate",
                    isSelected && "text-brand",
                  )}
                >
                  {p.name}
                </p>
                <p className={cn("text-xs", statusStyles[status])}>{status}</p>
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
