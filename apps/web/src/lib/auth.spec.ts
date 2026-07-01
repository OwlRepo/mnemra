/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from 'vitest'
import { clearLoggedIn, isLoggedIn, markLoggedIn } from './auth'

describe('session flag (no raw token stored client-side)', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('isLoggedIn is false when nothing has been marked', () => {
    expect(isLoggedIn()).toBe(false)
  })

  it('markLoggedIn flips isLoggedIn to true', () => {
    markLoggedIn()

    expect(isLoggedIn()).toBe(true)
  })

  it('clearLoggedIn flips isLoggedIn back to false', () => {
    markLoggedIn()
    clearLoggedIn()

    expect(isLoggedIn()).toBe(false)
  })

  it('never persists the raw JWT anywhere in sessionStorage', () => {
    markLoggedIn()

    const allValues = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.getItem(sessionStorage.key(i) ?? ''))
    // a real JWT always has two dots (header.payload.signature); the flag value must not look like one
    expect(allValues.some((value) => (value ?? '').split('.').length === 3)).toBe(false)
  })
})
