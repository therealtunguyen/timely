'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { NameSheet } from './name-sheet'
import { PinSheet } from './pin-sheet'
import { MagicLinkSheet } from './magic-link-sheet'

type ActiveSheet = 'none' | 'name' | 'pin-setup' | 'pin-verify' | 'magic-link'

interface JoinFlowProps {
  eventId: string
  // 'new' — opened via "Mark my availability" (first-time visitor)
  // 'returning' — opened via "Already joined? Edit my availability"
  // 'none' — closed, no sheet active
  flowMode: 'none' | 'new' | 'returning'
  existingNames: string[]
  onClose: () => void
}

export function JoinFlow({ eventId, flowMode, existingNames, onClose }: JoinFlowProps) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none')

  // State shared between sheets: name confirmed in NameSheet, carried to PinSheet
  const [claimedName, setClaimedName] = useState<string>('')

  // Open name sheet when parent activates a flow
  useEffect(() => {
    if (flowMode !== 'none') {
      setActiveSheet('name')
    }
  }, [flowMode])

  const handleClose = useCallback(() => {
    setActiveSheet('none')
    onClose()
  }, [onClose])

  // Called when check-name returns status:'available' in 'new' flow
  const handleNameClaimed = useCallback((name: string) => {
    setClaimedName(name)
    setActiveSheet('none')
    setTimeout(() => {
      toast('Name claimed — now set your PIN')
      setActiveSheet('pin-setup')
    }, 350)
  }, [])

  // Called when check-name returns status:'exists' in 'returning' flow
  const handleNameExists = useCallback((name: string) => {
    setClaimedName(name)
    setActiveSheet('none')
    setTimeout(() => {
      setActiveSheet('pin-verify')
    }, 350)
  }, [])

  const handlePinSet = useCallback(() => {
    setActiveSheet('none')
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
        onOpenChange={(open) => !open && handleClose()}
        eventId={eventId}
        existingNames={existingNames}
        flow={flowMode === 'returning' ? 'returning' : 'new'}
        onNameClaimed={handleNameClaimed}
        onNameExists={handleNameExists}
      />
      <PinSheet
        open={activeSheet === 'pin-setup' || activeSheet === 'pin-verify'}
        onOpenChange={(open) => !open && setActiveSheet('none')}
        mode={activeSheet === 'pin-setup' ? 'setup' : 'verify'}
        eventId={eventId}
        participantName={claimedName}
        onSuccess={activeSheet === 'pin-setup' ? handlePinSet : handlePinVerified}
        onForgotPin={handleForgotPin}
      />
      <MagicLinkSheet
        open={activeSheet === 'magic-link'}
        onOpenChange={(open) => !open && setActiveSheet('none')}
        eventId={eventId}
        participantName={claimedName}
        onSent={handleMagicLinkSent}
      />
    </>
  )
}
