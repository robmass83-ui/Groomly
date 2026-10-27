import { randomBytes } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { emailPrenotazioneValida, esitoEmailPrenotazione, templatePrenotazione } from '../../../src/lib/prenotazione'
import { linguaClientiSalon, spedisciHtml, tipoEmailPrenotazione } from '../postaHtml'
import { salonPrenota } from './gatePrenotazione'

export async function inviaRichiestaPer(input: {
  salonId: string
  email: string
  phone: string
  nome: string
  inizio: string
  fine: string
  esca: string
  cane?: string
  taglia?: string
  servizi?: string[]
}, apiKey?: string): Promise<{ ok: true; id?: string; emailStato: 'inviata' | 'non_inviata' }> {
  if (input.salonId === '' || input.salonId === 'shared' || input.salonId.includes('/')) {
    throw new HttpsError('invalid-argument', 'Richiesta non valida')
  }
  if (!(await salonPrenota(input.salonId))) throw new HttpsError('failed-precondition', 'Prenotazioni spente')
  if (input.esca.trim() !== '') return { ok: true, emailStato: 'non_inviata' }
  if (!emailPrenotazioneValida(input.email)) throw new HttpsError('invalid-argument', 'Email obbligatoria')
  const emailStato = esitoEmailPrenotazione(apiKey)
  const token = randomBytes(16).toString('hex')
  const ref = getFirestore().collection(`salons/${input.salonId}/richieste`).doc()
  await ref.set({
    status: 'nuova',
    email: input.email.trim().toLowerCase(),
    phone: input.phone,
    nome: input.nome.trim(),
    start: input.inizio,
    end: input.fine,
    token,
    emailStato,
    template: templatePrenotazione('nuova'),
    ...campiRichiesta(input),
  })
  if (apiKey) {
    const lingua = await linguaClientiSalon(input.salonId)
    await spedisciHtml(apiKey, tipoEmailPrenotazione('nuova'), lingua, input.email, { nome: input.nome }).catch(() => undefined)
  }
  return { ok: true, id: ref.id, emailStato }
}

function campiRichiesta(input: { cane?: string; taglia?: string; servizi?: string[] }): { cane?: string; taglia?: string; servizi?: string[] } {
  const cane = (input.cane ?? '').trim().slice(0, 80)
  const taglia = input.taglia === 'piccola' || input.taglia === 'media' || input.taglia === 'grande' ? input.taglia : ''
  const servizi = (input.servizi ?? []).filter((id) => /^[a-z0-9-]{1,40}$/.test(id)).slice(0, 8)
  return {
    ...(cane ? { cane } : {}),
    ...(taglia ? { taglia } : {}),
    ...(servizi.length > 0 ? { servizi } : {}),
  }
}
