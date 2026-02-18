import { create } from 'zustand'

// Map of participantName -> Set<slotKey (UTC ISO string)>
// This type is passed as argument to intersectionSlots — not stored in Zustand
// (server-fetched data stays as props, not in the store)
export type ParticipantSlots = Record<string, Set<string>>

interface HeatmapStore {
  selectedNames: Set<string>
  toggleName: (name: string) => void
  clearNames: () => void
  // Returns the intersection of all selected participants' slot sets.
  // If no names selected, returns an empty Set (caller shows full heatmap).
  // participantSlots is passed as arg (not stored) — it comes from Server Component props.
  intersectionSlots: (participantSlots: ParticipantSlots) => Set<string>
}

export const useHeatmapStore = create<HeatmapStore>((set, get) => ({
  selectedNames: new Set(),
  toggleName: (name) => set((s) => {
    const next = new Set(s.selectedNames)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return { selectedNames: next }
  }),
  clearNames: () => set({ selectedNames: new Set() }),
  intersectionSlots: (participantSlots) => {
    const { selectedNames } = get()
    if (selectedNames.size === 0) return new Set()
    const names = [...selectedNames]
    const [first, ...rest] = names
    let result = new Set(participantSlots[first] ?? [])
    for (const name of rest) {
      const slots = participantSlots[name] ?? new Set<string>()
      result = new Set([...result].filter(s => slots.has(s)))
    }
    return result
  },
}))
