import { getFirestore } from 'firebase-admin/firestore'
import { erroreServer } from '../erroriServer'

export async function segnaMessaggioPer(salonId: string, dogId: string, testo: string): Promise<{ ok: true }> {
  if (salonId === '' || salonId === 'shared' || salonId.includes('/') || dogId === '' || testo.trim() === '') {
    throw erroreServer('invalid-argument', 'richiesta_non_valida')
  }
  await getFirestore().collection(`salons/${salonId}/messaggi`).add({
    dogId,
    canale: 'wa_manuale',
    stato: 'aperto',
    testo: testo.trim(),
    at: new Date().toISOString(),
  })
  return { ok: true }
}
