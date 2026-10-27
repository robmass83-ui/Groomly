import { getFirestore } from 'firebase-admin/firestore'
import type { Request, Response } from 'express'
import { prenotazioniConcesse } from '../../../src/lib/funzioniPiano'
import { byteDelThumb, idFileLogo, logoDaThumb } from '../../../src/lib/logoPubblico'
import { htmlPaginaPubblica, testoOrari } from '../../../src/lib/paginaPubblica'
import { prenotazioneAccesa } from '../../../src/lib/prenotazionePubblica'
import type { ProMain } from '../../../src/lib/piano'
import { profiloPubblico } from '../../../src/lib/slug'

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
  const prenotabile = prenotazioneAccesa({ prenotazioniOnline: settings.prenotazioniOnline === true, accesso })
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
    salonId,
    logo: marchio.logo,
    logoForma: marchio.logoForma,
  }))
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
