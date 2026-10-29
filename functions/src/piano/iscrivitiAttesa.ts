import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { scegliCatalogo } from '../../../src/lib/catalogoPrenotazione'
import { emailValida } from '../../../src/lib/codaEmail'
import { decisioneAntispam } from '../../../src/lib/disponibilita'
import type { IscrittoAttesa, SpecieAttesa, TagliaAttesa } from '../../../src/lib/listaAttesa'
import { contaAperte } from '../../../src/lib/prenotazione'
import { idValido } from './gestisciPrenotazione'
import { serviziAccesi } from './inviaCoda'
import { catalogoDelSalone } from './paginaPubblica'

const SPECIE: readonly SpecieAttesa[] = ['cane', 'gatto', 'altro']
const TAGLIE: readonly TagliaAttesa[] = ['piccola', 'media', 'grande']
const MAX_TESTO = 200

export type EsitoIscrizione =
  | { ok: true, iscrittoId: string }
  | { ok: false, errore: 'spento' | 'consenso' | 'dati' | 'tante' }

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
  /** Il campo nascosto del modulo: se un robot lo riempie, si risponde ok e non si scrive. */
  esca?: string
  adesso: Date
}, db: Firestore = getFirestore()): Promise<EsitoIscrizione> {
  if (pulito(input.esca) !== '') return { ok: true, iscrittoId: '' }
  if (input.consenso !== true) return { ok: false, errore: 'consenso' }
  if (!idValido(input.salonId)) return { ok: false, errore: 'dati' }
  const base = `salons/${input.salonId}`

  const settings = (await db.doc(`${base}/settings/main`).get()).data() ?? {}
  if (!serviziAccesi(settings.serviziEmail).includes('attesa')) return { ok: false, errore: 'spento' }

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

  // Si contano solo gli iscritti ancora in lista. Chi è già iscritto con lo stesso cane e lo stesso servizio ritrova il suo id:
  // un nuovo invio dello stesso modulo non è «tante». Poi valgono i tetti delle prenotazioni: 2 per email, 2 per cellulare, 20 per salone.
  const attive = (await db.collection(`${base}/attesa`).get()).docs
    .map((doc) => ({ id: doc.id, data: doc.data() ?? {} }))
    .filter((riga) => riga.data.attivo !== false)
  const minuscola = email.toLowerCase()
  const gia = attive.find((riga) => (
    pulito(riga.data.email).toLowerCase() === minuscola && pulito(riga.data.nomeCane) === nomeCane && pulito(riga.data.servizioId) === principale.id
  ))
  if (gia) return { ok: true, iscrittoId: gia.id }
  const conti = contaAperte(attive.map((riga) => riga.data), phone, email)
  const antispam = decisioneAntispam({ aperteTelefono: conti.aperteTelefono, aperteSalone: conti.aperteSalone, esca: '' })
  if (conti.aperteEmail >= 2 || !antispam.ok) return { ok: false, errore: 'tante' }

  const ref = db.collection(`${base}/attesa`).doc()
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
  }
  await ref.set(iscritto)
  return { ok: true, iscrittoId: ref.id }
}
