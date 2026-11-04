import { getFirestore } from 'firebase-admin/firestore'
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
  const profilo = profiloPubblico({
    nome: testo(business.salonName) || testo(pub.nome) || slug,
    telefono: testo(business.phone),
    indirizzo: testo(business.address),
    vat: testo(business.vatNumber),
    tax: testo(business.taxCode),
    mostraDatiFiscali: business.mostraDatiFiscali === true,
  })
  return { html: htmlSalone(profilo), profilo }
}
