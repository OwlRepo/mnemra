/** @vitest-environment jsdom */

import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@repo/ui'
import WorkspaceOverviewPage from './page'

const pushMock = vi.fn()
const routerMock = { push: pushMock }
const getWorkspaceMock = vi.fn()
const listWorkspacesMock = vi.fn()
const logoutMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/workspaces/ws-1',
}))

vi.mock('@/lib/api/workspaces', () => ({
  getWorkspace: (...args: unknown[]) => getWorkspaceMock(...args),
  listWorkspaces: (...args: unknown[]) => listWorkspacesMock(...args),
}))

vi.mock('@/lib/api/auth', () => ({
  logout: (...args: unknown[]) => logoutMock(...args),
}))

function renderPage() {
  return render(
    React.createElement(
      ToastProvider,
      undefined,
      React.createElement(WorkspaceOverviewPage, {
        params: { id: 'ws-1' },
      }),
    ),
  )
}

describe('WorkspaceOverviewPage', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getWorkspaceMock.mockReset()
    listWorkspacesMock.mockReset()
    logoutMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    // no-op keeps test order explicit after previous mock cleanup
  })

  it('renders workspace name in top bar and membership badge', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })

    renderPage()

    expect((await screen.findAllByText('Alpha')).length).toBeGreaterThan(0)
    expect(screen.getByText('owner')).toBeDefined()
  })

  it('renders all 5 quick-link cards with correct hrefs', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'member' }], nextCursor: null })

    renderPage()

    const kbLink = await screen.findByRole('link', { name: 'Knowledge Bases' })
    expect(kbLink.getAttribute('href')).toBe('/workspaces/ws-1/knowledge-bases')
    expect(screen.getByRole('link', { name: 'Members' }).getAttribute('href')).toBe('/workspaces/ws-1/members')
    expect(screen.getByRole('link', { name: 'Chat' }).getAttribute('href')).toBe('/workspaces/ws-1/chat')
    expect(screen.getByRole('link', { name: 'Tickets' }).getAttribute('href')).toBe('/workspaces/ws-1/tickets')
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/workspaces/ws-1/settings')
  })

  it('redirects to login on unauthorized load error', async () => {
    getWorkspaceMock.mockRejectedValue({ statusCode: 401, message: 'Unauthorized' })
    listWorkspacesMock.mockResolvedValue({ items: [], nextCursor: null })

    renderPage()

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login')
    })
  })

  it('surfaces non-unauthorized load error as toast', async () => {
    getWorkspaceMock.mockRejectedValue(new Error('boom'))
    listWorkspacesMock.mockResolvedValue({ items: [], nextCursor: null })

    renderPage()

    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })
    listWorkspacesMock.mockResolvedValue({ items: [{ id: 'ws-1', role: 'owner' }], nextCursor: null })

    renderPage()

    expect((await screen.findAllByText('Alpha')).length).toBeGreaterThan(0)
    expect(screen.getByText('Failed to load workspace')).toBeDefined()
  })
})
