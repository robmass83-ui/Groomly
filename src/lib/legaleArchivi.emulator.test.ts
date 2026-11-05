import { deleteApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { archivioAccettazione, registraAccettazionePer } from '../../functions/src/legale/registraAccettazione'
import { archivioDaDb, chiaveEmail, impostaEmailClientePer, silenzioEmailPer } from '../../functions/src/piano/silenzioEmail'
import { archivioPromo, disiscriviPromoPer, impostaEmailPromoPer } from '../../functions/src/promo/consensoPromo'
import { inviaPromo } from '../../functions/src/promo/inviaPromo'
import { VERSIONE_DOCUMENTI } from './versioneLegale'

// Saloni finti su Firestore dell'emulatore: controlla le letture e scritture vere degli archivi.
const SALONE = 'salone-finto-legale'
const UID = 'utente-finto-legale'
const TOKEN = 'a'.repeat(32)
const TOKEN_OFFERTA = 'c'.repeat(64)
let db: Firestore

describe('archivi su Firestore', () => {
  beforeAll(async () => {
    const app = initializeApp({ projectId: 'demo-groomly' }, 'legale-archivi')
    db = getFirestore(app)
    await db.doc(`salons/${SALONE}/dogs/d1`).set({ name: 'Rex', contact: { email: 'Ada@Cliente.it' } })
    await db.doc(`salons/${SALONE}/dogs/d2`).set({ name: 'Bobi', contact: { email: ' ada@cliente.it ' } })
    await db.doc(`salons/${SALONE}/dogs/d3`).set({ name: 'Altro', contact: { email: 'altra@cliente.it' } })
    await db.doc(`salons/${SALONE}/coda/r1`).set({ token: TOKEN, dogId: 'd1', email: 'ada@cliente.it', tipo: 'promemoria', stato: 'in_coda', evento: 'e1' })
    await db.doc(`salons/${SALONE}/coda/r2`).set({ dogId: 'd2', email: 'ada@cliente.it', tipo: 'auguri', stato: 'in_coda', evento: 'e2' })
    await db.doc(`salons/${SALONE}/attesa/i1`).set({ email: 'iscritta@cliente.it' })
    await db.doc(`salons/${SALONE}/offerteAttesa/o1`).set({ token: TOKEN_OFFERTA, iscrittoId: 'i1' })
    await db.doc(`accounts/${UID}`).set({ email: 'titolare@finto.it', lingua: 'it', salonId: UID })
  })

  afterAll(async () => {
    await db.recursiveDelete(db.doc(`salons/${SALONE}`))
    await db.recursiveDelete(db.doc(`accounts/${UID}`))
    await Promise.all(getApps().map((app) => deleteApp(app)))
  })

  it('il link blocca l’indirizzo, tutti i suoi cani e le righe in coda', async () => {
    await silenzioEmailPer({ salonId: SALONE, token: TOKEN }, archivioDaDb(db))
    expect((await db.doc(`salons/${SALONE}/emailBloccate/${chiaveEmail('ada@cliente.it')}`).get()).get('fonte')).toBe('link')
    expect((await db.doc(`salons/${SALONE}/dogs/d1`).get()).get('emailBloccata')).toBe(true)
    expect((await db.doc(`salons/${SALONE}/dogs/d2`).get()).get('emailBloccata')).toBe(true)
    expect((await db.doc(`salons/${SALONE}/dogs/d3`).get()).get('emailBloccata')).toBeUndefined()
    expect((await db.doc(`salons/${SALONE}/coda/r2`).get()).get('stato')).toBe('fermata')
  })

  it('il salone non riaccende dopo il link del cliente', async () => {
    await expect(impostaEmailClientePer({ salonId: SALONE, ruolo: 'titolare', dogId: 'd2', bloccata: false }, archivioDaDb(db)))
      .rejects.toMatchObject({ code: 'failed-precondition' })
    expect((await db.doc(`salons/${SALONE}/dogs/d1`).get()).get('emailBloccata')).toBe(true)
  })

  it('un blocco messo dalla scheda si riaccende per tutti i cani', async () => {
    await db.doc(`salons/${SALONE}/emailBloccate/${chiaveEmail('ada@cliente.it')}`).delete()
    await impostaEmailClientePer({ salonId: SALONE, ruolo: 'titolare', dogId: 'd2', bloccata: true }, archivioDaDb(db))
    await impostaEmailClientePer({ salonId: SALONE, ruolo: 'titolare', dogId: 'd2', bloccata: false }, archivioDaDb(db))
    expect((await db.doc(`salons/${SALONE}/emailBloccate/${chiaveEmail('ada@cliente.it')}`).get()).exists).toBe(false)
    expect((await db.doc(`salons/${SALONE}/dogs/d1`).get()).get('emailBloccata')).toBe(false)
  })

  it('il token di un’offerta blocca l’iscritta', async () => {
    await silenzioEmailPer({ salonId: SALONE, token: TOKEN_OFFERTA }, archivioDaDb(db))
    expect((await db.doc(`salons/${SALONE}/emailBloccate/${chiaveEmail('iscritta@cliente.it')}`).get()).exists).toBe(true)
  })

  it('l’accettazione scrive account e registro', async () => {
    const adesso = new Date('2026-11-05T10:00:00.000Z')
    await registraAccettazionePer({ uid: UID, versione: VERSIONE_DOCUMENTI, appVersione: '1', role: 'titolare' }, archivioAccettazione(db), adesso)
    expect((await db.doc(`accounts/${UID}`).get()).get('termini')).toMatchObject({ suServer: true, at: adesso.toISOString() })
    expect((await db.doc(`accounts/${UID}/registro/documenti-${VERSIONE_DOCUMENTI}`).get()).exists).toBe(true)
  })

  it('consenso, invio e disiscrizione lavorano sullo stesso account', async () => {
    const archivio = archivioPromo(db)
    const adesso = new Date()
    await impostaEmailPromoPer({ uid: UID, attivo: true, fonte: 'tour' }, archivio, adesso)
    const inviate: string[] = []
    const esito = await inviaPromo({ uid: UID, oggetto: 'o', html: 'x', apiKey: 'k' }, archivio, async (_to, _o, html) => { inviate.push(html) })
    expect(esito).toBe('inviata')
    const token = (await db.doc(`accounts/${UID}`).get()).get('emailPromo').token as string
    expect(inviate[0]).toContain(token)
    await disiscriviPromoPer({ uid: UID, token }, archivio, adesso)
    expect((await db.doc(`accounts/${UID}`).get()).get('emailPromo').attivo).toBe(false)
    expect((await db.collection(`accounts/${UID}/registro`).get()).size).toBe(3)
  })
})
