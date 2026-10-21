import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function sliceBraced(source: string, blockStart: number, openBrace: number): string {
  let depth = 0
  for (let i = openBrace; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(blockStart, i + 1)
    }
  }
  throw new Error('unclosed brace block')
}

function sliceMatchBlock(source: string, pathPattern: string): string {
  const needle = `match ${pathPattern}`
  const start = source.indexOf(needle)
  if (start < 0) throw new Error(`missing match ${pathPattern}`)
  const openBrace = source.indexOf('{', start + needle.length)
  if (openBrace < 0) throw new Error(`missing brace for match ${pathPattern}`)
  return sliceBraced(source, start, openBrace)
}

function sliceFunctionBody(source: string, name: string): string {
  const needle = `function ${name}()`
  const start = source.indexOf(needle)
  if (start < 0) throw new Error(`missing function ${name}`)
  const openBrace = source.indexOf('{', start + needle.length)
  if (openBrace < 0) throw new Error(`missing brace for function ${name}`)
  return sliceBraced(source, start, openBrace)
}

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
    const pushMatch = sliceMatchBlock(rules, '/accounts/{uid}/push/{docId}')
    expect(pushMatch).toContain('request.auth.uid == uid')
    expect(pushMatch).toContain("docId == 'prefs'")

    const pushPrefsOk = sliceFunctionBody(rules, 'pushPrefsOk')
    expect(pushPrefsOk).toContain('completeAfterMin >= 0')
    expect(pushPrefsOk).toContain('completeAfterMin <= 1440')
    expect(pushPrefsOk).toContain(
      "keys().hasOnly(['enabled', 'updates', 'complete', 'completeAfterMin', 'updatedAt'])",
    )

    const devicesMatch = sliceMatchBlock(rules, '/accounts/{uid}/devices/{deviceId}')
    expect(devicesMatch).toContain('request.auth.uid == uid')

    const pushDeviceOk = sliceFunctionBody(rules, 'pushDeviceOk')
    expect(pushDeviceOk).toContain("platform == 'android'")
    expect(pushDeviceOk).toContain("keys().hasOnly(['token', 'platform', 'appVersion', 'updatedAt'])")

    const pushDeliveriesMatch = sliceMatchBlock(rules, '/pushDeliveries/{id}')
    expect(pushDeliveriesMatch).toContain('allow read, write: if false')
  })
})
