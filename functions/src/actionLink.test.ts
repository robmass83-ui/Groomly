import { describe, expect, it } from 'vitest'
import { buildActionLink } from './actionLink'

describe('buildActionLink', () => {
  it('tiene mode e oobCode e punta a groomlyapp.it', () => {
    const link = buildActionLink(
      'https://groomly-3128b.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=abc123&apiKey=segreta&lang=en',
    )
    expect(link).toBe('https://groomlyapp.it/azione/?mode=resetPassword&oobCode=abc123&lang=it')
    expect(link).not.toContain('firebaseapp.com')
    expect(link).not.toContain('apiKey')
    expect(link).not.toContain('segreta')
  })

  it('copre anche la conferma email', () => {
    const link = buildActionLink(
      'https://groomly-3128b.firebaseapp.com/__/auth/action?apiKey=segreta&mode=verifyEmail&oobCode=codice&lang=en',
    )
    expect(link).toBe('https://groomlyapp.it/azione/?mode=verifyEmail&oobCode=codice&lang=it')
  })

  it('rifiuta un link senza i due parametri', () => {
    expect(() => buildActionLink('https://groomlyapp.it/azione?mode=resetPassword')).toThrow(/oobCode/)
  })
})
