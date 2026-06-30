import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

function streamResponse(body: string, headers: Record<string, string> = {}, status = 201) {
  return new Response(body, {
    status,
    headers,
  })
}

describe('/api/workspaces/[id]/chat proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POST forwards bearer + last user message and passes stream headers through', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse('hello world', {
        'content-type': 'text/plain; charset=utf-8',
        'x-chat-sources': encodeURIComponent(
          JSON.stringify([{ documentId: 'doc-1', title: 'Doc One', sourceUrl: null, score: 0.8, snippet: 's' }]),
        ),
        'x-chat-session-id': 'session-1',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const request = new NextRequest('http://localhost:3000/api/workspaces/ws-1/chat', {
      method: 'POST',
      headers: {
        cookie: 'mnemra_at=test-access-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'First' },
          { role: 'assistant', content: 'Reply' },
          { role: 'user', content: 'Latest question' },
        ],
        sessionId: 'session-1',
      }),
    })

    const response = await POST(request, { params: { id: 'ws-1' } })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/workspaces/ws-1/chat', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-access-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Latest question', sessionId: 'session-1' }),
    })
    expect(response.status).toBe(201)
    expect(response.headers.get('x-chat-sources')).toBeDefined()
    expect(response.headers.get('x-chat-session-id')).toBe('session-1')
    await expect(response.text()).resolves.toBe('hello world')
  })

  it('missing cookie returns 401 and does not call backend', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const request = new NextRequest('http://localhost:3000/api/workspaces/ws-1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
    })

    const response = await POST(request, { params: { id: 'ws-1' } })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ message: 'Unauthorized' })
  })
})
