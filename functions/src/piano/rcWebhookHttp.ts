import { getFirestore } from 'firebase-admin/firestore'
import { onRequest } from 'firebase-functions/v2/https'
import { decisioneWebhook } from './rcWebhook'

export const rcWebhook = onRequest({ region: 'europe-west1', invoker: 'public' }, async (req, res) => {
  const eventoId = typeof req.body?.event?.id === 'string' ? req.body.event.id : ''
  const ref = eventoId ? getFirestore().doc(`rcEventi/${eventoId}`) : null
  const gia = ref ? (await ref.get()).exists : false
  const decisione = decisioneWebhook({
    authorization: req.header('authorization') ?? undefined,
    atteso: process.env.REVENUECAT_WEBHOOK_AUTH ?? '',
    giaVisto: gia,
    apiKey: process.env.REVENUECAT_API_KEY,
  })
  if (decisione.scrivi && ref) await ref.set({ at: new Date().toISOString() })
  res.status(decisione.status).json({ ok: decisione.status === 200 })
})
