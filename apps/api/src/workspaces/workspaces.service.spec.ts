import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { and, eq, like } from 'drizzle-orm'
import { db, invitations, pool, users, workspaceMembers, workspaces } from '@repo/db'
import { NotificationsService } from '../notifications/notifications.service'
import { WorkspacesService } from './workspaces.service'

async function cleanupWorkspaceFixtures(emailPrefix: string) {
  const testUsers = await db.select({ id: users.id }).from(users).where(like(users.email, `${emailPrefix}%`))

  for (const user of testUsers) {
    const memberRows = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id))

    for (const row of memberRows) {
      await db.delete(invitations).where(eq(invitations.workspaceId, row.workspaceId))
    }

    await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, user.id))
  }

  const owned = await db.select({ id: workspaces.id }).from(workspaces).where(like(workspaces.name, 'Spec WS %'))
  for (const workspace of owned) {
    await db.delete(invitations).where(eq(invitations.workspaceId, workspace.id))
    await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id))
    await db.delete(workspaces).where(eq(workspaces.id, workspace.id))
  }

  await db.delete(users).where(like(users.email, `${emailPrefix}%`))
}

describe('WorkspacesService', () => {
  let service: WorkspacesService
  let notifications: { sendInvite: jest.Mock }

  beforeAll(async () => {
    notifications = { sendInvite: jest.fn().mockResolvedValue(undefined) }

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        WorkspacesService,
        { provide: NotificationsService, useValue: notifications },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile()

    service = moduleRef.get(WorkspacesService)
  })

  afterAll(async () => {
    await cleanupWorkspaceFixtures('workspaces-spec-')
    await pool.end()
  })

  it('create inserts a workspace and owner membership', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: `workspaces-spec-create-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()

    const workspace = await service.create(user.id, 'Spec WS Create')
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, user.id)))
      .limit(1)

    expect(workspace.name).toBe('Spec WS Create')
    expect(membership.role).toBe('owner')
  })

  it('listForUser returns only workspaces the user belongs to, with role', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: `workspaces-spec-list-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()
    const [other] = await db
      .insert(users)
      .values({ email: `workspaces-spec-list-other-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()

    const mine = await service.create(user.id, 'Spec WS Mine')
    const hidden = await service.create(other.id, 'Spec WS Hidden')

    const list = await service.listForUser(user.id)

    expect(list.map((w: any) => w.id)).toContain(mine.id)
    expect(list.map((w: any) => w.id)).not.toContain(hidden.id)
    expect(list.find((w: any) => w.id === mine.id)?.role).toBe('owner')
  })

  it('invite inserts an invitation and calls notifications.sendInvite', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: `workspaces-spec-invite-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()
    const workspace = await service.create(user.id, 'Spec WS Invite')

    const result = await service.invite(workspace.id, 'invitee@example.com')
    const [invite] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.workspaceId, workspace.id), eq(invitations.email, 'invitee@example.com')))
      .limit(1)

    expect(result.message).toMatch(/invite/i)
    expect(invite.token).toBeDefined()
    expect(notifications.sendInvite).toHaveBeenCalled()
  })

  it('acceptInvite adds member and marks invitation accepted', async () => {
    const [owner] = await db
      .insert(users)
      .values({ email: `workspaces-spec-accept-owner-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()
    const [invitee] = await db
      .insert(users)
      .values({ email: `workspaces-spec-accept-user-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()
    const workspace = await service.create(owner.id, 'Spec WS Accept')
    await service.invite(workspace.id, invitee.email)
    const [invite] = await db.select().from(invitations).where(eq(invitations.email, invitee.email)).limit(1)

    const joined = await service.acceptInvite(invitee.id, invitee.email, invite.token)
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, invitee.id)))
      .limit(1)
    const [updatedInvite] = await db.select().from(invitations).where(eq(invitations.id, invite.id)).limit(1)

    expect(joined.id).toBe(workspace.id)
    expect(membership.role).toBe('member')
    expect(updatedInvite.acceptedAt).toBeTruthy()
  })

  it('acceptInvite rejects expired, already accepted, and unknown tokens', async () => {
    const [owner] = await db
      .insert(users)
      .values({ email: `workspaces-spec-reject-owner-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()
    const [invitee] = await db
      .insert(users)
      .values({ email: `workspaces-spec-reject-user-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()
    const workspace = await service.create(owner.id, 'Spec WS Reject')
    await service.invite(workspace.id, invitee.email)
    const [invite] = await db.select().from(invitations).where(eq(invitations.email, invitee.email)).limit(1)

    await db.update(invitations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(invitations.id, invite.id))
    await expect(service.acceptInvite(invitee.id, invitee.email, invite.token)).rejects.toThrow(BadRequestException)

    await db
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), acceptedAt: new Date() })
      .where(eq(invitations.id, invite.id))
    await expect(service.acceptInvite(invitee.id, invitee.email, invite.token)).rejects.toThrow(BadRequestException)

    await expect(service.acceptInvite(invitee.id, invitee.email, 'missing-token')).rejects.toThrow(NotFoundException)
  })

  it('removeMember deletes a non-owner member', async () => {
    const [owner] = await db
      .insert(users)
      .values({ email: `workspaces-spec-remove-owner-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()
    const [member] = await db
      .insert(users)
      .values({ email: `workspaces-spec-remove-member-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()
    const workspace = await service.create(owner.id, 'Spec WS Remove')
    await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: member.id, role: 'member' })

    await expect(service.removeMember(workspace.id, member.id)).resolves.toEqual({ message: 'Member removed' })

    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, member.id)))
      .limit(1)
    expect(membership).toBeUndefined()
  })

  it('blocks removing the last owner', async () => {
    const [owner] = await db
      .insert(users)
      .values({ email: `workspaces-spec-last-owner-${Date.now()}@example.com`, passwordHash: 'x', isVerified: true })
      .returning()
    const workspace = await service.create(owner.id, 'Spec WS Last Owner')

    await expect(service.removeMember(workspace.id, owner.id)).rejects.toThrow(ForbiddenException)
  })
})
