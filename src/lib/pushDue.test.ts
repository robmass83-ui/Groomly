import { describe, expect, it } from 'vitest'
import { CLOSE_AFTER_MS, appointmentEnd, closeDueAt } from './appointments'
import {
  appointmentDueMs,
  appointmentsForPush,
  completeBody,
  DEFAULT_PUSH_PREFS,
  deliveryId,
  readPushPrefs,
  reminderBody,
  selectPushes,
} from './pushDue'

const summer = Date.parse('2026-06-15T08:00:00.000Z') // 10:00 a Roma
const winter = Date.parse('2026-01-15T09:00:00.000Z') // 10:00 a Roma

describe('scadenza push', () => {
  it('a Roma arrotonda come roundEnd e poi aggiunge i minuti della push', () => {
    expect(appointmentDueMs(summer, 45, 60)).toBe(Date.parse('2026-06-15T09:45:00.000Z'))
    expect(appointmentDueMs(summer, 53, 60)).toBe(Date.parse('2026-06-15T09:55:00.000Z'))
    expect(appointmentDueMs(winter, 45, 0)).toBe(Date.parse('2026-01-15T09:45:00.000Z'))
    expect(appointmentDueMs(Date.parse('2026-03-29T00:58:00.000Z'), 0, 0)).toBe(Date.parse('2026-03-29T01:00:00.000Z'))
    expect(appointmentDueMs(Date.parse('2026-10-25T00:28:00.000Z'), 0, 0)).toBe(Date.parse('2026-10-25T00:30:00.000Z'))
  })

  it('i minuti della push non sono l’ora fissa di Home', () => {
    const start = new Date(2026, 5, 15, 10, 0, 0)
    const services = [{ durationMin: 60 }]
    expect(closeDueAt(start, services).getTime() - appointmentEnd(start, services).getTime()).toBe(CLOSE_AFTER_MS)
    expect(appointmentDueMs(start.getTime(), 60, 15)).not.toBe(closeDueAt(start, services).getTime())
  })

  it('legge i default e tiene i minuti fra 0 e 1440', () => {
    expect(readPushPrefs(undefined)).toEqual(DEFAULT_PUSH_PREFS)
    expect(readPushPrefs({ enabled: true, updates: false, complete: true, completeAfterMin: 2000 }).completeAfterMin).toBe(1440)
    expect(readPushPrefs({ completeAfterMin: -3 }).completeAfterMin).toBe(0)
  })

  it('compone id e corpo', () => {
    expect(deliveryId('tel 1', 'complete', 'app/9')).toBe('tel_1__complete__app_9')
    expect(deliveryId('d', 'updates', '1.2.0')).toBe('d__updates__1_2_0')
    expect(completeBody('Lilly')).toBe('C’è da completare Lilly: è passato il tempo dopo la fine dell’appuntamento.')
    expect(completeBody('  ')).toBe('C’è da completare un appuntamento: è passato il tempo dopo la fine dell’appuntamento.')
  })

  it('seleziona al massimo 8 da completare, dentro le 24 ore, e l’aggiornamento più nuovo', () => {
    const now = appointmentDueMs(summer, 60, 60) + 60_000
    const prefs = { ...DEFAULT_PUSH_PREFS, enabled: true, completeAfterMin: 60 }
    const base = { deviceId: 'd1', token: 'tok', appVersion: '1.1.62', delivered: [], dogNames: { lilly: 'Lilly' }, latestVersion: '1.2.0', nowMs: now, prefs }
    const fresh = { id: 'a1', dogId: 'lilly', status: 'programmato', startMs: summer, durationMin: 60 }
    const done = { ...fresh, id: 'a2', status: 'completato' }
    const old = { ...fresh, id: 'a3', startMs: summer - 3 * 24 * 60 * 60 * 1000 }
    const sends = selectPushes({ ...base, appointments: [done, old, fresh] })
    expect(sends.map((item) => item.kind).sort()).toEqual(['complete', 'updates'])
    const complete = sends.find((item) => item.kind === 'complete')
    expect(complete).toMatchObject({
      title: 'Da completare',
      body: 'C’è da completare Lilly: è passato il tempo dopo la fine dell’appuntamento.',
      subject: 'a1',
      data: { type: 'complete', appointmentId: 'a1', url: '/appuntamenti/a1' },
    })
    const update = sends.find((item) => item.kind === 'updates')
    expect(update).toMatchObject({
      title: 'Aggiornamento disponibile',
      body: 'È pronta la versione 1.2.0.',
      data: { type: 'update', version: '1.2.0' },
    })
    expect(selectPushes({ ...base, prefs: { ...prefs, enabled: false }, appointments: [fresh] })).toEqual([])
    expect(selectPushes({ ...base, prefs: { ...prefs, complete: false }, appointments: [fresh] }).every((item) => item.kind === 'updates')).toBe(true)
    expect(selectPushes({ ...base, prefs: { ...prefs, updates: false }, latestVersion: '1.2.0', appointments: [fresh] }).every((item) => item.kind === 'complete')).toBe(true)
    expect(selectPushes({ ...base, delivered: [deliveryId('d1', 'complete', 'a1'), deliveryId('d1', 'updates', '1.2.0')], appointments: [fresh] })).toEqual([])
    const many = Array.from({ length: 9 }, (_, index) => ({ ...fresh, id: `n${index}`, startMs: summer - index * 60_000 }))
    const limited = selectPushes({ ...base, latestVersion: null, appointments: many }).filter((item) => item.kind === 'complete')
    expect(limited).toHaveLength(8)
    const inglese = selectPushes({ ...base, lingua: 'en', latestVersion: '1.2.0', appointments: [fresh] })
    expect(inglese.find((item) => item.kind === 'updates')).toMatchObject({
      title: 'Update available',
      body: 'Version 1.2.0 is ready.',
    })
    expect(inglese.find((item) => item.kind === 'complete')).toMatchObject({
      title: 'To complete',
      body: 'Time to complete Lilly: the appointment has run past its end.',
    })
  })

  it('avvisa un personale nei 30 minuti prima dell’inizio, non dopo e non se le push sono spente', () => {
    const startMs = summer + 30 * 60 * 1000
    const prefs = { ...DEFAULT_PUSH_PREFS, enabled: true, complete: false, updates: false }
    const base = { deviceId: 'd1', token: 'tok', appVersion: '1.1.64', delivered: [] as string[], dogNames: {}, latestVersion: null, prefs }
    const dentista = { id: 'p1', dogId: '', status: '', startMs, durationMin: 0, personalTitle: 'Dentista' }
    const early = selectPushes({ ...base, nowMs: startMs - 31 * 60 * 1000, appointments: [dentista] })
    const due = selectPushes({ ...base, nowMs: startMs - 20 * 60 * 1000, appointments: [dentista] })
    const late = selectPushes({ ...base, nowMs: startMs + 60_000, appointments: [dentista] })
    const off = selectPushes({ ...base, nowMs: startMs - 20 * 60 * 1000, prefs: { ...prefs, enabled: false }, appointments: [dentista] })
    expect(early).toEqual([])
    expect(late).toEqual([])
    expect(off).toEqual([])
    expect(due).toEqual([expect.objectContaining({
      kind: 'reminder',
      subject: 'p1',
      title: 'Dentista',
      body: reminderBody(),
      data: { type: 'reminder', appointmentId: 'p1', url: '/appuntamenti/personale/p1' },
    })])
    expect(selectPushes({
      ...base,
      nowMs: startMs - 20 * 60 * 1000,
      delivered: [deliveryId('d1', 'reminder', 'p1')],
      appointments: [dentista],
    })).toEqual([])
  })

  it('due personali nella finestra fanno due promemoria e l’aggiornamento resta', () => {
    const startMs = summer + 20 * 60 * 1000
    const prefs = { ...DEFAULT_PUSH_PREFS, enabled: true, complete: true, updates: true }
    const base = {
      deviceId: 'd1',
      token: 'tok',
      appVersion: '1.1.66',
      nowMs: summer,
      delivered: [] as string[],
      dogNames: {},
      latestVersion: '1.1.67',
      prefs,
    }
    const dentista = { id: 'p1', dogId: '', status: '', startMs, durationMin: 0, personalTitle: 'Dentista' }
    const spesa = { id: 'p2', dogId: '', status: '', startMs, durationMin: 0, personalTitle: 'Spesa' }
    const both = selectPushes({ ...base, appointments: [dentista, spesa] })
    expect(both.filter((item) => item.kind === 'reminder').map((item) => item.subject).sort()).toEqual(['p1', 'p2'])
    expect(both.filter((item) => item.kind === 'updates')).toEqual([expect.objectContaining({
      title: 'Aggiornamento disponibile',
      data: { type: 'update', version: '1.1.67' },
    })])
    expect(both.filter((item) => item.kind === 'complete')).toEqual([])
    const one = selectPushes({ ...base, appointments: [spesa] })
    expect(one.filter((item) => item.kind === 'reminder').map((item) => item.subject)).toEqual(['p2'])
    expect(one.some((item) => item.kind === 'updates')).toBe(true)
  })

  it('il filtro push toglie solo gli id nella pietra e, se la pietra non si legge, non toglie nulla', () => {
    const rows = [{ id: 'p1' }, { id: 'p2' }, { id: '' }]
    expect(appointmentsForPush(rows, null).map((item) => item.id)).toEqual(['p1', 'p2', ''])
    expect(appointmentsForPush(rows, ['p1']).map((item) => item.id)).toEqual(['p2'])
    expect(appointmentsForPush(rows, []).map((item) => item.id)).toEqual(['p1', 'p2'])
  })
})
