/** @vitest-environment jsdom */

import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@repo/ui'
import WorkspaceDetailPage from './page'

const pushMock = vi.fn()
const routerMock = { push: pushMock }
const getWorkspaceMock = vi.fn()
const listKnowledgeBasesMock = vi.fn()
const createKnowledgeBaseMock = vi.fn()
const deleteKnowledgeBaseMock = vi.fn()
const inviteMemberMock = vi.fn()
const listWorkspacesMock = vi.fn()
const listMembersMock = vi.fn()
const removeMemberMock = vi.fn()
const logoutMock = vi.fn()
const getCurrentUserMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/lib/api/workspaces', () => ({
  getWorkspace: (...args: unknown[]) => getWorkspaceMock(...args),
  inviteMember: (...args: unknown[]) => inviteMemberMock(...args),
  listWorkspaces: (...args: unknown[]) => listWorkspacesMock(...args),
  listMembers: (...args: unknown[]) => listMembersMock(...args),
  removeMember: (...args: unknown[]) => removeMemberMock(...args),
}))

vi.mock('@/lib/api/knowledge-bases', () => ({
  listKnowledgeBases: (...args: unknown[]) => listKnowledgeBasesMock(...args),
  createKnowledgeBase: (...args: unknown[]) => createKnowledgeBaseMock(...args),
  deleteKnowledgeBase: (...args: unknown[]) => deleteKnowledgeBaseMock(...args),
}))

vi.mock('@/lib/api/auth', () => ({
  logout: (...args: unknown[]) => logoutMock(...args),
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}))

function renderPage() {
  return render(
    React.createElement(
      ToastProvider,
      undefined,
      React.createElement(WorkspaceDetailPage, {
        params: { id: 'ws-1' },
      }),
    ),
  )
}

describe('WorkspaceDetailPage', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getWorkspaceMock.mockReset()
    listKnowledgeBasesMock.mockReset()
    createKnowledgeBaseMock.mockReset()
    deleteKnowledgeBaseMock.mockReset()
    inviteMemberMock.mockReset()
    listWorkspacesMock.mockReset()
    listMembersMock.mockReset()
    removeMemberMock.mockReset()
    logoutMock.mockReset()
    getCurrentUserMock.mockReset()

    listMembersMock.mockResolvedValue({ items: [], nextCursor: null })
    getCurrentUserMock.mockResolvedValue({ userId: 'unknown-user', email: 'unknown@example.com' })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('loads workspace details and creates a knowledge base from the modal', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listKnowledgeBasesMock
      .mockResolvedValueOnce({ items: [], nextCursor: null })
      .mockResolvedValueOnce({ items: [{ id: 'kb-1', name: 'Policies', workspaceId: 'ws-1' }], nextCursor: null })
    createKnowledgeBaseMock.mockResolvedValue({ id: 'kb-1', name: 'Policies', workspaceId: 'ws-1' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeDefined()
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'New knowledge base' })[0] as HTMLButtonElement)
    fireEvent.change(screen.getByLabelText('Knowledge base name'), {
      target: { value: 'Policies' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Create knowledge base' }).closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(createKnowledgeBaseMock).toHaveBeenCalledWith('ws-1', 'Policies')
      expect(screen.getByText('Policies')).toBeDefined()
    })
  })

  it('sends invites from the invite form', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listKnowledgeBasesMock.mockResolvedValue({ items: [], nextCursor: null })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'admin' }], nextCursor: null })
    inviteMemberMock.mockResolvedValue({ message: 'Invite sent' })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeDefined()
    })

    fireEvent.change(screen.getByLabelText('Member email'), {
      target: { value: 'teammate@example.com' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Send invite' }).closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(inviteMemberMock).toHaveBeenCalledWith('ws-1', 'teammate@example.com')
    })
  })

  it('deletes a knowledge base after confirmation', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listKnowledgeBasesMock
      .mockResolvedValueOnce({ items: [{ id: 'kb-1', name: 'Policies', workspaceId: 'ws-1' }], nextCursor: null })
      .mockResolvedValueOnce({ items: [], nextCursor: null })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })
    deleteKnowledgeBaseMock.mockResolvedValue({ message: 'Deleted' })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Policies')).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Policies' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete knowledge base' }))

    await waitFor(() => {
      expect(deleteKnowledgeBaseMock).toHaveBeenCalledWith('ws-1', 'kb-1')
    })
  })

  it('renders load more button and appends next knowledge-base page', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listKnowledgeBasesMock
      .mockResolvedValueOnce({
        items: [
          { id: 'kb-1', name: 'Policies', workspaceId: 'ws-1' },
          { id: 'kb-2', name: 'Runbooks', workspaceId: 'ws-1' },
        ],
        nextCursor: 'cursor-1',
      })
      .mockResolvedValueOnce({
        items: [{ id: 'kb-3', name: 'Playbooks', workspaceId: 'ws-1' }],
        nextCursor: null,
      })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })

    renderPage()

    expect(await screen.findByText('Policies')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Load more knowledge bases' }))

    await waitFor(() => {
      expect(listKnowledgeBasesMock).toHaveBeenNthCalledWith(2, 'ws-1', { cursor: 'cursor-1' })
      expect(screen.getByText('Playbooks')).toBeDefined()
    })
  })

  it('hides load more button when knowledge-base nextCursor is null', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listKnowledgeBasesMock.mockResolvedValue({
      items: [{ id: 'kb-1', name: 'Policies', workspaceId: 'ws-1' }],
      nextCursor: null,
    })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })

    renderPage()

    expect(await screen.findByText('Policies')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Load more knowledge bases' })).toBeNull()
  })

  it('logs out and redirects to login', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listKnowledgeBasesMock.mockResolvedValue({ items: [], nextCursor: null })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })
    logoutMock.mockResolvedValue(undefined)

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1)
      expect(pushMock).toHaveBeenCalledWith('/login')
    })
  })

  it('renders the fetched member roster with email, role, and joined date', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })
    listMembersMock.mockResolvedValue({
      items: [
        { id: 'mem-1', userId: 'user-owner', email: 'owner@example.com', role: 'owner', joinedAt: '2026-06-01T00:00:00.000Z' },
        { id: 'mem-2', userId: 'user-2', email: 'teammate@example.com', role: 'member', joinedAt: '2026-06-15T00:00:00.000Z' },
      ],
      nextCursor: null,
    })
    getCurrentUserMock.mockResolvedValue({ userId: 'user-owner', email: 'user-owner@example.com' })

    renderPage()

    expect(await screen.findByText('owner@example.com')).toBeDefined()
    expect(screen.getByText('teammate@example.com')).toBeDefined()
  })

  it('hides the remove control on the viewer own row, shows it on other rows, for an owner viewer', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })
    listMembersMock.mockResolvedValue({
      items: [
        { id: 'mem-1', userId: 'user-owner', email: 'owner@example.com', role: 'owner', joinedAt: '2026-06-01T00:00:00.000Z' },
        { id: 'mem-2', userId: 'user-2', email: 'teammate@example.com', role: 'member', joinedAt: '2026-06-15T00:00:00.000Z' },
      ],
      nextCursor: null,
    })
    getCurrentUserMock.mockResolvedValue({ userId: 'user-owner', email: 'user-owner@example.com' })

    renderPage()

    await screen.findByText('teammate@example.com')

    expect(screen.queryByRole('button', { name: 'Remove owner@example.com' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove teammate@example.com' })).toBeDefined()
  })

  it('hides remove controls entirely for a non-owner viewer', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'member' }], nextCursor: null })
    listMembersMock.mockResolvedValue({
      items: [
        { id: 'mem-1', userId: 'user-owner', email: 'owner@example.com', role: 'owner', joinedAt: '2026-06-01T00:00:00.000Z' },
        { id: 'mem-2', userId: 'user-2', email: 'teammate@example.com', role: 'member', joinedAt: '2026-06-15T00:00:00.000Z' },
      ],
      nextCursor: null,
    })
    getCurrentUserMock.mockResolvedValue({ userId: 'user-2', email: 'user-2@example.com' })

    renderPage()

    await screen.findByText('teammate@example.com')

    expect(screen.queryByRole('button', { name: 'Remove owner@example.com' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove teammate@example.com' })).toBeNull()
  })

  it('removes a member after confirming the modal', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })
    listMembersMock
      .mockResolvedValueOnce({
        items: [
          { id: 'mem-1', userId: 'user-owner', email: 'owner@example.com', role: 'owner', joinedAt: '2026-06-01T00:00:00.000Z' },
          { id: 'mem-2', userId: 'user-2', email: 'teammate@example.com', role: 'member', joinedAt: '2026-06-15T00:00:00.000Z' },
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        items: [
          { id: 'mem-1', userId: 'user-owner', email: 'owner@example.com', role: 'owner', joinedAt: '2026-06-01T00:00:00.000Z' },
        ],
        nextCursor: null,
      })
    getCurrentUserMock.mockResolvedValue({ userId: 'user-owner', email: 'user-owner@example.com' })
    removeMemberMock.mockResolvedValue({ message: 'Member removed' })

    renderPage()

    await screen.findByText('teammate@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Remove teammate@example.com' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove member' }))

    await waitFor(() => {
      expect(removeMemberMock).toHaveBeenCalledWith('ws-1', 'user-2')
      expect(screen.queryByText('teammate@example.com')).toBeNull()
    })
  })

  it('surfaces a last-owner removal failure as an error toast without crashing', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })
    listMembersMock.mockResolvedValue({
      items: [
        { id: 'mem-1', userId: 'user-owner', email: 'owner@example.com', role: 'owner', joinedAt: '2026-06-01T00:00:00.000Z' },
        { id: 'mem-2', userId: 'user-2', email: 'other-owner@example.com', role: 'owner', joinedAt: '2026-06-02T00:00:00.000Z' },
      ],
      nextCursor: null,
    })
    getCurrentUserMock.mockResolvedValue({ userId: 'user-owner', email: 'user-owner@example.com' })
    removeMemberMock.mockRejectedValue({ statusCode: 403, message: 'Cannot remove the last owner' })

    renderPage()

    await screen.findByText('other-owner@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Remove other-owner@example.com' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove member' }))

    await waitFor(() => {
      expect(screen.getByText('Cannot remove the last owner')).toBeDefined()
    })
    expect(screen.getByText('other-owner@example.com')).toBeDefined()
  })

  it('loads more members without duplicating existing rows', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })
    getCurrentUserMock.mockResolvedValue({ userId: 'user-owner', email: 'user-owner@example.com' })
    listMembersMock
      .mockResolvedValueOnce({
        items: [
          { id: 'mem-1', userId: 'user-owner', email: 'owner@example.com', role: 'owner', joinedAt: '2026-06-01T00:00:00.000Z' },
        ],
        nextCursor: 'members-cursor-1',
      })
      .mockResolvedValueOnce({
        items: [
          { id: 'mem-2', userId: 'user-2', email: 'teammate@example.com', role: 'member', joinedAt: '2026-06-15T00:00:00.000Z' },
        ],
        nextCursor: null,
      })

    renderPage()

    expect(await screen.findByText('owner@example.com')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Load more members' }))

    await waitFor(() => {
      expect(listMembersMock).toHaveBeenNthCalledWith(2, 'ws-1', { cursor: 'members-cursor-1' })
      expect(screen.getByText('teammate@example.com')).toBeDefined()
      expect(screen.getByText('owner@example.com')).toBeDefined()
    })
  })
})
