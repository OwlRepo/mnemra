import { pgTable, uuid, text, varchar, jsonb, timestamp, customType } from 'drizzle-orm/pg-core'
import { documents } from './documents'
import { tenants } from './tenants'

// pgvector custom type
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value)
  },
})

export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  content: text('content').notNull(),
  contentHash: varchar('content_hash', { length: 64 }).notNull(),
  embedding: vector('embedding'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  sectionId: varchar('section_id', { length: 255 }),
  sectionTitle: text('section_title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Chunk = typeof chunks.$inferSelect
export type NewChunk = typeof chunks.$inferInsert
