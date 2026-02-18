import 'server-only'
import { hash, verify } from '@node-rs/argon2'

// OWASP 2025: memoryCost 65536 (64MB), timeCost 3, parallelism 1
const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
}

export async function hashPin(pin: string): Promise<string> {
  return hash(pin, ARGON2_OPTIONS)
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  return verify(storedHash, pin, ARGON2_OPTIONS)
}
