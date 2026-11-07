import { getFirestore } from 'firebase-admin/firestore'
import { paginaCompleta } from '../../../src/lib/paginaPubblica'
import type { ProMain } from '../../../src/lib/piano'
import { listaAttesaAccesa } from './inviaCoda'
import { htmlSalone, profiloPubblico } from '../../../src/lib/slug'
import { erroreServer } from '../erroriServer'

function testo(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function saloneInfoPer(slug: string): Promise<{ html: string; profilo: ReturnType<typeof profiloPubblico> }> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw erroreServer('invalid-argument', 'pagina_assente')
  const db = getFirestore()
  const pub = (await db.doc(`pubblici/${slug}`).get()).data()
  const salonId = testo(pub?.salonId)
  if (!pub || salonId === '' || salonId === 'shared') throw erroreServer('not-found', 'pagina_assente')
  const settings = (await db.doc(`salons/${salonId}/settings/main`).get()).data() ?? {}
  const business = settings.business && typeof settings.business === 'object' ? settings.business as Record<string, unknown> : {}
  const pro = (await db.doc(`salons/${salonId}/pro/main`).get()).data()
  // Come la pagina: senza una scelta del salone, solo il nome.
  const completa = paginaCompleta({
    paginaScelta: settings.paginaScelta,
    prenotazioniOnline: settings.prenotazioniOnline,
    pausaPrenotazioni: (pro as ProMain | undefined)?.pausa?.prenotazioniOnline,
    attesaAccesa: listaAttesaAccesa(settings.serviziEmail, pro as ProMain | undefined, new Date()),
  })
  const profilo = profiloPubblico({
    nome: testo(business.salonName) || testo(pub.nome) || slug,
    telefono: completa ? testo(business.phone) : '',
    indirizzo: completa ? testo(business.address) : '',
    vat: testo(business.vatNumber),
    tax: testo(business.taxCode),
    mostraDatiFiscali: business.mostraDatiFiscali === true,
  })
  return { html: htmlSalone(profilo), profilo }
}
