import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, count, eq } from 'drizzle-orm'
import { db, documents, knowledgeBases } from '@repo/db'

@Injectable()
export class KnowledgeBasesService {
  async create(workspaceId: string, name: string) {
    const [knowledgeBase] = await db
      .insert(knowledgeBases)
      .values({ workspaceId, name })
      .returning()

    return knowledgeBase
  }

  async listForWorkspace(workspaceId: string) {
    return db
      .select()
      .from(knowledgeBases)
      .where(eq(knowledgeBases.workspaceId, workspaceId))
  }

  async remove(workspaceId: string, kbId: string): Promise<{ message: string }> {
    const [knowledgeBase] = await db
      .select()
      .from(knowledgeBases)
      .where(eq(knowledgeBases.id, kbId))
      .limit(1)

    if (!knowledgeBase || knowledgeBase.workspaceId !== workspaceId) {
      throw new NotFoundException('Knowledge base not found')
    }

    const [docCount] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.knowledgeBaseId, kbId))

    if (docCount.count > 0) {
      throw new ConflictException('Knowledge base is not empty')
    }

    await db
      .delete(knowledgeBases)
      .where(and(eq(knowledgeBases.id, kbId), eq(knowledgeBases.workspaceId, workspaceId)))

    return { message: 'Knowledge base deleted' }
  }
}
