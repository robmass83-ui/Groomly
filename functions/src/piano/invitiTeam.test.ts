import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))

vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))

import * as firestore from 'firebase-admin/firestore'
import { getFirestore, type Firestore, type Transaction } from 'firebase-admin/firestore'
import {
  annullaInvitoPer,
  idInvito,
  invitiInSospesoPer,
  leggiInvitoPer,
  rifiutaInvitoPer,
  scriviAvvisoUscita,
  segnaAvvisoUscitaPer,
} from './invitiTeam'

const stato = (firestore as unknown as { stato: { scritture: number } }).stato
const adesso = new Date('2026-11-02T10:00:00.000Z')
const db = () => getFirestore() as unknown as Firestore
const t = (n: number) => String(n).repeat(64).slice(0, 64)
const FUTURA = '2026-11-09T10:00:00.000Z'
const FUTURA2 = '2026-11-05T10:00:00.000Z'
const PASSATA = '2026-11-01T10:00:00.000Z'
const chi = { uid: 'u2', email: 'Anna@Test.it' }

function invito(token: string, extra: Record<string, unknown> = {}) {
  archivio.set(`invites/${token}`, {
    salonId: 'tit',
    email: 'anna@test.it',
    role: 'collaboratore',
    createdAt: '2026-11-01T10:00:00.000Z',
    expiresAt: FUTURA,
    status: 'aperto',
    ...extra,
  })
}

beforeEach(() => {
  archivio.clear()
  stato.scritture = 0
  archivio.set('salons/tit/settings/main', { business: { salonName: 'Bauci' } })
  archivio.set('salons/tit/pro/main', { openInviteExpiries: [FUTURA, FUTURA2] })
})

describe('leggiInvitoPer', () => {
  it('aperto', async () => {
    invito(t(1))
    expect(await leggiInvitoPer(db(), chi, t(1), adesso)).toEqual({ stato: 'aperto', salone: 'Bauci', ruolo: 'collaboratore' })
  })
  it('usato da me è gia-tuo', async () => {
    invito(t(1), { status: 'usato', usedBy: 'u2' })
    expect(await leggiInvitoPer(db(), chi, t(1), adesso)).toEqual({ stato: 'gia-tuo', salone: 'Bauci', ruolo: 'collaboratore' })
  })
  it('usato da altri o rifiutato è non-valido', async () => {
    invito(t(1), { status: 'usato', usedBy: 'u9' })
    invito(t(2), { status: 'rifiutato' })
    for (const token of [t(1), t(2)]) {
      expect(await leggiInvitoPer(db(), chi, token, adesso)).toEqual({ stato: 'non-valido', salone: '', ruolo: null })
    }
  })
  it('scaduto', async () => {
    invito(t(1), { expiresAt: PASSATA })
    expect((await leggiInvitoPer(db(), chi, t(1), adesso)).stato).toBe('scaduto')
  })
  it('email diversa non rivela nulla', async () => {
    invito(t(1))
    expect(await leggiInvitoPer(db(), { uid: 'u3', email: 'altro@test.it' }, t(1), adesso)).toEqual({ stato: 'altra-email', salone: '', ruolo: null })
  })
  it('le maiuscole dell’email non contano', async () => {
    invito(t(1), { email: 'ANNA@test.IT' })
    expect((await leggiInvitoPer(db(), { uid: 'u2', email: ' anna@TEST.it ' }, t(1), adesso)).stato).toBe('aperto')
  })
  it('token malformato o inesistente è non-valido', async () => {
    expect((await leggiInvitoPer(db(), chi, 'abc', adesso)).stato).toBe('non-valido')
    expect(await leggiInvitoPer(db(), chi, t(7), adesso)).toEqual({ stato: 'non-valido', salone: '', ruolo: null })
  })
  it('senza nome del salone restituisce stringa vuota', async () => {
    archivio.delete('salons/tit/settings/main')
    invito(t(1))
    expect(await leggiInvitoPer(db(), chi, t(1), adesso)).toEqual({ stato: 'aperto', salone: '', ruolo: 'collaboratore' })
  })
})

describe('rifiutaInvitoPer', () => {
  it('chiude l’invito e libera il posto', async () => {
    invito(t(1))
    expect(await rifiutaInvitoPer(db(), chi, t(1), adesso)).toEqual({ ok: true })
    expect(archivio.get(`invites/${t(1)}`)).toMatchObject({ status: 'rifiutato', rifiutatoIl: adesso.toISOString() })
    expect(archivio.get('salons/tit/pro/main')).toEqual({ openInviteExpiries: [FUTURA2] })
    expect(await rifiutaInvitoPer(db(), chi, t(1), adesso)).toEqual({ ok: false, message: 'Invito non valido' })
  })
  it('con un’altra email non scrive', async () => {
    invito(t(1))
    expect(await rifiutaInvitoPer(db(), { uid: 'u3', email: 'altro@test.it' }, t(1), adesso)).toEqual({ ok: false, message: 'Invito non valido' })
    expect(stato.scritture).toBe(0)
  })
  it('un invito scaduto non si rifiuta', async () => {
    invito(t(1), { expiresAt: PASSATA })
    expect((await rifiutaInvitoPer(db(), chi, t(1), adesso)).ok).toBe(false)
    expect(stato.scritture).toBe(0)
  })
})

describe('invitiInSospesoPer e annullaInvitoPer', () => {
  beforeEach(() => {
    archivio.set('accounts/tit', { salonId: 'tit', role: 'titolare' })
    archivio.set('accounts/soc', { salonId: 'tit', role: 'socio' })
    archivio.set('accounts/col', { salonId: 'tit', role: 'collaboratore' })
  })

  it('titolare e socio vedono solo gli aperti non scaduti del proprio salone', async () => {
    invito(t(1))
    invito(t(2), { expiresAt: FUTURA2, email: 'b@test.it', role: 'socio' })
    invito(t(3), { status: 'usato', usedBy: 'x' })
    invito(t(4), { expiresAt: PASSATA })
    invito(t(5), { salonId: 'altro' })
    const atteso = {
      ok: true,
      inviti: [
        { id: idInvito(t(2)), email: 'b@test.it', ruolo: 'socio', scade: FUTURA2 },
        { id: idInvito(t(1)), email: 'anna@test.it', ruolo: 'collaboratore', scade: FUTURA },
      ],
    }
    expect(await invitiInSospesoPer(db(), 'tit', adesso)).toEqual(atteso)
    expect(await invitiInSospesoPer(db(), 'soc', adesso)).toEqual(atteso)
    expect(JSON.stringify(atteso)).not.toContain(t(1))
  })
  it('il collaboratore e chi non ha account sono negati', async () => {
    expect(await invitiInSospesoPer(db(), 'col', adesso)).toEqual({ ok: false, message: 'Accesso negato' })
    expect(await invitiInSospesoPer(db(), 'nessuno', adesso)).toEqual({ ok: false, message: 'Accesso negato' })
    expect(await annullaInvitoPer(db(), 'col', 'x', adesso)).toEqual({ ok: false, message: 'Accesso negato' })
  })
  it('annulla un invito aperto', async () => {
    invito(t(1))
    expect(await annullaInvitoPer(db(), 'tit', idInvito(t(1)), adesso)).toEqual({ ok: true })
    expect(archivio.has(`invites/${t(1)}`)).toBe(false)
    expect(archivio.get('salons/tit/pro/main')).toEqual({ openInviteExpiries: [FUTURA2] })
  })
  it('un invito diventato usato non si annulla', async () => {
    invito(t(1), { status: 'usato', usedBy: 'u2' })
    expect(await annullaInvitoPer(db(), 'tit', idInvito(t(1)), adesso)).toEqual({ ok: false, message: 'Invito non più in sospeso' })
    expect(archivio.has(`invites/${t(1)}`)).toBe(true)
    expect(archivio.get('salons/tit/pro/main')).toEqual({ openInviteExpiries: [FUTURA, FUTURA2] })
  })
  it('un invito di un altro salone non si annulla', async () => {
    invito(t(5), { salonId: 'altro' })
    expect(await annullaInvitoPer(db(), 'tit', idInvito(t(5)), adesso)).toEqual({ ok: false, message: 'Invito non più in sospeso' })
    expect(archivio.has(`invites/${t(5)}`)).toBe(true)
  })
})

describe('avviso d’uscita', () => {
  it('si scrive in transazione e si segna come letto', async () => {
    const d = db()
    await d.runTransaction(async (tx: Transaction) => {
      scriviAvvisoUscita(tx, d, 'u2', 'Bauci', adesso)
    })
    expect(archivio.get('salons/u2/avvisi/uscita')).toEqual({ salone: 'Bauci', quando: adesso.toISOString(), letto: false })
    await segnaAvvisoUscitaPer(d, 'u2')
    expect(archivio.get('salons/u2/avvisi/uscita')).toEqual({ salone: 'Bauci', quando: adesso.toISOString(), letto: true })
  })
})
