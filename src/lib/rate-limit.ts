import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// 10 event creation requests per minute per IP address.
// Uses sliding window algorithm — more accurate than fixed window for burst protection.
// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env automatically.
export const eventCreationRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'timely:event-creation',
})

// 5 failed PIN attempts per 15-min window, keyed on eventId:name
// Using slidingWindow (not fixedWindow) to prevent boundary bypass attacks
export const pinVerifyRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'timely:pin-verify',
})

// 3 magic link requests per 30-min window, keyed on eventId:name
// Prevents email spam abuse
export const magicLinkRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '30 m'),
  analytics: true,
  prefix: 'timely:magic-link',
})
