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

interface MagicLinkSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  participantName: string
  onSent: () => void
}

export function MagicLinkSheet({
  open,
  onOpenChange,
  eventId,
  participantName,
  onSent,
}: MagicLinkSheetProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/participants/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name: participantName, email: trimmed }),
      })

      if (res.status === 429) {
        setError('Too many requests. Try again in 30 minutes.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Something went wrong. Try again.')
        setLoading(false)
        return
      }

      // Success — sheet closes, user waits for email
      // API always returns 200 even if name not found (prevents enumeration)
      onSent()
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setEmail('')
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left px-6 pt-6">
          <DrawerTitle className="text-xl font-semibold text-[#1C1A17]">
            Get a magic link
          </DrawerTitle>
          <DrawerDescription className="text-[#6B6158] mt-1">
            Enter the email you used when joining. We&apos;ll send a link that lets you back in.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-8 mt-4 space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              autoFocus
              autoComplete="email"
              className="text-base"
              aria-invalid={!!error}
              aria-describedby={error ? 'magic-link-error' : undefined}
            />
            {error && (
              <p id="magic-link-error" className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!email.trim() || loading}
            className="w-full bg-[#E8823A] hover:bg-[#D4720E] text-white"
          >
            {loading ? 'Sending\u2026' : 'Send magic link'}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
