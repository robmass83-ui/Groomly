import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { linguaValida } from '../../../src/i18n/lingua'
import { scegliCatalogo } from '../../../src/lib/catalogoPrenotazione'
import { emailValida } from '../../../src/lib/codaEmail'
import { decisioneAntispam } from '../../../src/lib/disponibilita'
import { settimanaValida, type IscrittoAttesa, type SpecieAttesa, type TagliaAttesa } from '../../../src/lib/listaAttesa'
import { contaAperte } from '../../../src/lib/prenotazione'
import { idValido } from './gestisciPrenotazione'
import type { ProMain } from '../../../src/lib/piano'
import { listaAttesaAccesa } from './inviaCoda'
import { riservaMittente } from './mittente'
import { catalogoDelSalone } from './paginaPubblica'

const SPECIE: readonly SpecieAttesa[] = ['cane', 'gatto', 'altro']
const TAGLIE: readonly TagliaAttesa[] = ['piccola', 'media', 'grande']
const MAX_TESTO = 200
const GIORNI_TETTO = 60

export type EsitoIscrizione =
  | { ok: true, iscrittoId: string, giaInLista?: true }
  | { ok: false, errore: 'spento' | 'consenso' | 'dati' | 'tante' }

function giornoDiRoma(quando: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(quando)
}

function pulito(valore: unknown): string {
  return typeof valore === 'string' ? valore.trim() : ''
}

/**
 * Dal sito pubblico: il cliente si mette in lista. Si scrive solo il documento dell'iscritto, senza login:
 * niente offerta, niente visita, niente cane, niente mail. Durata e nome del trattamento vengono dal listino del salone,
 * non da quello che manda il browser.
 */
export async function iscrivitiAttesaPer(input: {
  salonId: string
  nome: string
  phone: string
  email: string
  nomeCane: string
  specie: SpecieAttesa
  taglia: TagliaAttesa
  servizioIds: readonly string[]
  consenso: boolean
  /** La settimana scelta sulla pagina; se manca o non è valida si iscrive lo stesso, senza. */
  settimana?: unknown
  /** La lingua in cui il cliente ha visto la pagina: la mail del posto libero la segue. */
  lingua?: unknown
  /** Il campo nascosto del modulo: se un robot lo riempie, si risponde ok e non si scrive. */
  esca?: string
  /** Impronta della connessione (`mittenteDi`); vuota quando l’indirizzo non si legge. */
  mittente?: string
  adesso: Date
}, db: Firestore = getFirestore()): Promise<EsitoIscrizione> {
  if (pulito(input.esca) !== '') return { ok: true, iscrittoId: '' }
  if (input.consenso !== true) return { ok: false, errore: 'consenso' }
  if (!idValido(input.salonId)) return { ok: false, errore: 'dati' }
  const base = `salons/${input.salonId}`

  const settings = (await db.doc(`${base}/settings/main`).get()).data() ?? {}
  const pro = (await db.doc(`${base}/pro/main`).get()).data() as ProMain | undefined
  if (!listaAttesaAccesa(settings.serviziEmail, pro, input.adesso)) return { ok: false, errore: 'spento' }

  const nome = pulito(input.nome)
  const phone = pulito(input.phone)
  const email = pulito(input.email)
  const nomeCane = pulito(input.nomeCane)
  const campi = [nome, phone, email, nomeCane]
  if (campi.some((campo) => campo === '' || campo.length > MAX_TESTO) || !emailValida(email)) return { ok: false, errore: 'dati' }
  if (!SPECIE.includes(input.specie) || !TAGLIE.includes(input.taglia)) return { ok: false, errore: 'dati' }
  if (!Array.isArray(input.servizioIds) || input.servizioIds.some((id) => typeof id !== 'string')) return { ok: false, errore: 'dati' }

  const scelta = scegliCatalogo(await catalogoDelSalone(input.salonId, db), input.servizioIds, input.taglia)
  const principale = scelta?.voci.find((voce) => voce.kind === 'principale')
  if (!scelta || !principale || principale.nome === '' || !(scelta.durataMin > 0)) return { ok: false, errore: 'dati' }

  // Il tetto per connessione vale per ogni invio, anche per chi è già in lista: così email e nome del cane non si provano senza limite.
  const mittente = input.mittente ?? ''
  try {
    await riservaMittente(mittente, db, input.adesso.getTime())
  } catch {
    return { ok: false, errore: 'tante' }
  }

  // Una settimana già finita non si sceglie: il cliente resterebbe in lista senza ricevere più offerte.
  const oggi = giornoDiRoma(input.adesso)
  const richiesta = settimanaValida(input.settimana)
  const settimanaNuova = richiesta && richiesta.fine >= oggi ? richiesta : null

  // Si contano solo gli iscritti ancora in lista. Poi valgono i tetti delle prenotazioni: 2 per email, 2 per cellulare, 20 per salone.
  const attive = (await db.collection(`${base}/attesa`).get()).docs
    .map((doc) => ({ id: doc.id, data: doc.data() ?? {} }))
    .filter((riga) => riga.data.attivo !== false)
  const minuscola = email.toLowerCase()
  const gia = attive.find((riga) => (
    pulito(riga.data.email).toLowerCase() === minuscola && pulito(riga.data.nomeCane) === nomeCane && pulito(riga.data.servizioId) === principale.id
  ))
  if (gia) {
    // Email e nome del cane non provano chi scrive: li può conoscere chiunque. L'iscrizione cambia solo dalla stessa connessione
    // da cui è nata; due mittenti vuoti non contano. Altrimenti non si tocca nulla e la pagina dice di scrivere al salone.
    const stessaConnessione = mittente !== '' && pulito(gia.data.mittente) === mittente
    // Chi si riscrive aggiorna la settimana: una nuova vale al posto della vecchia, nessuna (o non valida) vuol dire «qualunque giorno».
    const nuova = settimanaNuova
    const vecchia = settimanaValida(gia.data.settimana)
    const uguale = nuova ? vecchia?.inizio === nuova.inizio && vecchia.fine === nuova.fine : gia.data.settimana === undefined
    const lingua = linguaValida(input.lingua)
    const altraLingua = lingua !== null && lingua !== gia.data.lingua
    if (!stessaConnessione) {
      // Un invio identico non cambia nulla: basta «sei in lista». Una modifica rifiutata lo dice, senza id.
      return !uguale || altraLingua ? { ok: true, iscrittoId: '', giaInLista: true } : { ok: true, iscrittoId: '' }
    }
    if (!uguale || altraLingua) {
      await db.doc(`${base}/attesa/${gia.id}`).update({
        ...(uguale ? {} : { settimana: nuova ?? FieldValue.delete() }),
        ...(altraLingua ? { lingua } : {}),
      })
    }
    return { ok: true, iscrittoId: gia.id }
  }
  // La lista non scade: nel tetto contano solo le iscrizioni recenti, altrimenti 20 iscritti vecchi la chiudono per sempre.
  const dal = input.adesso.getTime() - GIORNI_TETTO * 86_400_000
  const recenti = attive.filter((riga) => {
    const creato = Date.parse(pulito(riga.data.creatoIl))
    return !Number.isFinite(creato) || creato >= dal
  })
  const conti = contaAperte(recenti.map((riga) => riga.data), phone, email, mittente)
  const antispam = decisioneAntispam({
    aperteTelefono: conti.aperteTelefono,
    aperteMittente: conti.aperteMittente,
    aperteSalone: conti.aperteSalone,
    esca: '',
  })
  if (conti.aperteEmail >= 2 || !antispam.ok) return { ok: false, errore: 'tante' }

  const ref = db.collection(`${base}/attesa`).doc()
  const settimana = settimanaNuova
  const lingua = linguaValida(input.lingua)
  const iscritto: Omit<IscrittoAttesa, 'id'> & { attivo: true } = {
    nome,
    phone,
    email,
    nomeCane,
    specie: input.specie,
    taglia: input.taglia,
    servizioId: principale.id,
    trattamento: principale.nome,
    durataMin: scelta.durataMin,
    creatoIl: input.adesso.toISOString(),
    attivo: true,
    ...(settimana ? { settimana } : {}),
  }
  await ref.set({ ...iscritto, ...(mittente ? { mittente } : {}), ...(lingua ? { lingua } : {}) })
  return { ok: true, iscrittoId: ref.id }
}
