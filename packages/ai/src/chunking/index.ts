import { createHash } from 'crypto'
import {
  RecursiveCharacterTextSplitter,
  MarkdownTextSplitter,
} from 'langchain/text_splitter'
import { get_encoding } from 'tiktoken'
import type { LoadedDocument } from '../loaders/types'
import type { Chunk, ChunkOptions, ChunkStrategy } from './types'

export type { Chunk, ChunkOptions, ChunkStrategy }

const MARKDOWN_FILE_TYPES = new Set([
  'md',
  'mdx',
  'mdc',
  'markdown',
  'mkd',
  'mkdn',
  'mkdown',
])

const encoder = get_encoding('cl100k_base')

function countTokens(text: string): number {
  return encoder.encode(text).length
}

function hashContent(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function resolveStrategy(fileType: string, requested?: ChunkStrategy): ChunkStrategy {
  if (requested) return requested
  return MARKDOWN_FILE_TYPES.has(fileType) ? 'markdown' : 'recursive'
}

function buildSplitter(strategy: ChunkStrategy, chunkSize: number, chunkOverlap: number) {
  const options = {
    chunkSize,
    chunkOverlap,
    lengthFunction: countTokens,
  }

  switch (strategy) {
    case 'markdown':
      return new MarkdownTextSplitter(options)

    case 'section-aware':
      // TODO: implement section-aware splitter per file type
      // foundations: sectionId + sectionTitle already in Chunk.metadata
      // fall back to recursive until implemented
      return new RecursiveCharacterTextSplitter(options)

    case 'recursive':
    default:
      return new RecursiveCharacterTextSplitter(options)
  }
}

export async function chunkDocument(
  doc: LoadedDocument,
  options: ChunkOptions = {}
): Promise<Chunk[]> {
  const { chunkSize = 512, chunkOverlap = 50, strategy: requestedStrategy } = options

  const strategy = resolveStrategy(doc.metadata.fileType, requestedStrategy)
  const splitter = buildSplitter(strategy, chunkSize, chunkOverlap)
  const splits = await splitter.splitText(doc.content)

  const totalChunks = splits.length

  return splits.map((content, index) => ({
    content,
    contentHash: hashContent(content),
    metadata: {
      ...doc.metadata,
      chunkIndex: index,
      totalChunks,
      strategy,
    },
  }))
}
