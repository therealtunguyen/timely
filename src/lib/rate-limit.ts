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
