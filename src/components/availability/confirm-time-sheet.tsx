'use client'

import { useState } from 'react'
import { Drawer } from 'vaul'
import { format, addMinutes } from 'date-fns'
import { toast } from 'sonner'
import { confirmTime } from '@/lib/actions/confirm-time'

interface ConfirmTimeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  slotStart: string | null    // UTC ISO string — the slot to confirm
  slotCount: number           // How many people are free at this slot
  totalParticipants: number
  freeNames: string[]         // Names of participants free at this slot (for display)
}

export function ConfirmTimeSheet({
  open,
  onOpenChange,
  eventId,
  slotStart,
  slotCount,
  totalParticipants,
  freeNames,
}: ConfirmTimeSheetProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  // Format slot for display (only computed when slotStart is defined)
  const dateStr = slotStart ? format(new Date(slotStart), 'EEEE, MMMM d') : ''
  const timeRangeStr = slotStart
    ? `${format(new Date(slotStart), 'h:mm a')} \u2013 ${format(addMinutes(new Date(slotStart), 30), 'h:mm a')}`
    : ''

  async function handleConfirm() {
    if (!slotStart) return
    setIsConfirming(true)
    const result = await confirmTime(eventId, slotStart)
    setIsConfirming(false)
    if (result.success) {
      onOpenChange(false)
      // revalidatePath in the Server Action will refresh the page data
    } else {
      toast.error(result.error ?? 'Failed to confirm. Try again.')
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="bottom">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-page-bg p-6 space-y-5">
          {/* Drag handle */}
          <div className="mx-auto -mt-2 mb-2 h-1.5 w-12 rounded-full bg-border-strong" />

          <Drawer.Title className="text-xl font-semibold text-text-primary">
            Confirm this time?
          </Drawer.Title>

          {/* Slot details */}
          <div className="rounded-xl border border-border-default bg-surface px-4 py-4 space-y-1">
            <p className="text-lg font-medium text-text-primary">{dateStr}</p>
            <p className="text-base text-text-secondary">{timeRangeStr}</p>
            <p className="text-sm text-brand font-medium mt-2">
              {slotCount} of {totalParticipants} people free
            </p>
          </div>

          {/* Free participant names */}
          {freeNames.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-text-disabled uppercase tracking-wide">
                Free at this time
              </p>
              <p className="text-sm text-text-secondary">{freeNames.join(', ')}</p>
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full bg-brand hover:bg-brand-hover disabled:bg-border-default disabled:text-text-disabled text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {isConfirming ? 'Confirming...' : 'Confirm this time'}
          </button>

          {/* Cancel */}
          <button
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-sm text-text-disabled py-1"
          >
            Cancel
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
