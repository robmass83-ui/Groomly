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
  return sliceFunction(source, `${name}()`)
}

function sliceFunction(source: string, signature: string): string {
  const needle = `function ${signature}`
  const start = source.indexOf(needle)
  if (start < 0) throw new Error(`missing function ${signature}`)
  const openBrace = source.indexOf('{', start + needle.length)
  if (openBrace < 0) throw new Error(`missing brace for function ${signature}`)
  return sliceBraced(source, start, openBrace)
}

function salonKindBlock(source: string, specific: string, kind: string): string {
  const needle = `match ${specific}`
  if (source.includes(needle)) return sliceMatchBlock(source, specific)
  const generic = sliceMatchBlock(source, '/salons/{salonId}/{kind}/{id}')
  expect(generic).toContain(`kind == '${kind}'`)
  return generic
}

describe('firestore.rules', () => {
  const rules = readFileSync('firestore.rules', 'utf8')

  it('le due email operano su shared e leggono gli account', () => {
    expect(rules).toContain("request.auth.token.email.lower() == 'laura.masala@tiscali.it'")
    expect(rules).toContain("request.auth.token.email.lower() == 'masala.roberto@hotmail.it'")
    expect(rules).toContain('function isOperator()')
    expect(rules).toContain('request.auth.token.email_verified == true')
    expect(rules).toContain('request.auth.token.admin == true')
    expect(rules).not.toContain('function isLaura()')
    expect(rules).toContain('request.auth.uid == uid || isOperator()')
    expect(rules).not.toContain("request.resource.data.salonId == 'shared'")
    expect(rules).toContain('match /salons/{salonId}/settings/main')
    expect(rules).toContain('canUse(salonId) || isOperator()')
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

  it('separa titolare, socio e collaboratore sul salone', () => {
    expect(rules).toContain('function proEnabled(salonId)')
    expect(rules).toContain('function canUse(salonId)')
    expect(rules).toContain('function ownerRank(salonId)')
    expect(rules).toContain('function memberRole()')

    const canUse = sliceFunction(rules, 'canUse(salonId)')
    expect(canUse).toContain("memberRole() == 'titolare'")
    expect(sliceFunction(rules, 'memberRole()')).toContain('get(accountPath()).data.role')
    const proEnabled = sliceFunction(rules, 'proEnabled(salonId)')
    expect(proEnabled).toContain('pro/main')
    expect(proEnabled).toContain('enabled')
    const ownerRank = sliceFunction(rules, 'ownerRank(salonId)')
    expect(ownerRank).toContain("memberRole() == 'titolare'")
    expect(ownerRank).toContain("memberRole() == 'socio'")
    expect(ownerRank).not.toContain("memberRole() == 'collaboratore'")

    expect(rules).toContain('match /salons/{salonId}/pro/{docId}')
    const pro = sliceMatchBlock(rules, '/salons/{salonId}/pro/{docId}')
    expect(pro).toContain('allow write: if false')
    expect(pro).toContain('canUse(salonId) || isOperator() || accountSalonIs(salonId)')

    expect(rules).toContain('match /salons/{salonId}/members/{memberId}')
    const members = sliceMatchBlock(rules, '/salons/{salonId}/members/{memberId}')
    expect(members).toContain('accountSalonIs(salonId)')
    expect(members).toContain('request.auth.uid == memberId')
    expect(members).toContain('allow write: if false')

    expect(rules).toContain('match /invites/{token}')
    const invites = sliceMatchBlock(rules, '/invites/{token}')
    expect(invites).toContain('allow read, write: if false')

    const dogs = salonKindBlock(rules, '/salons/{salonId}/dogs/{dogId}', 'dogs')
    expect(dogs).toContain("memberRole() == 'collaboratore'")
    expect(dogs).toContain("resource.data.status == 'attivo'")
    expect(dogs).toContain("request.resource.data.status == 'attivo'")
    expect(dogs).toContain('allow delete: if ownerRank(salonId)')
    expect(dogs).not.toMatch(/allow delete:[^\n]*canUse\(salonId\)/)
    expect(dogs).not.toMatch(/allow delete:[^\n]*collaboratore/)

    const appointments = salonKindBlock(rules, '/salons/{salonId}/appointments/{appointmentId}', 'appointments')
    expect(appointments).toContain("memberRole() == 'collaboratore'")
    expect(appointments).toContain("'completato'")
    expect(appointments).toContain('completedFieldsHeld()')
    const held = sliceFunctionBody(rules, 'completedFieldsHeld')
    expect(held).toContain('affectedKeys()')
    expect(held).toContain("'total'")
    expect(held).toContain("'paymentMethod'")
    expect(held).toContain("'actualDurationMin'")
    expect(held).toContain("'status'")
    expect(held).toContain("'assigneeUid'")

    const settings = sliceMatchBlock(rules, '/salons/{salonId}/settings/main')
    expect(settings).toContain('canUse(salonId) || isOperator()')
    expect(settings).not.toContain('owns(salonId)')

    const files = sliceMatchBlock(rules, '/salons/{salonId}/files/{fileId}')
    expect(files).toContain('allow read: if canUse(salonId)')
    expect(files).toContain('ownerRank(salonId)')
    expect(files).not.toContain('owns(salonId)')
    expect(files).toContain("memberRole() == 'collaboratore'")
    expect(files).toContain("kind == 'foto'")
    expect(files).toContain('dog:')
    expect(files).toContain('appointment:')
    expect(files).toContain('fileOk()')
    expect(files).toContain('documents/salons/$(salonId)/files/$(fileId)')

    const writable = sliceFunction(rules, 'salonKindWritable(kind)')
    expect(writable).toContain("kind == 'services'")
    expect(writable).toContain("kind == 'closures'")
    expect(writable).toContain("kind == 'settings'")
    expect(writable).toContain("kind == 'meta'")
    expect(writable).toContain("kind == 'deletedDogs'")
    expect(writable).not.toContain('crediti')
    expect(writable).not.toContain('pro')
    for (const path of ['/salons/{salonId}/{kind}/{id}', '/salons/{salonId}/{kind}/{id}/{rest=**}']) {
      const block = sliceMatchBlock(rules, path)
      expect(block).toContain('allow read: if canUse(salonId)')
      expect(block).toContain('ownerRank(salonId)')
      expect(block).toContain('salonKindWritable(kind)')
      expect(block).not.toContain('owns(salonId)')
    }
    const config = sliceMatchBlock(rules, '/config/{docId}')
    expect(config).toContain('allow read: if signedIn()')
    expect(config).toContain('allow write: if false')

    const users = sliceMatchBlock(rules, '/users/{uid}/{document=**}')
    expect(users).toContain('request.auth.uid == uid')
    expect(users).not.toContain('allow read: if request.auth != null;')

    const sharedFiles = sliceMatchBlock(rules, '/salon/shared/files/{fileId}')
    expect(sharedFiles).toContain('isOperator()')
    expect(sharedFiles).toContain("canUse('shared')")
    expect(sharedFiles).toContain('allow create: if false')
    expect(sharedFiles).toContain('allow update: if false')
    expect(sharedFiles).toContain('allow delete: if false')
    expect(sharedFiles).not.toContain("ownerRank('shared')")
    for (const path of ['/salon/shared/{kind}/{id}', '/salon/shared/{kind}/{id}/{rest=**}']) {
      const block = sliceMatchBlock(rules, path)
      expect(block).toContain('isOperator()')
      expect(block).toContain("canUse('shared')")
      expect(block).toContain('allow write: if false')
      expect(block).not.toContain("ownerRank('shared')")
    }
    expect(sliceMatchBlock(rules, '/salon/shared/pro/{docId}')).toContain('allow write: if false')
    expect(sliceMatchBlock(rules, '/salon/shared/members/{memberId}')).toContain('allow write: if false')
    expect(sliceFunction(rules, 'proEnabled(salonId)')).toContain('salon/shared/pro/main')

    const accounts = sliceMatchBlock(rules, '/accounts/{uid}')
    expect(accounts).toContain('request.resource.data.salonId == resource.data.salonId')
    expect(accounts).toContain('request.resource.data.role == resource.data.role')
    expect(accounts).toContain('request.resource.data.legacy == resource.data.legacy')
  })

  it('shared non si scrive e un socio resta dentro se il membro ha accessWithoutPro', () => {
    const rules = readFileSync('firestore.rules', 'utf8')
    const canUse = rules.slice(rules.indexOf('function canUse(salonId)'), rules.indexOf('function ownerRank(salonId)'))
    expect(canUse).toContain('accessWithoutPro')
    expect(canUse).toContain('members/$(request.auth.uid)')
    const sharedDogs = rules.slice(rules.indexOf('match /salon/shared/dogs/{dogId}'), rules.indexOf('match /salon/shared/appointments/{appointmentId}'))
    expect(sharedDogs).toContain('allow create: if false')
    expect(sharedDogs).toContain('allow update: if false')
    expect(sharedDogs).toContain('allow delete: if false')
    expect(sharedDogs).not.toContain('allow create: if isOperator()')
    const accounts = rules.slice(rules.indexOf('match /accounts/{uid}'), rules.indexOf('match /accounts/{uid}/push/{docId}'))
    expect(accounts).not.toContain("salonId == 'shared'")
  })
})
