import type { NextResponse } from 'next/server'

const ACCESS_TOKEN_MAX_AGE = 60 * 15

export function accessCookie(value: string): string {
  const parts = [
    `mnemra_at=${value}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${ACCESS_TOKEN_MAX_AGE}`,
    'SameSite=Lax',
  ]

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export function forwardSetCookies(response: NextResponse, backend: Response): void {
  const getSetCookie = backend.headers.getSetCookie?.bind(backend.headers)
  const values = getSetCookie?.() ?? (backend.headers.get('set-cookie') ? [backend.headers.get('set-cookie')!] : [])

  for (const value of values) {
    response.headers.append('set-cookie', value)
  }
}
