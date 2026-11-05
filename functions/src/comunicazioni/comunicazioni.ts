import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { TESTO_MAX, TIPI_AVVISO, TITOLO_MAX, testoPerLingua, type TipoAvviso, type Traduzioni } from '../../../src/lib/avvisiSistema'
import { TETTO_EMAIL_GIORNO } from '../../../src/lib/promemoriaEmail'
import { operatoreAutorizzato } from '../../../src/lib/salonPath'
import { controllaAccessoRecente } from '../accessoRecente'
import { postBrevoHtml } from '../brevoMail'
import { riservaAvviso, traduzioniValide } from '../config/avvisiSistema'
import { scriviAvvisoAccount } from '../config/avvisiAccount'
import { erroreServer } from '../erroriServer'
import { emailOggi, liberaEmail, margineConsole, prenotaEmail } from '../postaGiorno'
import { archivioPromo } from '../promo/consensoPromo'
import { inviaPromo } from '../promo/inviaPromo'
import { selezionaDestinatari, type Destinatario } from './destinatari'
import { emailConsole } from './emailConsole'

export type TipoEmailComunicazione = 'nessuna' | 'promozionale' | 'servizio'
type Posta = (to: string, oggetto: string, html: string, headers?: Record<string, string>) => Promise<void>
type Testo = { titolo: string; testo: string; traduzioni?: Traduzioni }

type Comunicazione = {
  tipo: TipoAvviso
  salonIds: string[] | 'tutti'
  testo: Testo
  email: TipoEmailComunicazione
  idRichiesta: string
}

const EMAIL: readonly TipoEmailComunicazione[] = ['nessuna', 'promozionale', 'servizio']
const GRUPPO_EMAIL = 10
const GRUPPO_AVVISI = 50
const ID_MAX = 64
// Quanto vale il segno «invio in corso»: un po' più del tempo massimo della function, così un invio morto si può riprendere.
const IN_CORSO_MS = 330_000

function richiediAdmin(admin: boolean | undefined): void {
  if (!operatoreAutorizzato({ admin })) throw erroreServer('failed-precondition', 'accesso_negato')
}

function valida(condizione: boolean): void {
  if (!condizione) throw erroreServer('invalid-argument', 'richiesta_non_valida')
}

function oggetto(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function salonIdsDi(value: unknown): string[] | 'tutti' {
  if (value === 'tutti') return value
  valida(Array.isArray(value) && value.length > 0 && value.every((id) => typeof id === 'string' && id !== '' && !id.includes('/')))
  return value as string[]
}

function testoDi(value: unknown, obbligatorio: boolean): Testo {
  const testi = oggetto(value)
  const it = oggetto(testi.it)
  const titolo = typeof it.titolo === 'string' ? it.titolo.trim() : ''
  const testo = typeof it.testo === 'string' ? it.testo.trim() : ''
  valida(titolo.length <= TITOLO_MAX && testo.length <= TESTO_MAX && (!obbligatorio || titolo !== ''))
  const { it: _it, ...altre } = testi
  const traduzioni = traduzioniValide(altre)
  return { titolo, testo, ...(traduzioni ? { traduzioni } : {}) }
}

function comunicazioneDi(value: unknown): Comunicazione {
  const dati = oggetto(value)
  valida(TIPI_AVVISO.includes(dati.tipo as TipoAvviso) && EMAIL.includes(dati.email as TipoEmailComunicazione))
  const id = dati.idRichiesta
  valida(typeof id === 'string' && id !== '' && id.length <= ID_MAX && !id.includes('/'))
  return { tipo: dati.tipo as TipoAvviso, salonIds: salonIdsDi(dati.salonIds), testo: testoDi(dati.testi, true), email: dati.email as TipoEmailComunicazione, idRichiesta: id as string }
}

function ricevonoEmail(tipo: TipoEmailComunicazione, titolari: readonly Destinatario[]): Destinatario[] {
  if (tipo === 'nessuna') return []
  return tipo === 'promozionale' ? titolari.filter((t) => t.consenso) : [...titolari]
}

export async function anteprimaComunicazionePer(input: { admin?: boolean; dati: unknown; adesso?: Date }) {
  richiediAdmin(input.admin)
  const db = getFirestore()
  const dati = oggetto(input.dati)
  const tipo = EMAIL.find((e) => e === dati.email) ?? 'nessuna'
  const testo = testoDi(dati.testi, false)
  const { account, titolari } = await selezionaDestinatari(db, salonIdsDi(dati.salonIds))
  const email = ricevonoEmail(tipo, titolari).length
  const usate = await emailOggi(db, input.adesso ?? new Date())
  const massimo = margineConsole(usate)
  return {
    account: account.length,
    email,
    inItaliano: account.filter((a) => a.lingua !== 'it' && !testo.traduzioni?.[a.lingua]).length,
    senzaConsenso: tipo === 'promozionale' ? titolari.length - email : 0,
    restanoOggi: Math.max(0, TETTO_EMAIL_GIORNO - usate),
    massimo,
    bloccata: email > massimo,
  }
}

function postaBrevo(apiKey: string | undefined): Posta {
  return (to, oggettoMail, html, headers) => postBrevoHtml(apiKey ?? '', to, oggettoMail, html, fetch, { email: 'info@groomlyapp.it', name: 'Groomly' }, headers)
}

/** Manda a gruppi e segna chi ha ricevuto: una ripresa salta chi è già in `invii`. */
async function mandaEmail(db: Firestore, id: string, tipo: TipoEmailComunicazione, testo: Testo, destinatari: readonly Destinatario[], posta: Posta, apiKey: string | undefined, adesso: Date): Promise<number> {
  let inviate = 0
  const archivio = archivioPromo(db)
  for (let i = 0; i < destinatari.length; i += GRUPPO_EMAIL) {
    await Promise.all(destinatari.slice(i, i + GRUPPO_EMAIL).map(async (d) => {
      const { titolo, testo: corpo } = testoPerLingua(testo, d.lingua)
      const html = emailConsole({ titolo, testo: corpo })
      try {
        if (tipo === 'promozionale') {
          const esito = await inviaPromo({ uid: d.uid, oggetto: titolo, html, apiKey: apiKey ?? '' }, archivio, posta)
          if (esito !== 'inviata') return
        } else {
          await posta(d.email, titolo, html)
        }
      } catch {
        return
      }
      await db.doc(`comunicazioni/${id}/invii/${d.uid}`).set({ esito: 'inviata', quando: adesso.toISOString() })
      inviate += 1
    }))
  }
  return inviate
}

async function scriviAvvisi(db: Firestore, c: Comunicazione, account: readonly Destinatario[]): Promise<void> {
  const avviso = { tipo: c.tipo, titolo: c.testo.titolo, testo: c.testo.testo, ...(c.testo.traduzioni ? { traduzioni: c.testo.traduzioni } : {}) }
  if (c.salonIds === 'tutti') {
    await db.doc(`avvisiSistema/${c.idRichiesta}`).set({ ...avviso, creato: FieldValue.serverTimestamp() })
    return
  }
  for (let i = 0; i < account.length; i += GRUPPO_AVVISI) {
    await Promise.all(account.slice(i, i + GRUPPO_AVVISI).map((a) => (
      scriviAvvisoAccount(db, a.uid, { ...avviso, origine: 'comunicazione', comunicazioneId: c.idRichiesta }, c.idRichiesta)
    )))
  }
}

export async function inviaComunicazionePer(input: {
  admin?: boolean
  adminUid: string
  authTime: unknown
  dati: unknown
  apiKey?: string
  posta?: Posta
  adesso?: Date
}): Promise<{ id: string; inviate: number; nonInviate: number }> {
  richiediAdmin(input.admin)
  const adesso = input.adesso ?? new Date()
  const c = comunicazioneDi(input.dati)
  if (c.salonIds === 'tutti') controllaAccessoRecente(input.authTime, adesso.getTime())
  const db = getFirestore()
  const ref = db.doc(`comunicazioni/${c.idRichiesta}`)
  // In transazione: due richieste con lo stesso id non possono partire entrambe.
  const esistente = await db.runTransaction(async (tx) => {
    const dati = (await tx.get(ref)).data()
    if (dati) return dati
    tx.set(ref, { quando: adesso.toISOString(), email: 0, inviate: 0, uids: [], eliminata: false, inCorsoFino: adesso.getTime() + IN_CORSO_MS })
    return null
  })
  if (esistente) return { id: c.idRichiesta, inviate: esistente.inviate as number, nonInviate: (esistente.email as number) - (esistente.inviate as number) }
  const riservata = async (): Promise<Destinatario[][]> => {
    if (!await riservaAvviso(input.adminUid, db, adesso.getTime())) throw erroreServer('resource-exhausted', 'troppe_richieste')
    const { account: tutti, titolari } = await selezionaDestinatari(db, c.salonIds)
    const scelti = ricevonoEmail(c.email, titolari)
    if (!await prenotaEmail(db, adesso, scelti.length)) throw erroreServer('failed-precondition', 'email_limite')
    return [tutti, scelti]
  }
  const [account, destinatari] = await riservata().catch(async (error: unknown) => {
    await ref.delete()
    throw error
  })

  await ref.set({
    tipo: c.tipo,
    testo: c.testo,
    salonIds: c.salonIds,
    emailTipo: c.email,
    uids: [...new Set([...account, ...destinatari].map((d) => d.uid))],
    account: account.length,
    email: destinatari.length,
  }, { merge: true })
  await scriviAvvisi(db, c, account)
  const inviate = await mandaEmail(db, c.idRichiesta, c.email, c.testo, destinatari, input.posta ?? postaBrevo(input.apiKey), input.apiKey, adesso)
  await liberaEmail(db, adesso, destinatari.length - inviate)
  await ref.set({ inviate, inCorsoFino: null }, { merge: true })
  return { id: c.idRichiesta, inviate, nonInviate: destinatari.length - inviate }
}

export async function riprendiComunicazionePer(input: {
  admin?: boolean
  adminUid: string
  id: unknown
  apiKey?: string
  posta?: Posta
  adesso?: Date
}): Promise<{ id: string; inviate: number; nonInviate: number }> {
  richiediAdmin(input.admin)
  valida(typeof input.id === 'string' && input.id !== '' && !input.id.includes('/'))
  const id = input.id as string
  const adesso = input.adesso ?? new Date()
  const db = getFirestore()
  const ref = db.doc(`comunicazioni/${id}`)
  const doc = (await ref.get()).data()
  valida(doc !== undefined && doc.eliminata !== true)
  const dati = doc as Record<string, unknown>
  if (typeof dati.inCorsoFino === 'number' && dati.inCorsoFino > adesso.getTime()) throw erroreServer('failed-precondition', 'invio_in_corso')
  const tipo = dati.emailTipo as TipoEmailComunicazione
  const partite = new Set((await ref.collection('invii').get()).docs.map((invio) => invio.id))
  const previsti = new Set(dati.uids as string[])
  const { titolari } = await selezionaDestinatari(db, dati.salonIds as string[] | 'tutti')
  const mancanti = ricevonoEmail(tipo, titolari).filter((d) => previsti.has(d.uid) && !partite.has(d.uid))
  if (mancanti.length > 0 && !await riservaAvviso(input.adminUid, db, adesso.getTime())) throw erroreServer('resource-exhausted', 'troppe_richieste')
  if (!await prenotaEmail(db, adesso, mancanti.length)) throw erroreServer('failed-precondition', 'email_limite')
  await ref.set({ inCorsoFino: adesso.getTime() + IN_CORSO_MS }, { merge: true })
  const nuove = await mandaEmail(db, id, tipo, dati.testo as Testo, mancanti, input.posta ?? postaBrevo(input.apiKey), input.apiKey, adesso)
  await liberaEmail(db, adesso, mancanti.length - nuove)
  const inviate = partite.size + nuove
  await ref.set({ inviate, inCorsoFino: null }, { merge: true })
  return { id, inviate, nonInviate: mancanti.length - nuove }
}

/** Toglie l'avviso a chi l'ha ricevuto; le email partite restano partite e la riga resta nello storico. */
export async function eliminaComunicazionePer(input: { admin?: boolean; id: unknown }): Promise<{ ok: true }> {
  richiediAdmin(input.admin)
  valida(typeof input.id === 'string' && input.id !== '' && !input.id.includes('/'))
  const id = input.id as string
  const db = getFirestore()
  const ref = db.doc(`comunicazioni/${id}`)
  const dati = (await ref.get()).data()
  valida(dati !== undefined)
  if (dati?.salonIds === 'tutti') {
    await db.doc(`avvisiSistema/${id}`).delete()
  } else {
    const uids = dati?.uids as string[]
    for (let i = 0; i < uids.length; i += GRUPPO_AVVISI) {
      await Promise.all(uids.slice(i, i + GRUPPO_AVVISI).map((uid) => db.doc(`accounts/${uid}/avvisi/${id}`).delete()))
    }
  }
  await ref.set({ eliminata: true }, { merge: true })
  return { ok: true }
}
