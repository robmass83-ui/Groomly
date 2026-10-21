import { describe, expect, it } from 'vitest'
import { collectSends, type PushLoad } from '../../functions/src/sendPush'

const now = Date.parse('2026-06-15T10:00:00.000Z')

function load(latestVersion: string | null): PushLoad {
  return {
    accountIds: async () => ['active', 'disabled'],
    prefs: async (uid) => ({
      enabled: uid === 'active',
      updates: true,
      complete: true,
      completeAfterMin: 0,
    }),
    devices: async (uid) => uid === 'active'
      ? [{ id: 'phone-active', token: 'token-active', appVersion: '1.1.62' }]
      : [{ id: 'phone-disabled', token: 'token-disabled', appVersion: '9.0.0' }],
    appointments: async () => [
      {
        id: 'due',
        dogId: 'lilly',
        status: 'programmato',
        startMs: Date.parse('2026-06-15T08:00:00.000Z'),
        durationMin: 90,
      },
      {
        id: 'done',
        dogId: 'lilly',
        status: 'completato',
        startMs: Date.parse('2026-06-15T08:00:00.000Z'),
        durationMin: 90,
      },
    ],
    dogName: async (dogId) => dogId === 'lilly' ? 'Lilly' : '',
    delivered: async () => [],
    latestVersion: async () => latestVersion,
  }
}

describe('raccolta invii push', () => {
  it('manda completamento e aggiornamento solo al dispositivo abilitato e non aggiornato', async () => {
    const sends = await collectSends(load('9.0.0'), now)

    expect(sends).toHaveLength(2)
    expect(sends.map((send) => send.title).sort()).toEqual([
      'Aggiornamento disponibile',
      'Da completare',
    ])
    expect(sends.every((send) => send.deviceId === 'phone-active')).toBe(true)
    expect(sends.find((send) => send.kind === 'complete')).toMatchObject({
      subject: 'due',
      body: 'C’è da completare Lilly: è passato il tempo dopo la fine dell’appuntamento.',
    })
    expect(sends.find((send) => send.kind === 'updates')).toMatchObject({
      subject: '9.0.0',
      data: { type: 'update', version: '9.0.0' },
    })
  })

  it('mantiene il da completare quando la versione remota non è disponibile', async () => {
    const sends = await collectSends(load(null), now)

    expect(sends).toHaveLength(1)
    expect(sends[0]).toMatchObject({
      deviceId: 'phone-active',
      kind: 'complete',
      subject: 'due',
    })
  })
})
