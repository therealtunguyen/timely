'use client'

import { useEffect, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useGridStore } from '@/lib/stores/grid-store'
import { AvailabilityGrid } from './availability-grid'
import { TimezoneSelector } from './timezone-selector'

interface AvailabilityDrawerProps {
  trigger: React.ReactNode      // The CTA button rendered as the drawer trigger
  eventId: string
  dates: string[]               // ISO date strings for grid columns
  dayStart: number
  dayEnd: number
  dateMode: 'specific_dates' | 'date_range'
}

export function AvailabilityDrawer({
  trigger,
  eventId,
  dates,
  dayStart,
  dayEnd,
}: AvailabilityDrawerProps) {
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<'bottom' | 'right'>('bottom')
  const saveInProgress = useRef(false)  // Guard against vaul onOpenChange double-fire (known vaul issue #345)

  const initFromSaved = useGridStore(s => s.initFromSaved)
  const reset = useGridStore(s => s.reset)
  const setSaving = useGridStore(s => s.setSaving)

  // Derived dirty state — reactive (avoids stale closure from isDirty())
  const selectedSlots = useGridStore(s => s.selectedSlots)
  const savedSlots = useGridStore(s => s.savedSlots)
  const isSaving = useGridStore(s => s.isSaving)
  const dirty = selectedSlots.size !== savedSlots.size ||
    [...selectedSlots].some(s => !savedSlots.has(s))

  // Desktop detection on mount
  useEffect(() => {
    setDirection(window.innerWidth >= 768 ? 'right' : 'bottom')
  }, [])

  // Timezone auto-detect on open
  useEffect(() => {
    if (!open) return
    // Auto-detect runs silently — locked decision: hidden by default
    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    // Only set if timezone is not already set (don't override manual correction)
    if (!useGridStore.getState().timezone) {
      useGridStore.getState().setTimezone(detectedTz)
      // Note: setTimezone also clears selectedSlots — that's fine on first open before load
    }
  }, [open])

  // Load existing slots on open
  useEffect(() => {
    if (!open) return
    const tz = useGridStore.getState().timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

    fetch('/api/availability')
      .then(r => r.json())
      .then((data: { slots: string[] }) => {
        initFromSaved(data.slots, tz)
        if (data.slots.length > 0) {
          toast('Loaded your previous availability', { icon: '✓' })
        }
      })
      .catch(() => {
        // Silently ignore load errors — user starts with empty grid
      })
  }, [open, initFromSaved])

  // Save function — returns boolean (true on success, false on failure)
  async function saveAvailability(): Promise<boolean> {
    if (saveInProgress.current) return false  // Guard against double-fire
    saveInProgress.current = true
    setSaving(true)
    try {
      const slots = Array.from(useGridStore.getState().selectedSlots)
      const tz = useGridStore.getState().timezone
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots, timezone: tz, eventId }),
      })
      if (!res.ok) throw new Error('Save failed')
      // Update savedSlots in store so isDirty() resets to false
      useGridStore.setState({
        savedSlots: new Set(useGridStore.getState().selectedSlots)
      })
      return true
    } catch {
      toast.error('Failed to save. Try again.')
      return false
    } finally {
      setSaving(false)
      saveInProgress.current = false
    }
  }

  // Explicit save handler — button click, stays in drawer, only toasts on success
  async function handleExplicitSave() {
    const ok = await saveAvailability()
    if (ok) toast.success('Availability saved')
    // DO NOT close drawer — locked decision says stay in grid
  }

  // onOpenChange handler — auto-save on close + store reset
  async function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      // Auto-save if dirty — locked decision
      if (dirty) {
        await saveAvailability()
      }
      reset()  // CRITICAL: reset store on close to prevent stale state on re-open
    }
    setOpen(isOpen)
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={handleOpenChange}
      snapPoints={[1]}
      direction={direction}
      dismissible={true}
      scrollLockTimeout={300}
    >
      <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed inset-0 flex flex-col bg-[#FAF8F5] md:left-auto md:right-0 md:inset-y-0 md:w-[480px]">
          {/* Drag handle pill — auto-renders for direction=bottom, render manually for right */}
          {direction === 'bottom' && (
            <div className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-[#D4C9BD]" />
          )}

          {/* Header: close button only — locked decision: no title */}
          <div className="flex items-center justify-between px-4 py-3">
            <Drawer.Close asChild>
              <button className="p-2 rounded-lg hover:bg-[#E5DDD4] transition-colors" aria-label="Close">
                <X className="h-5 w-5 text-[#6B6158]" />
              </button>
            </Drawer.Close>
            {/* Timezone selector — right side of header, muted */}
            <TimezoneSelector />
          </div>

          {/* Grid — fills remaining space, scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-auto px-2">
            <AvailabilityGrid
              dates={dates}
              dayStart={dayStart}
              dayEnd={dayEnd}
            />
          </div>

          {/* Footer: Save button */}
          <div className="px-4 py-4 border-t border-[#E5DDD4]">
            <button
              onClick={handleExplicitSave}
              disabled={!dirty || isSaving}
              className="w-full bg-[#E8823A] hover:bg-[#D4722E] disabled:bg-[#E5DDD4] disabled:text-[#9D9086] text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save availability'}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
