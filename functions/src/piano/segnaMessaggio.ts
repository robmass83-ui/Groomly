import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'

export async function segnaMessaggioPer(salonId: string, dogId: string, testo: string): Promise<{ ok: true }> {
  if (salonId === '' || salonId === 'shared' || salonId.includes('/') || dogId === '' || testo.trim() === '') {
    throw new HttpsError('invalid-argument', 'Richiesta non valida')
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
