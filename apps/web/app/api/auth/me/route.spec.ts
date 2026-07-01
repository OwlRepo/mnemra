import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

function mockBackendResponse(status: number, body: unknown) {
  return {
    status,
    json: async () => body,
  } as unknown as Response
}

describe('/api/auth/me proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forwards bearer cookie to /auth/me and passes status/body through', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockBackendResponse(200, { userId: 'user-1', email: 'owner@example.com' }))
    vi.stubGlobal('fetch', fetchMock)

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: { cookie: 'mnemra_at=test-access-token' },
    })

    const response = await GET(request)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/auth/me', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-access-token',
      },
      body: undefined,
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ userId: 'user-1', email: 'owner@example.com' })
  })

  it('missing mnemra_at cookie returns 401 and does not call backend', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const request = new NextRequest('http://localhost:3000/api/auth/me')
    const response = await GET(request)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.status).toBe(401)
  })
})
