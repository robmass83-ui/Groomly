import { describe, expect, it } from 'vitest'
import {
  appointmentFromDoc,
  collectSends,
  deliveryCandidateIds,
  deliverySlot,
  versionFromGithub,
  type PushLoad,
} from '../../functions/src/sendPush'
import { deliveryId } from './pushDue'

const now = Date.parse('2026-06-15T10:00:00.000Z')

function load(latestVersion: string | null): PushLoad {
  return {
    accountIds: async () => ['active', 'disabled'],
    account: async (_uid) => ({ salonId: 'salon-a' }),
    prefs: async (uid) => ({
      enabled: uid === 'active',
      updates: true,
      complete: true,
      completeAfterMin: 0,
    }),
    devices: async (uid) => uid === 'active'
      ? [{ id: 'phone-active', token: 'token-active', appVersion: '1.1.62' }]
      : [{ id: 'phone-disabled', token: 'token-disabled', appVersion: '9.0.0' }],
    appointments: async (_salonId) => [
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
    dogName: async (_salonId, dogId) => dogId === 'lilly' ? 'Lilly' : '',
    delivered: async () => [],
    latestVersion: async () => latestVersion,
  }
}

describe('raccolta invii push', () => {
  it('limita le consegne candidate alla finestra utile', () => {
    const old = {
      id: 'old',
      dogId: 'lilly',
      status: 'programmato',
      startMs: now - 49 * 60 * 60 * 1000,
      durationMin: 0,
    }
    const recent = {
      ...old,
      id: 'recent',
      startMs: now - 2 * 60 * 60 * 1000,
    }

    expect(deliveryCandidateIds('phone-active', [old, recent], now, '9.0.0')).toEqual([
      deliveryId('phone-active', 'updates', '9.0.0'),
      deliveryId('phone-active', 'complete', 'recent'),
    ])
    expect(deliveryCandidateIds('phone-active', [recent], now, null)).toEqual([
      deliveryId('phone-active', 'complete', 'recent'),
    ])
    expect(deliveryCandidateIds('phone-active', [], now, '')).toEqual([])
  })

  it('accetta la release solo quando contiene groomly.apk', () => {
    expect(versionFromGithub({
      tag_name: 'v9.0.0',
      assets: [{ name: 'groomly.apk', browser_download_url: 'https://example.com/groomly.apk' }],
    })).toBe('9.0.0')
    expect(versionFromGithub({ tag_name: 'v9.0.0' })).toBeNull()
    expect(versionFromGithub({
      tag_name: 'v9.0.0',
      assets: [{ name: 'notes.txt', browser_download_url: 'https://example.com/notes.txt' }],
    })).toBeNull()
    expect(versionFromGithub({
      tag_name: 'v9.0.0',
      assets: [{ name: 'Groomly.apk', browser_download_url: 'https://example.com/Groomly.apk' }],
    })).toBeNull()
  })

  it('somma la durata dei servizi prima di decidere la scadenza', async () => {
    const appointment = appointmentFromDoc('due', {
      dogId: 'lilly',
      status: 'programmato',
      start: Date.parse('2026-06-15T08:00:00.000Z'),
      services: [{ durationMin: 40 }, { durationMin: 50 }],
    })

    expect(appointment.durationMin).toBe(90)
    const sends = await collectSends({
      ...load(null),
      accountIds: async () => ['active'],
      appointments: async (_salonId) => [appointment],
    }, Date.parse('2026-06-15T09:00:00.000Z'))
    expect(sends.some((send) => send.kind === 'complete')).toBe(false)
  })

  it('un personale nei 30 minuti prima è un promemoria, non un da completare', () => {
    const appointment = appointmentFromDoc('p1', {
      kind: 'personale',
      title: 'Dentista',
      start: now + 20 * 60 * 1000,
    })
    expect(appointment.personalTitle).toBe('Dentista')
    expect(deliveryCandidateIds('phone-active', [appointment], now, null)).toEqual([
      deliveryId('phone-active', 'reminder', 'p1'),
    ])
    expect(deliveryCandidateIds('phone-active', [appointment], now - 31 * 60 * 1000, null)).toEqual([])
  })

  it('distingue slot liberi, consegnati, occupati e scaduti', () => {
    const nowMs = Date.parse('2026-06-15T10:00:00.000Z')
    expect(deliverySlot(null, nowMs)).toBe('free')
    expect(deliverySlot({ at: nowMs - 10_000 }, nowMs)).toBe('done')
    expect(deliverySlot({ claim: nowMs - 4 * 60 * 1000 + 1 }, nowMs)).toBe('busy')
    expect(deliverySlot({ claim: nowMs - 4 * 60 * 1000 }, nowMs)).toBe('stale')
  })

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

  it('il titolo segue la lingua dell’account', async () => {
    const base = load('9.0.0')
    const sends = await collectSends({
      ...base,
      account: async () => ({ salonId: 'salon-a', lingua: 'en' }),
    }, now)
    expect(sends.find((send) => send.kind === 'updates')?.title).toBe('Update available')
    expect(sends.find((send) => send.kind === 'complete')?.title).toBe('To complete')
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

  it('non manda gli appuntamenti di un salone al telefono di un altro, e ignora shared', async () => {
    const sends = await collectSends({
      ...load('9.0.0'),
      accountIds: async () => ['active', 'altro', 'fermo'],
      account: async (uid) => {
        if (uid === 'active') return { salonId: 'salon-a' }
        if (uid === 'altro') return { salonId: 'salon-b' }
        return { salonId: 'shared' }
      },
      devices: async (uid) => {
        if (uid === 'active') return [{ id: 'phone-active', token: 'token-active', appVersion: '1.1.62' }]
        if (uid === 'altro') return [{ id: 'phone-altro', token: 'token-altro', appVersion: '1.1.62' }]
        return [{ id: 'phone-disabled', token: 'token-disabled', appVersion: '9.0.0' }]
      },
      prefs: async (uid) => ({
        enabled: uid === 'active' || uid === 'altro',
        updates: true,
        complete: true,
        completeAfterMin: 0,
      }),
      appointments: async (salonId) => {
        expect(salonId).not.toBe('shared')
        return salonId === 'salon-a' ? [{
          id: 'due', dogId: 'lilly', status: 'programmato',
          startMs: Date.parse('2026-06-15T08:00:00.000Z'), durationMin: 90,
        }] : []
      },
      dogName: async (_salonId, _dogId) => 'Lilly',
    }, now)
    expect(sends.filter((send) => send.kind === 'complete').map((send) => send.deviceId)).toEqual(['phone-active'])
  })
})
