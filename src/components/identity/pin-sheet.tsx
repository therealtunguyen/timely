'use client'

import { useState } from 'react'
import { motion, useAnimation } from 'motion/react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'

interface PinSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'setup' | 'verify'
  eventId: string
  participantName: string  // Name confirmed available by check-name (setup) or recognized as existing (verify)
  onSuccess: () => void
  onForgotPin: () => void
}

export function PinSheet({
  open,
  onOpenChange,
  mode,
  eventId,
  participantName,
  onSuccess,
  onForgotPin,
}: PinSheetProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgotPin, setShowForgotPin] = useState(false)  // Only shown after first failure
  const controls = useAnimation()

  async function triggerShake() {
    await controls.start({
      x: [0, -8, 8, -8, 8, -4, 4, 0],
      transition: { duration: 0.4, ease: 'easeInOut' },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) return

    setLoading(true)
    setError(null)

    try {
      if (mode === 'setup') {
        // Join: insert participant + session atomically with the name confirmed available by check-name
        const res = await fetch('/api/participants/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, name: participantName, pin }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.message ?? 'Something went wrong. Try again.')
          await triggerShake()
          setPin('')
          setLoading(false)
          return
        }

        onSuccess()
      } else {
        // Verify mode: check PIN for existing participant
        const res = await fetch('/api/participants/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, name: participantName, pin }),
        })

        if (res.status === 429) {
          setError('Too many attempts. Try again in 15 minutes or use a magic link.')
          setShowForgotPin(true)
          setPin('')
          setLoading(false)
          return
        }

        if (!res.ok) {
          setError('Incorrect PIN')
          setShowForgotPin(true)  // Show "Forgot PIN?" after first failure
          await triggerShake()
          setPin('')
          setLoading(false)
          return
        }

        onSuccess()
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Reset state when sheet closes/reopens
  function handleOpenChange(open: boolean) {
    if (!open) {
      setPin('')
      setError(null)
      setShowForgotPin(false)
    }
    onOpenChange(open)
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left px-6 pt-6">
          <DrawerTitle className="text-xl font-semibold text-[#1C1A17]">
            {mode === 'setup' ? 'Set a 4-digit PIN' : 'Enter your PIN'}
          </DrawerTitle>
          {mode === 'setup' && (
            <DrawerDescription className="text-[#6B6158] mt-1">
              You&apos;ll use this to edit later
            </DrawerDescription>
          )}
          {mode === 'verify' && (
            <DrawerDescription className="text-[#6B6158] mt-1">
              Welcome back! Enter your PIN to continue.
            </DrawerDescription>
          )}
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-8 mt-6 space-y-6">
          {/* OTP inputs — 4 separate boxes, digits visible (no masking) */}
          <div className="flex justify-center">
            <motion.div animate={controls}>
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={(value) => {
                  setPin(value)
                  setError(null)
                }}
                inputMode="numeric"
              >
                <InputOTPGroup className="gap-3">
                  <InputOTPSlot
                    index={0}
                    className="w-14 h-14 text-xl border-2 border-[#E5DDD4] rounded-xl text-center focus:border-[#E8823A] focus:ring-0"
                  />
                  <InputOTPSlot
                    index={1}
                    className="w-14 h-14 text-xl border-2 border-[#E5DDD4] rounded-xl text-center focus:border-[#E8823A] focus:ring-0"
                  />
                  <InputOTPSlot
                    index={2}
                    className="w-14 h-14 text-xl border-2 border-[#E5DDD4] rounded-xl text-center focus:border-[#E8823A] focus:ring-0"
                  />
                  <InputOTPSlot
                    index={3}
                    className="w-14 h-14 text-xl border-2 border-[#E5DDD4] rounded-xl text-center focus:border-[#E8823A] focus:ring-0"
                  />
                </InputOTPGroup>
              </InputOTP>
            </motion.div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {/* Forgot PIN — only visible after first failure */}
          {showForgotPin && (
            <p className="text-center text-sm">
              <button
                type="button"
                onClick={onForgotPin}
                className="text-[#E8823A] underline underline-offset-2"
              >
                Forgot PIN?
              </button>
            </p>
          )}

          <Button
            type="submit"
            disabled={pin.length !== 4 || loading}
            className="w-full bg-[#E8823A] hover:bg-[#D4722E] text-white"
          >
            {loading
              ? mode === 'setup' ? 'Setting PIN\u2026' : 'Verifying\u2026'
              : mode === 'setup' ? 'Set PIN' : 'Continue'}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
