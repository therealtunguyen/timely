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
  onNameClaimed: (name: string) => void  // status:'available' — new user
  onNameExists: (name: string) => void   // status:'exists' — returning user
}

export function NameSheet({
  open,
  onOpenChange,
  eventId,
  existingNames,
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
      // check-name is read-only: validates availability without inserting anything.
      // Always returns 200 with {status:'available'} or {status:'exists'}.
      // The actual DB insert happens in PinSheet via POST /api/participants/join.
      const res = await fetch('/api/participants/check-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name: trimmed }),
      })

      if (!res.ok) {
        // Only non-200 responses are errors (e.g. 404 event not found, 422 validation, 500 server error)
        setError('Something went wrong. Try again.')
        setLoading(false)
        return
      }

      const data = await res.json()

      if (data.status === 'exists') {
        // Returning user — hand off to JoinFlow which will open PIN verify sheet
        // with "Welcome back! Enter your PIN to continue." messaging
        onNameExists(trimmed)
      } else {
        // status === 'available' — new user — hand off; PinSheet will call /api/participants/join
        onNameClaimed(trimmed)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left px-6 pt-6">
          <DrawerTitle className="text-xl font-semibold text-[#1C1A17]">
            What&apos;s your name?
          </DrawerTitle>
          {existingNames.length > 0 && (
            <DrawerDescription className="text-[#6B6158] mt-1">
              Already joined: {existingNames.join(', ')}
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
            {loading ? 'Checking\u2026' : 'Continue'}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
