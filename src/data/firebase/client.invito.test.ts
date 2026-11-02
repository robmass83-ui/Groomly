import { beforeEach, describe, expect, it, vi } from 'vitest'

const ordine: string[] = []
const chiamata = vi.fn(async (data: unknown) => { ordine.push(`callable:${JSON.stringify(data)}`); return { data: null } })
const getIdToken = vi.fn(async (forza?: boolean) => { ordine.push(`token:${String(forza)}`); return 'tok' })

vi.mock('firebase/app', () => ({ getApps: () => [{}], initializeApp: () => ({}) }))
vi.mock('../../lib/appCheck', () => ({ preparaAppCheck: vi.fn(async () => undefined) }))
vi.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: { getIdToken } }) }))
vi.mock('firebase/functions', () => ({ getFunctions: () => ({}), httpsCallable: () => chiamata }))

import { callAcceptInvite } from './client'

describe('callAcceptInvite', () => {
  beforeEach(() => { ordine.length = 0; getIdToken.mockClear(); chiamata.mockClear() })

  it('rinnova il token di accesso con getIdToken(true) prima di chiamare acceptInvite', async () => {
    await callAcceptInvite('tok123', 'pausa')
    expect(getIdToken).toHaveBeenCalledWith(true)
    expect(ordine).toEqual(['token:true', 'callable:{"token":"tok123","sceltaSalone":"pausa"}'])
  })

  it('se il rinnovo fallisce non chiama la callable', async () => {
    getIdToken.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'auth/network-request-failed' }))
    await expect(callAcceptInvite('tok123')).rejects.toThrow('offline')
    expect(chiamata).not.toHaveBeenCalled()
  })
})
