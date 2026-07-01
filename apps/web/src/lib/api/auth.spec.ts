/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, logout } from './auth'
import { isLoggedIn, markLoggedIn } from '@/lib/auth'

describe('logout', () => {
  afterEach(() => {
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('clears the logged-in flag after a successful logout request', async () => {
    markLoggedIn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Logged out' }),
    }))

    await logout()

    expect(isLoggedIn()).toBe(false)
  })

  it('clears the logged-in flag even when logout request fails', async () => {
    markLoggedIn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'boom' }),
    }))

    await expect(logout()).rejects.toEqual({ message: 'boom' })
    expect(isLoggedIn()).toBe(false)
  })
})

describe('getCurrentUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the caller identity from /api/auth/me', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ userId: 'user-1', email: 'owner@example.com' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCurrentUser()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.any(Object))
    expect(result).toEqual({ userId: 'user-1', email: 'owner@example.com' })
  })
})
