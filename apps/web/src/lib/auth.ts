const SESSION_FLAG_KEY = 'mnemra_session_active'

export function markLoggedIn(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_FLAG_KEY, '1')
  }
}

export function isLoggedIn(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(SESSION_FLAG_KEY) === '1'
  }
  return false
}

export function clearLoggedIn(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_FLAG_KEY)
  }
}
