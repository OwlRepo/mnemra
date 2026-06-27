import { traceable } from 'langsmith/traceable'

export const tracingEnabled =
  process.env.LANGSMITH_TRACING === 'true' ||
  process.env.LANGCHAIN_TRACING_V2 === 'true'

export function withTracing<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  name: string,
  metadata?: Record<string, unknown>
): T {
  if (!tracingEnabled) return fn

  return traceable(fn, {
    name,
    metadata,
  }) as T
}
