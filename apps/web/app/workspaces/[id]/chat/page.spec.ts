/** @vitest-environment jsdom */

import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@repo/ui'
import WorkspaceChatPage from './page'

const pushMock = vi.fn()
const routerMock = { push: pushMock }
const listChatSessionsMock = vi.fn()
const getChatMessagesMock = vi.fn()
const setMessagesMock = vi.fn()
let latestUseChatOptions: any = null

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/lib/api/chat', () => ({
  listChatSessions: (...args: unknown[]) => listChatSessionsMock(...args),
  getChatMessages: (...args: unknown[]) => getChatMessagesMock(...args),
}))

vi.mock('ai/react', async () => {
  const ReactModule = await import('react')

  return {
    useChat: (options: any) => {
      latestUseChatOptions = options
      const [messages, setMessagesState] = ReactModule.useState([
        { id: 'assistant-1', role: 'assistant', content: 'Grounded answer' },
      ])
      const firedRef = ReactModule.useRef(false)

      ReactModule.useEffect(() => {
        if (firedRef.current) {
          return
        }

        firedRef.current = true
        setMessagesMock.mockImplementation((value: any) => {
          if (typeof value === 'function') {
            setMessagesState((current) => value(current))
          } else {
            setMessagesState(value)
          }
        })

        void options.onResponse?.(
          new Response(null, {
            headers: {
              'X-Chat-Sources': encodeURIComponent(
                JSON.stringify([
                  {
                    documentId: 'doc-1',
                    title: 'Support SOP',
                    sourceUrl: 'https://example.com/sop',
                    score: 0.88,
                    snippet: 'Grounded excerpt',
                  },
                ]),
              ),
              'X-Chat-Session-Id': 'session-1',
            },
          }),
        )

        void options.onFinish?.({ id: 'assistant-1', role: 'assistant', content: 'Grounded answer' })
      }, [options])

      return {
        messages,
        setMessages: setMessagesMock,
        input: '',
        setInput: vi.fn(),
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: false,
        error: undefined,
        reload: vi.fn(),
        stop: vi.fn(),
      }
    },
  }
})

function renderPage() {
  return render(
    React.createElement(
      ToastProvider,
      undefined,
      React.createElement(WorkspaceChatPage, {
        params: { id: 'ws-1' },
      }),
    ),
  )
}

describe('WorkspaceChatPage', () => {
  beforeEach(() => {
    pushMock.mockReset()
    listChatSessionsMock.mockReset()
    getChatMessagesMock.mockReset()
    setMessagesMock.mockReset()
    latestUseChatOptions = null
    listChatSessionsMock.mockResolvedValue([{ id: 'session-1', title: 'Billing help', createdAt: '', updatedAt: '' }])
    getChatMessagesMock.mockResolvedValue([
      { id: 'user-1', role: 'user', content: 'Past question', createdAt: '' },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Grounded answer',
        createdAt: '',
        sources: [
          {
            documentId: 'doc-1',
            title: 'Support SOP',
            sourceUrl: 'https://example.com/sop',
            score: 0.88,
            snippet: 'Grounded excerpt',
          },
        ],
      },
    ])
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders sessions and sources from response header/persisted messages', async () => {
    renderPage()

    expect(await screen.findByText('Billing help')).toBeDefined()

    await waitFor(() => {
      expect(screen.getByText('Support SOP')).toBeDefined()
      expect(screen.getByText('Grounded excerpt')).toBeDefined()
    })
  })

  it('loads session history and new chat clears session body', async () => {
    renderPage()

    expect(await screen.findByText('Billing help')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Billing help' }))

    await waitFor(() => {
      expect(getChatMessagesMock).toHaveBeenCalledWith('ws-1', 'session-1')
    })

    expect(latestUseChatOptions.body).toEqual({ sessionId: 'session-1' })

    fireEvent.click(screen.getAllByRole('button', { name: 'New chat' })[0] as HTMLButtonElement)

    await waitFor(() => {
      expect(setMessagesMock).toHaveBeenCalled()
      expect(latestUseChatOptions.body).toBeUndefined()
    })
  })
})
