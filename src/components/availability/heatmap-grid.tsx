"use client";

import React from "react";
import { parseISO, format as formatDate } from "date-fns";
import { fromZonedTime, toZonedTime, format } from "date-fns-tz";
import { useHeatmapStore, ParticipantSlots } from "@/lib/stores/heatmap-store";
import {
  slotColor,
  getHeatmapLevel,
  getHeatmapTextColor,
} from "@/lib/heatmap-color";
import { cn } from "@/lib/utils";
import { Panel, PanelTitle } from "@/components/layout/panel";
import { Grid3X3 } from "lucide-react";

interface HeatmapGridProps {
  dates: string[]; // ISO date strings "YYYY-MM-DD"
  dayStart: number; // Hour 0-23
  dayEnd: number; // Hour 0-23
  timezone: string; // IANA tz for label rendering
  heatmapMap: Record<string, number>; // slotKey (UTC ISO) -> participant count
  peakCount: number; // Highest count across all slots (unused in new design)
  totalParticipants: number; // Total participant count
  participantSlots: Record<string, string[]>; // participantName -> UTC ISO slot keys
  ownSlots: string[]; // UTC ISO slot keys the current viewer has marked
  className?: string;
}

// Generate a UTC ISO string from a local date + time + timezone.
function generateSlotKey(
  date: string,
  hour: number,
  minute: number,
  tz: string,
): string {
  const localStr = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  return fromZonedTime(localStr, tz || "UTC").toISOString();
}

interface SlotRow {
  slotKey: string;
  label: string;
  hour: number;
  minute: number;
}

function buildSlotRows(
  dayStart: number,
  dayEnd: number,
  dates: string[],
  tz: string,
): SlotRow[] {
  const rows: SlotRow[] = [];
  for (let hour = dayStart; hour < dayEnd; hour++) {
    for (const minute of [0, 30]) {
      const firstDate = dates[0] ?? "2000-01-01";
      const slotKey = generateSlotKey(firstDate, hour, minute, tz);
      const label = format(
        toZonedTime(new Date(slotKey), tz || "UTC"),
        "h:mm a",
        { timeZone: tz || "UTC" },
      );
      rows.push({ slotKey, label, hour, minute });
    }
  }
  return rows;
}

export function HeatmapGrid({
  dates,
  dayStart,
  dayEnd,
  timezone,
  heatmapMap,
  totalParticipants,
  participantSlots,
  ownSlots,
  className,
}: HeatmapGridProps) {
  const tz = timezone || "UTC";

  // Convert participantSlots to Set-based map for O(1) lookups
  const participantSlotsMap: ParticipantSlots = Object.fromEntries(
    Object.entries(participantSlots).map(([name, slots]) => [
      name,
      new Set(slots),
    ]),
  );

  // Tap-a-name intersection state from store
  const { selectedNames, intersectionSlots } = useHeatmapStore();
  const hasSelection = selectedNames.size > 0;
  const intersected = hasSelection
    ? intersectionSlots(participantSlotsMap)
    : new Set<string>();

  // Own slots as a Set for O(1) lookup
  const ownSlotsSet = new Set(ownSlots);

  const slotRows = buildSlotRows(dayStart, dayEnd, dates, tz);

  return (
    <Panel as="section" className={className}>
      <div className="flex items-center justify-between mb-3">
        <PanelTitle icon={<Grid3X3 className="w-4 h-4" />}>
          Availability Heatmap
        </PanelTitle>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>Less</span>
          <div className="flex gap-0.5">
            {[0, 2, 4, 6, 7].map((level) => (
              <div
                key={level}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: slotColor(level, 7) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-default/40">
        <table
          className="w-full min-w-105 border-collapse"
          aria-label="Availability heatmap"
        >
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-subtle w-25 p-2.5 text-left text-xs font-semibold text-text-secondary border-b border-dashed border-border-default/30">
                Time
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className="p-2.5 text-center text-xs font-semibold text-text-primary border-b border-dashed border-border-default/30 bg-surface-subtle/50"
                >
                  <div>{formatDate(parseISO(date), "EEE")}</div>
                  <div className="text-text-secondary font-normal mt-0.5">
                    {formatDate(parseISO(date), "MMM d")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotRows.map(({ slotKey, label, hour, minute }) => (
              <tr key={slotKey}>
                {/* Time column */}
                <td className="sticky left-0 z-10 bg-page-bg p-2.5 text-left text-sm font-semibold text-text-primary border-b border-dashed border-border-default/30 w-25">
                  {label}
                </td>

                {/* Cells for each date */}
                {dates.map((date) => {
                  const cellKey = generateSlotKey(date, hour, minute, tz);
                  const count = Number(heatmapMap[cellKey] ?? 0);
                  const level = getHeatmapLevel(count, totalParticipants);
                  const bgColor = slotColor(count, totalParticipants);
                  const textColor = getHeatmapTextColor(level);
                  const dimmed = hasSelection && !intersected.has(cellKey);
                  const isOwn = ownSlotsSet.has(cellKey);

                  return (
                    <td
                      key={cellKey}
                      className="p-1.5 text-center border-b border-dashed border-border-default/30"
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                      }}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center justify-center min-w-12 px-2.5 py-2 rounded-md text-sm font-semibold transition-opacity relative",
                          dimmed && "opacity-20",
                        )}
                        role="gridcell"
                        aria-label={`${count} of ${totalParticipants} available at ${label} on ${formatDate(parseISO(date), "EEEE, MMMM d")}`}
                      >
                        {count}/{totalParticipants}
                        {/* Personal indicator for own slots */}
                        {isOwn && !dimmed && (
                          <div className="absolute inset-0.5 rounded border-2 border-white/50 pointer-events-none" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
