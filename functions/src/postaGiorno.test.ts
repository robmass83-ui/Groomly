import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('./piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { emailOggi, margineConsole, prenotaEmail } from './postaGiorno'

const db = () => getFirestore() as unknown as Firestore
const ADESSO = new Date('2026-11-05T10:00:00.000Z')
const DOMANI = new Date('2026-11-06T10:00:00.000Z')

describe('margineConsole', () => {
  it.each([[120, 90], [0, 150], [299, 0], [300, 0], [400, 0]])('con %i email già partite restano %i', (totale, margine) => {
    expect(margineConsole(totale)).toBe(margine)
  })
})

describe('prenotaEmail', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('sistema/postaGiorno', { giorno: '2026-11-05', n: 120, perSalone: { s1: 120 }, accesi: ['s1'] })
  })

  it('oltre metà del margine non prenota e il totale resta', async () => {
    await expect(prenotaEmail(db(), ADESSO, 91)).resolves.toBe(false)
    expect(archivio.get('sistema/postaGiorno')?.n).toBe(120)
  })

  it('entro il margine somma al totale e lascia i conti dei saloni', async () => {
    await expect(prenotaEmail(db(), ADESSO, 90)).resolves.toBe(true)
    expect(archivio.get('sistema/postaGiorno')).toMatchObject({ n: 210, perSalone: { s1: 120 }, accesi: ['s1'] })
  })

  it('il giorno dopo riparte da zero', async () => {
    await expect(prenotaEmail(db(), DOMANI, 150)).resolves.toBe(true)
    expect(archivio.get('sistema/postaGiorno')).toMatchObject({ giorno: '2026-11-06', n: 150, accesi: ['s1'] })
  })

  it('zero email passa senza scrivere', async () => {
    await expect(prenotaEmail(db(), ADESSO, 0)).resolves.toBe(true)
    expect(archivio.get('sistema/postaGiorno')?.n).toBe(120)
  })
})

describe('emailOggi', () => {
  it('legge il totale del giorno, zero se il documento è di ieri o manca', async () => {
    archivio.clear()
    await expect(emailOggi(db(), ADESSO)).resolves.toBe(0)
    archivio.set('sistema/postaGiorno', { giorno: '2026-11-05', n: 42 })
    await expect(emailOggi(db(), ADESSO)).resolves.toBe(42)
    await expect(emailOggi(db(), DOMANI)).resolves.toBe(0)
  })
})
