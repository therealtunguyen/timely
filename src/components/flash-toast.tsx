'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'

// Reads any `timely_flash_toast_*` cookies set by Server Actions after redirect,
// fires a Sonner toast for each, then clears them.
// Mount this once in the root layout alongside <Toaster>.
// usePathname() ensures re-check on client-side navigation (Server Action redirects
// don't remount the root layout, so useEffect([]) alone would miss them).
export function FlashToast() {
  const pathname = usePathname()

  useEffect(() => {
    const allCookies = document.cookie.split(';')
    for (const cookie of allCookies) {
      const trimmed = cookie.trim()
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const name = trimmed.slice(0, eqIdx)
      const value = trimmed.slice(eqIdx + 1)
      if (name.startsWith('timely_flash_toast_')) {
        // Cookie value is stored raw (not encoded) — decode in case browser encoded it
        toast(decodeURIComponent(value))
        // Expire the cookie so it doesn't re-fire on refresh
        document.cookie = `${name}=; path=/; max-age=0`
      }
    }
  }, [pathname])

  return null
}
