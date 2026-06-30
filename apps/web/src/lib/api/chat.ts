import { apiFetch } from './client'

export function listChatSessions(workspaceId: string) {
  return apiFetch(`/api/workspaces/${workspaceId}/chat/sessions`)
}

export function getChatMessages(workspaceId: string, sessionId: string) {
  return apiFetch(`/api/workspaces/${workspaceId}/chat/sessions/${sessionId}/messages`)
}
