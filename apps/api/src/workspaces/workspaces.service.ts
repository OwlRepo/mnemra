import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { db, invitations, workspaceMembers, workspaces } from '@repo/db'
import { NotificationsService } from '../notifications/notifications.service'

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

@Injectable()
export class WorkspacesService {
  constructor(
    private notifications: NotificationsService,
    private config: ConfigService,
  ) {}

  async create(userId: string, name: string) {
    return db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({ name, ownerId: userId })
        .returning()

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId,
        role: 'owner',
      })

      return workspace
    })
  }

  async listForUser(userId: string) {
    const rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))

    return rows
  }

  async getOne(workspaceId: string) {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1)

    if (!workspace) {
      throw new NotFoundException('Workspace not found')
    }

    return workspace
  }

  async invite(workspaceId: string, email: string): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(email)
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.insert(invitations).values({
      workspaceId,
      email: normalizedEmail,
      token,
      expiresAt,
    })

    const inviteUrl = `${this.config.get<string>('WEB_URL') ?? 'http://localhost:3000'}/invite/${token}`
    await this.notifications.sendInvite(normalizedEmail, inviteUrl)

    return { message: 'Invite sent' }
  }

  async acceptInvite(userId: string, userEmail: string, token: string) {
    const [invite] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1)

    if (!invite) {
      throw new NotFoundException('Invitation not found')
    }

    if (invite.acceptedAt) {
      throw new BadRequestException('Invitation already accepted')
    }

    if (invite.expiresAt <= new Date()) {
      throw new BadRequestException('Invitation expired')
    }

    if (this.normalizeEmail(invite.email) !== this.normalizeEmail(userEmail)) {
      throw new BadRequestException('Invitation email does not match logged-in user')
    }

    return db.transaction(async (tx) => {
      const [existingMember] = await tx
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, invite.workspaceId),
            eq(workspaceMembers.userId, userId),
          ),
        )
        .limit(1)

      if (!existingMember) {
        await tx.insert(workspaceMembers).values({
          workspaceId: invite.workspaceId,
          userId,
          role: 'member',
        })
      }

      await tx
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invite.id))

      return this.getWorkspaceOrThrow(tx, invite.workspaceId)
    })
  }

  async removeMember(workspaceId: string, targetUserId: string): Promise<{ message: string }> {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      )
      .limit(1)

    if (!member) {
      throw new NotFoundException('Workspace member not found')
    }

    if (member.role === 'owner') {
      const owners = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.role, 'owner'),
          ),
        )

      if (owners.length <= 1) {
        throw new ForbiddenException('Cannot remove the last owner')
      }
    }

    await db.delete(workspaceMembers).where(eq(workspaceMembers.id, member.id))

    return { message: 'Member removed' }
  }

  private async getWorkspaceOrThrow(client: typeof db | DbTx, workspaceId: string) {
    const [workspace] = await client
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1)

    if (!workspace) {
      throw new NotFoundException('Workspace not found')
    }

    return workspace
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }
}
