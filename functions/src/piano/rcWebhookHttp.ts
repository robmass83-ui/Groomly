import { getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { applicaEventoRc } from '../abbonamenti/applicaEventoRc'
import { decisioneWebhook } from './rcWebhook'

// Vanno creati in Secret Manager prima del deploy: vedi PRIMA-DEI-PAGAMENTI.md. REVENUECAT_WEBHOOK_AUTH deve essere casuale
// e lungo almeno 32 caratteri (decisioneWebhook risponde 503 con uno più corto).
export const revenueCatApiKey = defineSecret('REVENUECAT_API_KEY')
export const revenueCatWebhookAuth = defineSecret('REVENUECAT_WEBHOOK_AUTH')

export const rcWebhook = onRequest({ region: 'europe-west1', invoker: 'public', secrets: [revenueCatApiKey, revenueCatWebhookAuth] }, async (req, res) => {
  const eventoId = typeof req.body?.event?.id === 'string' ? req.body.event.id : ''
  const ref = eventoId ? getFirestore().doc(`rcEventi/${eventoId}`) : null
  const gia = ref ? (await ref.get()).exists : false
  const decisione = decisioneWebhook({
    authorization: req.header('authorization') ?? undefined,
    atteso: revenueCatWebhookAuth.value(),
    giaVisto: gia,
    apiKey: revenueCatApiKey.value(),
  })
  if (decisione.scrivi && ref) {
    // Se la scrittura del piano fallisce rispondiamo 500 senza segnare l'evento: RevenueCat lo rimanda.
    await applicaEventoRc(req.body, new Date())
    await ref.set({ at: new Date().toISOString() })
  }
  res.status(decisione.status).json({ ok: decisione.status === 200 })
})
