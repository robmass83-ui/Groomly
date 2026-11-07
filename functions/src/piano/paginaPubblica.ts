import { linguaPagina } from '../../../src/i18n/paginaPubblica'
import { nomeServizioVisibile } from '../../../src/i18n/servizioVisibile'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import type { Request, Response } from 'express'
import { pubblicabile, type VoceCatalogo, type TagliaPrenotazione } from '../../../src/lib/catalogoPrenotazione'
import { prenotazioniConcesse } from '../../../src/lib/funzioniPiano'
import { byteDelThumb, idFileLogo, logoDaThumb } from '../../../src/lib/logoPubblico'
import { htmlPaginaAssente, htmlPaginaPubblica, paginaCompleta, testoOrari } from '../../../src/lib/paginaPubblica'
import { paginaPrenotabile, prenotazioneAccesa, specieAccettate } from '../../../src/lib/prenotazionePubblica'
import type { ProMain } from '../../../src/lib/piano'
import { profiloPubblico } from '../../../src/lib/slug'
import { linguaCliente } from '../postaHtml'
import { listaAttesaAccesa } from './inviaCoda'

function testo(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function paginaPubblicaHttp(req: Request, res: Response): Promise<void> {
  const pezzi = (req.path || '').split('/').filter(Boolean)
  const slug = pezzi[pezzi.length - 1] ?? ''
  const chiesta = typeof req.query.lang === 'string' ? req.query.lang : ''
  // Senza salone non c’è una lingua sua: resta il browser di chi ha aperto il link.
  const langAssente = linguaPagina(chiesta, (req.get('accept-language') ?? '').split(',')[0])
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
    res.status(404).set('Cache-Control', 'no-cache').set('Content-Type', 'text/html; charset=utf-8').send(htmlPaginaAssente(langAssente))
    return
  }
  const db = getFirestore()
  const pub = (await db.doc(`pubblici/${slug}`).get()).data()
  const salonId = testo(pub?.salonId)
  if (!pub || salonId === '' || salonId === 'shared') {
    res.status(404).set('Cache-Control', 'no-cache').set('Content-Type', 'text/html; charset=utf-8').send(htmlPaginaAssente(langAssente))
    return
  }
  const settings = (await db.doc(`salons/${salonId}/settings/main`).get()).data() ?? {}
  const lang = linguaCliente(chiesta, settings.linguaClienti)
  const business = settings.business && typeof settings.business === 'object' ? settings.business as Record<string, unknown> : {}
  const profilo = profiloPubblico({
    nome: testo(business.salonName) || testo(pub.nome) || slug,
    telefono: testo(business.phone),
    indirizzo: testo(business.address),
    vat: testo(business.vatNumber),
    tax: testo(business.taxCode),
    mostraDatiFiscali: business.mostraDatiFiscali === true,
  })
  const pro = (await db.doc(`salons/${salonId}/pro/main`).get()).data()
  const attesa = listaAttesaAccesa(settings.serviziEmail, pro as ProMain | undefined, new Date())
  const completa = paginaCompleta({
    paginaScelta: settings.paginaScelta,
    prenotazioniOnline: settings.prenotazioniOnline,
    pausaPrenotazioni: (pro as ProMain | undefined)?.pausa?.prenotazioniOnline,
    attesaAccesa: attesa,
  })
  const marchio = await logoDelSalone(db, salonId, settings)
  if (!completa) {
    // Il salone non ha ancora scelto di mostrarsi: solo il nome e il logo, senza contatti, orari e listino.
    res.status(200).set('Cache-Control', 'no-cache').set('Content-Type', 'text/html; charset=utf-8').send(htmlPaginaPubblica({
      ridotta: true,
      lang,
      nome: profilo.nome,
      indirizzo: '',
      telefono: '',
      prenotabile: false,
      attesa: false,
      salonId,
      logo: marchio.logo,
      catalogo: [],
    }))
    return
  }
  const accesso = prenotazioniConcesse(pro as ProMain | undefined)
  const catalogo = (await catalogoDelSalone(salonId)).filter(pubblicabile)
  const prenotabile = paginaPrenotabile(
    prenotazioneAccesa({ prenotazioniOnline: settings.prenotazioniOnline === true, accesso }),
    catalogo,
  )
  const descrizione = testoBreve(intestazioneDi(settings).descrizione, 240)
  res.status(200).set('Cache-Control', 'no-cache').set('Content-Type', 'text/html; charset=utf-8').send(htmlPaginaPubblica({
    lang,
    nome: profilo.nome,
    indirizzo: profilo.indirizzo ?? '',
    placeId: testo(business.placeId) || undefined,
    telefono: profilo.telefono ?? '',
    descrizione,
    orari: testoOrari(settings.orari, lang),
    prenotabile,
    attesa,
    salonId,
    logo: marchio.logo,
    specie: specieAccettate(settings.speciePrenotabili),
    // Solo per chi legge: la richiesta rilegge il catalogo salvato.
    catalogo: catalogo.map((voce) => ({ ...voce, nome: nomeServizioVisibile(lang, voce.nome) })),
  }))
}

function numero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function tripla(value: unknown): Record<TagliaPrenotazione, number> {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return { piccola: numero(record.piccola), media: numero(record.media), grande: numero(record.grande) }
}

/** Servizi accesi del salone, nell’ordine del listino. I non pubblicabili restano qui: li scarta chi pubblica la pagina. */
export async function catalogoDelSalone(salonId: string, db: Firestore = getFirestore()): Promise<VoceCatalogo[]> {
  if (salonId === '' || salonId === 'shared' || salonId.includes('/')) return []
  const snap = await db.collection(`salons/${salonId}/services`).get()
  const righe = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
  righe.sort((a, b) => numero(a.data.order) - numero(b.data.order) || a.id.localeCompare(b.id))
  return righe.flatMap((riga) => {
    if (riga.data.active === false || riga.id === '') return []
    const nome = typeof riga.data.name === 'string' ? riga.data.name.trim() : ''
    if (nome === '') return []
    return [{
      id: riga.id,
      nome,
      kind: riga.data.kind === 'extra' ? 'extra' : 'principale',
      minuti: tripla(riga.data.durationMin),
      prezzo: tripla(riga.data.price),
    }]
  })
}

function oggetto(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function intestazioneDi(settings: Record<string, unknown>): Record<string, unknown> {
  return oggetto(oggetto(settings.priceSheet).intestazione)
}

function testoBreve(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

async function logoDelSalone(
  db: ReturnType<typeof getFirestore>,
  salonId: string,
  settings: Record<string, unknown>,
): Promise<{ logo: string }> {
  const intestazione = intestazioneDi(settings)
  const id = idFileLogo(intestazione.logo)
  if (!id) return { logo: '' }
  try {
    const data = (await db.doc(`salons/${salonId}/files/${id}`).get()).data()
    if (!data || data.pending === true) return { logo: '' }
    const mime = typeof data.mime === 'string' ? data.mime : ''
    return { logo: logoDaThumb(mime, byteDelThumb(data.thumb)) }
  } catch {
    return { logo: '' }
  }
}
