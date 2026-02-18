import { relations } from 'drizzle-orm'
import { sessions, participants, magicTokens } from './schema'

export const sessionsRelations = relations(sessions, ({ one }) => ({
  participant: one(participants, {
    fields: [sessions.participantId],
    references: [participants.id],
  }),
}))

export const participantsRelations = relations(participants, ({ many }) => ({
  sessions: many(sessions),
  magicTokens: many(magicTokens),
}))

export const magicTokensRelations = relations(magicTokens, ({ one }) => ({
  participant: one(participants, {
    fields: [magicTokens.participantId],
    references: [participants.id],
  }),
}))
