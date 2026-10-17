import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('firestore.rules', () => {
  const rules = readFileSync('firestore.rules', 'utf8')

  it('ancora Laura a shared e gli altri al proprio uid', () => {
    expect(rules).toContain("request.auth.token.email.lower() == 'laura.masala@tiscali.it'")
    expect(rules).toContain("request.resource.data.salonId == 'shared'")
    expect(rules).toContain('request.resource.data.salonId == uid')
    expect(rules).toContain("request.resource.data.role == 'titolare'")
    expect(rules).toContain('request.resource.data.legacy == false')
    expect(rules).toContain('request.resource.data.legacy == true')
    expect(rules).toContain('request.resource.data.salonId == resource.data.salonId')
    expect(rules).toContain('request.resource.data.role == resource.data.role')
    expect(rules).toContain('request.resource.data.legacy == resource.data.legacy')
    expect(rules).toContain('match /salons/{salonId}/{kind}/{id}')
  })

  it('un titolare nuovo può togliere solo il proprio account non legacy', () => {
    expect(rules).toContain('allow delete: if signedIn() && request.auth.uid == uid && resource.data.legacy == false')
  })
})
