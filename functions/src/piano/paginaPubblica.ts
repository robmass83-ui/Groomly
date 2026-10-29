import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import type { Request, Response } from 'express'
import { pubblicabile, type VoceCatalogo, type TagliaPrenotazione } from '../../../src/lib/catalogoPrenotazione'
import { prenotazioniConcesse } from '../../../src/lib/funzioniPiano'
import { byteDelThumb, idFileLogo, logoDaThumb } from '../../../src/lib/logoPubblico'
import { htmlPaginaPubblica, testoOrari } from '../../../src/lib/paginaPubblica'
import { paginaPrenotabile, prenotazioneAccesa, specieAccettate } from '../../../src/lib/prenotazionePubblica'
import type { ProMain } from '../../../src/lib/piano'
import { profiloPubblico } from '../../../src/lib/slug'
import { serviziAccesi } from './inviaCoda'

function testo(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function lingua(value: unknown): 'it' | 'en' | 'es' {
  return value === 'en' || value === 'es' ? value : 'it'
}

export async function paginaPubblicaHttp(req: Request, res: Response): Promise<void> {
  const pezzi = (req.path || '').split('/').filter(Boolean)
  const slug = pezzi[pezzi.length - 1] ?? ''
  const lang = lingua(typeof req.query.lang === 'string' ? req.query.lang : '')
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
    res.status(404).set('Cache-Control', 'no-cache').set('Content-Type', 'text/html; charset=utf-8').send(htmlPaginaPubblica({
      lang, nome: 'Questa pagina non c’è.', indirizzo: '', telefono: '', prenotabile: false, salonId: '',
    }))
    return
  }
  const db = getFirestore()
  const pub = (await db.doc(`pubblici/${slug}`).get()).data()
  const salonId = testo(pub?.salonId)
  if (!pub || salonId === '' || salonId === 'shared') {
    res.status(404).set('Cache-Control', 'no-cache').set('Content-Type', 'text/html; charset=utf-8').send(htmlPaginaPubblica({
      lang, nome: 'Questa pagina non c’è.', indirizzo: '', telefono: '', prenotabile: false, salonId: '',
    }))
    return
  }
  const settings = (await db.doc(`salons/${salonId}/settings/main`).get()).data() ?? {}
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
  const accesso = prenotazioniConcesse(pro as ProMain | undefined)
  const catalogo = (await catalogoDelSalone(salonId)).filter(pubblicabile)
  const prenotabile = paginaPrenotabile(
    prenotazioneAccesa({ prenotazioniOnline: settings.prenotazioniOnline === true, accesso }),
    catalogo,
  )
  const marchio = await logoDelSalone(db, salonId, settings)
  const descrizione = testoBreve(intestazioneDi(settings).descrizione, 240)
  res.status(200).set('Cache-Control', 'no-cache').set('Content-Type', 'text/html; charset=utf-8').send(htmlPaginaPubblica({
    lang,
    nome: profilo.nome,
    indirizzo: profilo.indirizzo ?? '',
    telefono: profilo.telefono ?? '',
    descrizione,
    orari: testoOrari(settings.orari, lang),
    prenotabile,
    attesa: serviziAccesi(settings.serviziEmail).includes('attesa'),
    salonId,
    logo: marchio.logo,
    logoForma: marchio.logoForma,
    specie: specieAccettate(settings.speciePrenotabili),
    catalogo,
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
): Promise<{ logo: string; logoForma: 'tondo' | 'quadrato' }> {
  const intestazione = intestazioneDi(settings)
  const logoForma = intestazione.logoForma === 'tondo' ? 'tondo' : 'quadrato'
  const id = idFileLogo(intestazione.logo)
  if (!id) return { logo: '', logoForma }
  try {
    const data = (await db.doc(`salons/${salonId}/files/${id}`).get()).data()
    if (!data || data.pending === true) return { logo: '', logoForma }
    const mime = typeof data.mime === 'string' ? data.mime : ''
    return { logo: logoDaThumb(mime, byteDelThumb(data.thumb)), logoForma }
  } catch {
    return { logo: '', logoForma }
  }
}
