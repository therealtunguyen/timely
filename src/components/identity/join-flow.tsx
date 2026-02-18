'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { NameSheet } from './name-sheet'
import { PinSheet } from './pin-sheet'
import { MagicLinkSheet } from './magic-link-sheet'

type ActiveSheet = 'none' | 'name' | 'pin-setup' | 'pin-verify' | 'magic-link'

interface JoinFlowProps {
  eventId: string
  // Passed from server: if null, user has no session and must go through name+PIN flow
  // If provided, user has an active session — JoinFlow renders nothing (CTA handled by parent)
  sessionParticipantName: string | null
  // Names already claimed on this event (fetched server-side, passed down)
  existingNames: string[]
}

export function JoinFlow({ eventId, sessionParticipantName, existingNames }: JoinFlowProps) {
  // If the user has an active session, this component renders nothing —
  // the parent (event page) shows the personalized CTA
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(
    sessionParticipantName ? 'none' : 'name'
  )

  // State shared between sheets: name confirmed available in NameSheet, carried to PinSheet
  const [claimedName, setClaimedName] = useState<string>('')

  // Called when check-name returns status:'available' — new user, route to PIN setup
  const handleNameClaimed = useCallback((name: string) => {
    setClaimedName(name)
    setActiveSheet('none')  // Close name sheet first
    // Transition to PIN setup after name sheet animation completes.
    // 350ms matches the default vaul close animation duration.
    setTimeout(() => {
      toast('Name claimed — now set your PIN')
      setActiveSheet('pin-setup')
    }, 350)
  }, [])

  // Called when check-name returns status:'exists' — returning user, route to PIN verify
  const handleNameExists = useCallback((name: string) => {
    setClaimedName(name)
    setActiveSheet('none')  // Close name sheet first
    // Same animation delay pattern as handleNameClaimed — no toast for returning users
    setTimeout(() => {
      setActiveSheet('pin-verify')
    }, 350)
  }, [])

  const handlePinSet = useCallback(() => {
    setActiveSheet('none')
    // Trigger full page reload to show updated event page with session
    window.location.reload()
  }, [])

  const handlePinVerified = useCallback(() => {
    setActiveSheet('none')
    window.location.reload()
  }, [])

  const handleForgotPin = useCallback(() => {
    setActiveSheet('magic-link')
  }, [])

  const handleMagicLinkSent = useCallback(() => {
    setActiveSheet('none')
    toast('Check your email — a link is on its way')
  }, [])

  return (
    <>
      <NameSheet
        open={activeSheet === 'name'}
        onOpenChange={(open: boolean) => !open && setActiveSheet('none')}
        eventId={eventId}
        existingNames={existingNames}
        onNameClaimed={handleNameClaimed}
        onNameExists={handleNameExists}
      />
      <PinSheet
        open={activeSheet === 'pin-setup' || activeSheet === 'pin-verify'}
        onOpenChange={(open: boolean) => !open && setActiveSheet('none')}
        mode={activeSheet === 'pin-setup' ? 'setup' : 'verify'}
        eventId={eventId}
        participantName={claimedName}
        onSuccess={activeSheet === 'pin-setup' ? handlePinSet : handlePinVerified}
        onForgotPin={handleForgotPin}
      />
      <MagicLinkSheet
        open={activeSheet === 'magic-link'}
        onOpenChange={(open: boolean) => !open && setActiveSheet('none')}
        eventId={eventId}
        participantName={claimedName}
        onSent={handleMagicLinkSent}
      />
    </>
  )
}
