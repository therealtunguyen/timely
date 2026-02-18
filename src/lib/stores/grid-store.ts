import { create } from 'zustand'

interface GridStore {
  selectedSlots: Set<string>       // UTC ISO strings e.g. "2026-03-15T14:00:00.000Z"
  savedSlots: Set<string>          // Last persisted state — for dirty checking
  timezone: string                 // IANA tz string e.g. "America/Chicago"
  isSaving: boolean
  setSelectedSlots: (slots: Set<string>) => void
  paintSlot: (slotKey: string, mode: 'add' | 'remove') => void
  setTimezone: (tz: string) => void  // MUST clear selectedSlots on timezone change
  setSaving: (saving: boolean) => void
  initFromSaved: (savedSlots: string[], tz: string) => void
  isDirty: () => boolean
  reset: () => void
}

export const useGridStore = create<GridStore>((set, get) => ({
  selectedSlots: new Set(),
  savedSlots: new Set(),
  timezone: '',
  isSaving: false,
  setSelectedSlots: (slots) => set({ selectedSlots: slots }),
  paintSlot: (slotKey, mode) => set((s) => {
    const next = new Set(s.selectedSlots)
    if (mode === 'add') next.add(slotKey)
    else next.delete(slotKey)
    return { selectedSlots: next }
  }),
  setTimezone: (tz) => set({ timezone: tz, selectedSlots: new Set() }), // CRITICAL: clears selection on tz change per locked decision
  setSaving: (isSaving) => set({ isSaving }),
  initFromSaved: (savedSlots, tz) => {
    const slotSet = new Set(savedSlots)
    set({ selectedSlots: slotSet, savedSlots: slotSet, timezone: tz })
  },
  isDirty: () => {
    const { selectedSlots, savedSlots } = get()
    if (selectedSlots.size !== savedSlots.size) return true
    for (const s of selectedSlots) if (!savedSlots.has(s)) return true
    return false
  },
  reset: () => set({ selectedSlots: new Set(), savedSlots: new Set(), timezone: '', isSaving: false }),
}))
