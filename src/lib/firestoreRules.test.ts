import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('firestore.rules', () => {
  const rules = readFileSync('firestore.rules', 'utf8')

  it('le due email operano su shared e leggono gli account', () => {
    expect(rules).toContain("request.auth.token.email.lower() == 'laura.masala@tiscali.it'")
    expect(rules).toContain("request.auth.token.email.lower() == 'masala.roberto@hotmail.it'")
    expect(rules).toContain('function isOperator()')
    expect(rules).not.toContain('function isLaura()')
    expect(rules).toContain('request.auth.uid == uid || isOperator()')
    expect(rules).toContain("request.resource.data.salonId == 'shared'")
    expect(rules).toContain('match /salons/{salonId}/settings/main')
    expect(rules).toContain('owns(salonId) || isOperator()')
  })

  it('un titolare nuovo può togliere solo il proprio account non legacy', () => {
    expect(rules).toContain('allow delete: if signedIn() && request.auth.uid == uid && resource.data.legacy == false')
  })

  it('preferenze push e device restano sul proprio account', () => {
    expect(rules).toContain('match /accounts/{uid}/push/{docId}')
    expect(rules).toContain('match /accounts/{uid}/devices/{deviceId}')
    expect(rules).toContain('match /pushDeliveries/{id}')
    expect(rules).toContain('allow read, write: if false')
    expect(rules).toContain('request.auth.uid == uid')
    expect(rules).toContain('completeAfterMin <= 1440')
    expect(rules).toContain("docId == 'prefs'")
  })
})
