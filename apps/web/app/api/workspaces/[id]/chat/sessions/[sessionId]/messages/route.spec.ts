import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

function mockBackendResponse(status: number, body: unknown) {
  return {
    status,
    json: async () => body,
  } as unknown as Response
}

describe('/api/workspaces/[id]/chat/sessions/[sessionId]/messages proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GET forwards bearer cookie and passes body/status through', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockBackendResponse(200, [{ id: 'msg-1', role: 'user', content: 'Hello' }]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const request = new NextRequest(
      'http://localhost:3000/api/workspaces/ws-1/chat/sessions/session-1/messages',
      {
        headers: { cookie: 'mnemra_at=test-access-token' },
      },
    )

    const response = await GET(request, { params: { id: 'ws-1', sessionId: 'session-1' } })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/workspaces/ws-1/chat/sessions/session-1/messages',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-access-token',
        },
        body: undefined,
      },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([{ id: 'msg-1', role: 'user', content: 'Hello' }])
  })
})
