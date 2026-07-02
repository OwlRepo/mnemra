/** @vitest-environment jsdom */

import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@repo/ui'
import SettingsPage from './page'

const pushMock = vi.fn()
const routerMock = { push: pushMock }
const getWorkspaceMock = vi.fn()
const logoutMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/workspaces/ws-1/settings',
}))

vi.mock('@/lib/api/workspaces', () => ({
  getWorkspace: (...args: unknown[]) => getWorkspaceMock(...args),
}))

vi.mock('@/lib/api/auth', () => ({
  logout: (...args: unknown[]) => logoutMock(...args),
}))

function renderPage() {
  return render(
    React.createElement(
      ToastProvider,
      undefined,
      React.createElement(SettingsPage, {
        params: { id: 'ws-1' },
      }),
    ),
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getWorkspaceMock.mockReset()
    logoutMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders workspace name and id', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })

    renderPage()

    expect((await screen.findAllByText('Alpha')).length).toBeGreaterThan(0)
    expect(screen.getByText('Workspace ID: ws-1')).toBeDefined()
  })

  it('renders coming soon empty state', async () => {
    getWorkspaceMock.mockResolvedValue({ id: 'ws-1', name: 'Alpha' })

    renderPage()

    expect(await screen.findByText('More settings coming soon')).toBeDefined()
  })

  it('redirects to login on unauthorized load error', async () => {
    getWorkspaceMock.mockRejectedValue({ statusCode: 401, message: 'Unauthorized' })

    renderPage()

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login')
    })
  })
})
