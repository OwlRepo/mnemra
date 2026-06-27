import { eq, inArray, sql } from 'drizzle-orm'
import { db, chunks as chunksTable } from '@repo/db'
import type { EmbeddedChunk } from '../embeddings/types'
import { embedQuery } from '../embeddings'

export interface SearchResult {
  id: string
  content: string
  metadata: Record<string, unknown>
  score: number
}

export async function syncChunks(
  embeddedChunks: EmbeddedChunk[],
  documentId: string,
  tenantId: string
): Promise<void> {
  const incoming = embeddedChunks.map(c => ({
    chunk: c,
    hash: c.contentHash,
  }))

  // load existing hashes for this document from DB
  const existing = await db
    .select({ id: chunksTable.id, contentHash: chunksTable.contentHash })
    .from(chunksTable)
    .where(eq(chunksTable.documentId, documentId))

  const existingHashSet = new Set(existing.map(r => r.contentHash))
  const incomingHashSet = new Set(incoming.map(r => r.hash))

  // delete chunks no longer in the document
  const toDelete = existing
    .filter(r => !incomingHashSet.has(r.contentHash))
    .map(r => r.id)

  if (toDelete.length > 0) {
    await db.delete(chunksTable).where(inArray(chunksTable.id, toDelete))
  }

  // insert only new chunks (skip unchanged ones)
  const toInsert = incoming.filter(r => !existingHashSet.has(r.hash))

  if (toInsert.length > 0) {
    await db.insert(chunksTable).values(
      toInsert.map(({ chunk }) => ({
        documentId,
        tenantId,
        content: chunk.content,
        contentHash: chunk.contentHash,
        embedding: chunk.embedding,
        metadata: chunk.metadata,
        sectionId: chunk.metadata.sectionId as string | undefined,
        sectionTitle: chunk.metadata.sectionTitle as string | undefined,
      }))
    )
  }
}

export async function similaritySearch(
  query: string,
  tenantId: string,
  limit = 5
): Promise<SearchResult[]> {
  const queryVector = await embedQuery(query)
  const vectorString = `[${queryVector.join(',')}]`

  const rows = await db.execute<{
    id: string
    content: string
    metadata: Record<string, unknown>
    score: number
  }>(sql`
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> ${vectorString}::vector) AS score
    FROM chunks
    WHERE tenant_id = ${tenantId}::uuid
    ORDER BY embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `)

  return rows.rows.map(row => ({
    id: row.id,
    content: row.content,
    metadata: row.metadata ?? {},
    score: row.score,
  }))
}
