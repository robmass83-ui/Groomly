import { defineSecret, defineString } from 'firebase-functions/params'
import { onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { postBrevoHtml } from '../brevoMail'
import { revenueCatApiKey } from '../piano/rcWebhookHttp'
import { accendiAbbonamentiPer, confermaPartitaIvaPer, controlloAccensionePer, spegniAbbonamentiPer } from './accensione'
import { annunciaPagamentiPer } from './annuncio'
import { emailAnnuncio } from './emailAnnuncio'
import { leggiOfferingRc } from './offeringRc'
import { erroreServer } from '../erroriServer'

// Callable degli abbonamenti (fase 4), tutte solo per operatori. Esportate da index.ts con una riga.
const brevoApiKey = defineSecret('BREVO_API_KEY')
// ID del progetto RevenueCat: non è un segreto, si imposta al deploy (functions/.env). Vuoto = offering rosso.
const revenueCatProjectId = defineString('REVENUECAT_PROJECT_ID', { default: '' })

const opzioni = { region: 'europe-west1' as const, invoker: 'public' as const }
const conRevenueCat = { ...opzioni, secrets: [revenueCatApiKey] }

function operatore(request: CallableRequest) {
  if (!request.auth?.uid) throw erroreServer('unauthenticated', 'accesso_richiesto')
  const token = request.auth.token
  return {
    operatorEmail: typeof token.email === 'string' ? token.email : '',
    emailVerified: token.email_verified === true,
    admin: token.admin === true,
  }
}

function campo(data: unknown, nome: string): unknown {
  return data && typeof data === 'object' ? (data as Record<string, unknown>)[nome] : undefined
}

const offering = (offeringId: string) => leggiOfferingRc({ projectId: revenueCatProjectId.value(), apiKey: revenueCatApiKey.value(), offeringId })

export const controlloAccensione = onCall(conRevenueCat, async (request) => controlloAccensionePer({ ...operatore(request), offering }))

export const confermaPartitaIva = onCall(opzioni, async (request) => confermaPartitaIvaPer({ ...operatore(request), valore: campo(request.data, 'valore') }))

export const accendiAbbonamenti = onCall(conRevenueCat, async (request) => accendiAbbonamentiPer({ ...operatore(request), parola: campo(request.data, 'parola'), offering }))

export const spegniAbbonamenti = onCall(opzioni, async (request) => spegniAbbonamentiPer(operatore(request)))

export const annunciaPagamenti = onCall({ ...opzioni, secrets: [brevoApiKey], timeoutSeconds: 300 }, async (request) => annunciaPagamentiPer({
  ...operatore(request),
  data: campo(request.data, 'data'),
  inviaEmail: async ({ email, lingua, pagamentiDal }) => {
    const { oggetto, html } = emailAnnuncio(lingua, pagamentiDal)
    await postBrevoHtml(brevoApiKey.value(), email, oggetto, html)
  },
}))
