import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { ChatMessageSource } from './chatSessions'
import { vector } from './chunks'
import { workspaces } from './workspaces'

export const chatCache = pgTable('chat_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  version: integer('version').notNull(),
  question: text('question').notNull(),
  questionEmbedding: vector('question_embedding').notNull(),
  answer: text('answer').notNull(),
  sources: jsonb('sources').$type<ChatMessageSource[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type ChatCacheRow = typeof chatCache.$inferSelect
export type NewChatCacheRow = typeof chatCache.$inferInsert
