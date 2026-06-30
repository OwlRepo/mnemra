import { describe, expect, it, vi, beforeEach } from 'vitest'

const similaritySearchMock = vi.fn()
const streamMock = vi.fn()
const selectMock = vi.fn()
const fromMock = vi.fn()
const whereMock = vi.fn()

vi.mock('../vectorstore', () => ({
  similaritySearch: similaritySearchMock,
}))

vi.mock('@repo/db', () => ({
  db: {
    select: selectMock,
  },
  documents: {
    id: 'id',
    title: 'title',
    sourceUrl: 'sourceUrl',
  },
}))

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: class {
    stream = streamMock
  },
}))

describe('answerQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectMock.mockReturnValue({ from: fromMock })
    fromMock.mockReturnValue({ where: whereMock })
  })

  it('returns deduped sources and streamed answer tokens', async () => {
    similaritySearchMock.mockResolvedValue([
      {
        id: 'chunk-1',
        content: 'First chunk content is long enough to become snippet for first source.',
        metadata: { documentId: 'doc-1' },
        score: 0.91,
      },
      {
        id: 'chunk-2',
        content: 'Second chunk same doc should not create duplicate source row.',
        metadata: { documentId: 'doc-1' },
        score: 0.82,
      },
      {
        id: 'chunk-3',
        content: 'Third chunk another doc should create second source row.',
        metadata: { documentId: 'doc-2' },
        score: 0.88,
      },
    ])
    whereMock.mockResolvedValue([
      { id: 'doc-1', title: 'Doc One', sourceUrl: 'https://example.com/one' },
      { id: 'doc-2', title: 'Doc Two', sourceUrl: null },
    ])
    streamMock.mockResolvedValue(
      (async function* () {
        yield { content: 'hello ' }
        yield { content: 'world' }
      })(),
    )

    const { answerQuestion } = await import('./index')
    const result = await answerQuestion('question', 'ws-1')
    const tokens: string[] = []

    for await (const token of result.stream) {
      tokens.push(token)
    }

    expect(result.sources).toEqual([
      {
        documentId: 'doc-1',
        title: 'Doc One',
        sourceUrl: 'https://example.com/one',
        score: 0.91,
        snippet: 'First chunk content is long enough to become snippet for first source.',
      },
      {
        documentId: 'doc-2',
        title: 'Doc Two',
        sourceUrl: null,
        score: 0.88,
        snippet: 'Third chunk another doc should create second source row.',
      },
    ])
    expect(tokens.join('')).toBe('hello world')
  })

  it('returns fallback when retrieval empty', async () => {
    similaritySearchMock.mockResolvedValue([])
    const { answerQuestion } = await import('./index')

    const result = await answerQuestion('question', 'ws-1')
    const tokens: string[] = []
    for await (const token of result.stream) {
      tokens.push(token)
    }

    expect(result.sources).toEqual([])
    expect(tokens).toEqual(["I don't have enough information to answer that."])
  })
})
