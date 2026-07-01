/** @vitest-environment jsdom */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from '@repo/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './page'
import { clearLoggedIn, markLoggedIn } from '@/lib/auth'

const pushMock = vi.fn()
const routerMock = { push: pushMock }
const logoutMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/lib/api/auth', () => ({
  logout: (...args: unknown[]) => logoutMock(...args),
}))

function renderPage() {
  return render(React.createElement(ToastProvider, undefined, React.createElement(DashboardPage)))
}

describe('DashboardPage', () => {
  beforeEach(() => {
    pushMock.mockReset()
    logoutMock.mockReset()
    markLoggedIn()
  })

  afterEach(() => {
    cleanup()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows a navigation link to workspaces', () => {
    const source = readFileSync(join(process.cwd(), 'app/dashboard/page.tsx'), 'utf8')
    expect(source).toContain('<Link href="/workspaces">Workspaces</Link>')
  })

  it('includes ticket usefulness-rate observability copy', () => {
    const source = readFileSync(join(process.cwd(), 'app/dashboard/page.tsx'), 'utf8')
    expect(source).toContain('Ticket usefulness rate')
    expect(source).toContain('Ticket copilot review quality')
  })

  it('logs out and redirects to login', async () => {
    logoutMock.mockResolvedValue(undefined)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1)
      expect(pushMock).toHaveBeenCalledWith('/login')
    })

    pushMock.mockReset()
    clearLoggedIn()
    window.dispatchEvent(new Event('pageshow'))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login')
    })
  })
})
