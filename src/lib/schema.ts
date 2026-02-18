import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Enums
export const dateModeEnum = pgEnum('date_mode', ['specific_dates', 'date_range'])
export const eventStatusEnum = pgEnum('event_status', ['open', 'closed', 'confirmed'])

// Events table — core record for each scheduling event
export const events = pgTable('events', {
  id: text('id').primaryKey(),                           // nanoid(10) — set in application code, never auto-increment
  title: text('title').notNull(),
  description: text('description'),
  dateMode: dateModeEnum('date_mode').notNull(),
  rangeStart: timestamp('range_start', { withTimezone: true }),   // UTC — used when dateMode='date_range'
  rangeEnd: timestamp('range_end', { withTimezone: true }),       // UTC — used when dateMode='date_range'
  dayStart: integer('day_start').notNull().default(9),            // Hour of day (0-23), UTC
  dayEnd: integer('day_end').notNull().default(21),               // Hour of day (0-23), UTC
  timezone: text('timezone').notNull(),                           // IANA tz string e.g. "America/New_York"
  status: eventStatusEnum('status').notNull().default('open'),
  confirmedSlot: timestamp('confirmed_slot', { withTimezone: true }),  // UTC — set when creator confirms
  creatorToken: text('creator_token'),                                 // Nullable — set at creation; NULL for pre-Phase-4 events
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

// Specific dates for events with dateMode='specific_dates'
export const eventDates = pgTable('event_dates', {
  id: text('id').primaryKey(),                           // nanoid(10)
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),                          // ISO date string "YYYY-MM-DD"
  sortOrder: integer('sort_order').notNull(),
})

// Participants — one row per person joining an event
export const participants = pgTable('participants', {
  id: text('id').primaryKey(),                           // nanoid(10)
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pinHash: text('pin_hash').notNull(),                   // Argon2id hash — never plaintext
  email: text('email'),                                  // Nullable — purged after magic link expiry
  timezone: text('timezone'),                            // IANA tz — participant's display timezone
  submittedAt: timestamp('submitted_at', { withTimezone: true }),  // UTC — when they last saved availability
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('participants_event_name_idx').on(table.eventId, table.name),  // Enforce unique name per event
])

// Availability slots — one row per selected 30-min slot per participant
export const availability = pgTable('availability', {
  id: text('id').primaryKey(),                           // nanoid(10)
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  slotStart: timestamp('slot_start', { withTimezone: true }).notNull(),  // UTC — e.g. 2026-03-15T14:00:00Z
  isAvailable: boolean('is_available').notNull().default(true),
}, (table) => [
  uniqueIndex('availability_participant_slot_idx').on(table.participantId, table.slotStart),
  index('availability_event_slot_idx').on(table.eventId, table.slotStart),  // For GROUP BY heatmap queries
])

// Sessions — DB-backed opaque tokens (not JWTs — cannot be revoked)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),                           // nanoid(10)
  token: text('token').notNull().unique(),               // 32-byte random hex — value stored in httpOnly cookie
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),  // UTC — 7 days after creation
})

// Magic tokens — one-time use links for PIN recovery
export const magicTokens = pgTable('magic_tokens', {
  id: text('id').primaryKey(),                           // nanoid(10)
  tokenHash: text('token_hash').notNull().unique(),      // SHA-256 of raw token — raw token sent in email only
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),  // UTC — 30 min after creation
  usedAt: timestamp('used_at', { withTimezone: true }),  // UTC — set when consumed; null = still valid
})
