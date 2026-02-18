import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import * as relations from './relations'

// Module-level singleton — reused across serverless invocations in same process.
// Do NOT instantiate inside request handlers (creates new connection per request).
export const db = drizzle(process.env.DATABASE_URL!, { schema: { ...schema, ...relations } })
