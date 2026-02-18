import 'server-only'
import { createHash, randomBytes } from 'crypto'

/** 30 minutes in milliseconds */
const MAGIC_LINK_TTL_MS = 30 * 60 * 1000

export interface MagicTokenData {
  rawToken: string    // Sent in the email URL — never stored
  tokenHash: string   // SHA-256 of rawToken — stored in DB
  expiresAt: Date     // 30 min from now
}

export function generateMagicToken(): MagicTokenData {
  const rawToken = randomBytes(32).toString('hex')  // 64-char hex, 256-bit entropy
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS)
  return { rawToken, tokenHash, expiresAt }
}

export function buildMagicUrl(rawToken: string, eventId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${base}/api/participants/magic-link/consume?token=${rawToken}&eventId=${eventId}`
}

/** Hash a raw token from URL params for DB lookup */
export function hashTokenForLookup(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}
