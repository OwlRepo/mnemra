import { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/http/auth-proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } },
) {
  return proxyJson(
    request,
    `/workspaces/${params.id}/chat/sessions/${params.sessionId}/messages`,
    { method: 'GET' },
  )
}
