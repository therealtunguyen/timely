import { Skeleton } from '@/components/ui/skeleton'

export function EventPageSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-12 space-y-6">
      {/* Event title */}
      <Skeleton className="h-8 w-3/4" />

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* Candidate dates section */}
      <div className="space-y-3 pt-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>

      {/* Time window */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* CTA button */}
      <Skeleton className="h-12 w-full rounded-lg mt-4" />
    </div>
  )
}
