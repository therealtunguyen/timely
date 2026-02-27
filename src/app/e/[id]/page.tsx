import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { format, addMinutes } from "date-fns";
import { getEventDashboardData } from "@/lib/event-data";
import { ParticipantActions } from "@/components/identity/participant-actions";
import { FloatingUserToolbar } from "@/components/availability/floating-user-toolbar";
import { HeatmapGrid } from "@/components/availability/heatmap-grid";
import { ParticipantList } from "@/components/availability/participant-list";
import { HeatmapResultsClient } from "@/components/availability/heatmap-results-client";
import { SuggestedTimes } from "@/components/availability/suggested-times";
import { DashboardContainer } from "@/components/layout/dashboard-container";
import { Panel, PanelTitle } from "@/components/layout/panel";
import { CalendarDays, Clock, Globe, Settings } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
  });

  if (!event) {
    return { title: "Event not found" };
  }

  const description =
    event.description ?? `Join ${event.title} — mark your availability`;

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
    },
  };
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const creatorCookieValue = cookieStore.get(`timely_creator_${id}`)?.value;

  const data = await getEventDashboardData(id, creatorCookieValue);
  if (!data) notFound();

  const {
    event,
    gridDates,
    heatmapMap,
    peakCount,
    topSlots,
    bestSlot,
    participantList,
    participantSlotsMap,
    totalParticipants,
    dateRangeStr,
    session,
    ownSlots,
    freeNames,
    hasSubmitted,
    isCreator,
    existingNames,
  } = data;

  return (
    <main className="py-6 md:py-8">
      <DashboardContainer>
        {/* Event header section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-default pb-6 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand text-sm font-medium uppercase tracking-wider">
              <CalendarDays className="w-4 h-4" />
              Event Dashboard
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-brand" />
                {dateRangeStr}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand" />
                {formatHour(event.dayStart)} – {formatHour(event.dayEnd)}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-brand" />
                {event.timezone}
              </span>
            </div>
            {event.description && (
              <p className="text-text-secondary text-sm leading-relaxed max-w-prose">
                {event.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {totalParticipants}
              </span>{" "}
              {totalParticipants === 1 ? "respondent" : "respondents"}
            </div>
            {isCreator && (
              <Link
                href={`/e/${id}/manage`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-surface-subtle hover:bg-border-default rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Manage
              </Link>
            )}
          </div>
        </header>

        {/* Confirmed time banner */}
        {event.status === "confirmed" && event.confirmedSlot && (
          <section className="rounded-xl bg-brand px-5 py-4 space-y-1 shadow-[var(--shadow-card)] mb-8">
            <p className="text-sm font-medium text-white/80">
              Meeting confirmed
            </p>
            <p className="text-xl font-semibold text-white">
              {format(event.confirmedSlot, "EEEE, MMMM d")}
            </p>
            <p className="text-base text-white/90">
              {format(event.confirmedSlot, "h:mm a")} –{" "}
              {format(addMinutes(event.confirmedSlot, 30), "h:mm a")}
            </p>
          </section>
        )}

        {/* 2-column dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: ~2/3 */}
          <div className="lg:col-span-8 space-y-5">
            {gridDates.length > 0 && (
              <HeatmapGrid
                dates={gridDates}
                dayStart={event.dayStart}
                dayEnd={event.dayEnd}
                timezone={event.timezone}
                heatmapMap={heatmapMap}
                peakCount={peakCount}
                totalParticipants={totalParticipants}
                participantSlots={participantSlotsMap}
                ownSlots={ownSlots}
              />
            )}
          </div>

          {/* Right: ~1/3 */}
          <aside className="lg:col-span-4 space-y-5">
            <HeatmapResultsClient
              bestSlot={bestSlot}
              totalParticipants={totalParticipants}
              isCreator={isCreator}
              eventId={id}
              freeNames={freeNames}
            />
            {topSlots.length > 0 && totalParticipants > 0 && (
              <SuggestedTimes
                slots={topSlots}
                totalParticipants={totalParticipants}
              />
            )}
            {participantList.length > 0 && (
              <ParticipantList
                participants={participantList}
                totalInvited={totalParticipants}
              />
            )}

            {/* CTA for unauthenticated users */}
            {event.status !== "confirmed" && !session && (
              <Panel>
                <PanelTitle className="mb-3">Join this event</PanelTitle>
                <p className="text-sm text-text-secondary mb-4">
                  Add your name to mark your availability and help find the best
                  time.
                </p>
                <ParticipantActions
                  eventId={id}
                  existingNames={existingNames}
                  responseCount={existingNames.length}
                />
              </Panel>
            )}
          </aside>
        </div>
      </DashboardContainer>

      {/* Floating toolbar for authenticated users — shown when event is not confirmed */}
      {event.status !== "confirmed" && session && (
        <FloatingUserToolbar
          participantName={session.participantName}
          hasSubmitted={hasSubmitted}
          eventId={id}
          dates={gridDates}
          dayStart={event.dayStart}
          dayEnd={event.dayEnd}
          dateMode={event.dateMode}
        />
      )}
    </main>
  );
}

// Helper: format an hour integer (0-23) as a human-readable string
function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}
