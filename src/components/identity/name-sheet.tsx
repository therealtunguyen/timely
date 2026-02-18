'use client'

import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface NameSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  existingNames: string[]
  // 'new' — first-time visitor, name must be available
  // 'returning' — editing visitor, name must already exist
  flow: 'new' | 'returning'
  onNameClaimed: (name: string) => void  // 'new' flow: name available → PIN setup
  onNameExists: (name: string) => void   // 'returning' flow: name found → PIN verify
}

export function NameSheet({
  open,
  onOpenChange,
  eventId,
  existingNames,
  flow,
  onNameClaimed,
  onNameExists,
}: NameSheetProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/participants/check-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name: trimmed }),
      })

      if (!res.ok) {
        setError('Something went wrong. Try again.')
        setLoading(false)
        return
      }

      const data = await res.json()

      if (flow === 'new') {
        if (data.status === 'exists') {
          // Name is taken — guide them to use the returning flow instead
          setError("That name is already taken. If it's yours, close this and tap 'Edit my availability'.")
          setLoading(false)
          return
        }
        // Name is available — proceed to PIN setup
        onNameClaimed(trimmed)
      } else {
        // flow === 'returning'
        if (data.status === 'available') {
          // Name not found — they may have typed it wrong
          setError("We don't recognize that name on this event. Did you join under a different name?")
          setLoading(false)
          return
        }
        // Name found — proceed to PIN verify
        onNameExists(trimmed)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setName('')
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left px-6 pt-6">
          <DrawerTitle className="text-xl font-semibold text-[#1C1A17]">
            {flow === 'new' ? "What's your name?" : 'Enter your name to continue'}
          </DrawerTitle>
          {flow === 'new' && existingNames.length > 0 && (
            <DrawerDescription className="text-[#6B6158] mt-1">
              Already joined: {existingNames.join(', ')}
            </DrawerDescription>
          )}
          {flow === 'returning' && (
            <DrawerDescription className="text-[#6B6158] mt-1">
              Enter the name you used when you first joined.
            </DrawerDescription>
          )}
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              autoFocus
              autoComplete="name"
              className="text-base"
              aria-invalid={!!error}
              aria-describedby={error ? 'name-error' : undefined}
            />
            {error && (
              <p id="name-error" className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full bg-[#E8823A] hover:bg-[#D4722E] text-white"
          >
            {loading ? 'Checking…' : 'Continue'}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
