import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { buildActionLink } from './actionLink'
import { BrevoRequestError, postBrevoTemplate, type BrevoParams } from './brevoMail'
import { rateDecision } from './rateLimit'

const brevoApiKey = defineSecret('BREVO_API_KEY')

initializeApp()

const callable = {
  region: 'europe-west1' as const,
  secrets: [brevoApiKey],
  invoker: 'public' as const,
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function authCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return String((error as { code: unknown }).code)
}

function requireEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 320) {
    throw new HttpsError('invalid-argument', 'Inserisci un’email valida')
  }
  return email
}

async function reserveEmailSlot(email: string): Promise<void> {
  const db = getFirestore()
  const ref = db.collection('emailRateLimits').doc(email)
  const now = Date.now()
  let limited = false
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const decision = rateDecision(snap.get('hits'), now)
      if (!decision.ok) {
        limited = true
        return
      }
      tx.set(ref, { hits: decision.next })
    })
  } catch (error) {
    logger.error('Limite email non disponibile', { code: authCode(error) })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
  if (limited) throw new HttpsError('resource-exhausted', 'Aspetta un momento e riprova')
}

async function sendBrevo(templateId: number, toEmail: string, params: BrevoParams): Promise<void> {
  try {
    await postBrevoTemplate(brevoApiKey.value(), templateId, toEmail, params)
  } catch (error) {
    const status = error instanceof BrevoRequestError ? error.status : 0
    const detail = error instanceof BrevoRequestError ? error.detail : ''
    logger.error('Brevo ha rifiutato l’invio', { status, detail })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
}

function actionLink(firebaseLink: string): string {
  try {
    return buildActionLink(firebaseLink)
  } catch {
    logger.error('Link azione non valido')
    throw new HttpsError('internal', 'Invio non riuscito')
  }
}

async function firebaseLink(create: () => Promise<string>): Promise<string> {
  try {
    return actionLink(await create())
  } catch (error) {
    if (error instanceof HttpsError) throw error
    logger.error('Generazione link non riuscita', { code: authCode(error) })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
}

export const sendVerificationEmail = onCall(callable, async (request) => {
  const email = request.auth?.token.email?.trim().toLowerCase()
  if (!request.auth || !email) throw new HttpsError('unauthenticated', 'Accesso richiesto')
  let verified = false
  try {
    verified = (await getAuth().getUser(request.auth.uid)).emailVerified === true
  } catch (error) {
    logger.error('Lettura account non riuscita', { code: authCode(error) })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
  if (verified) return { ok: true, alreadyVerified: true }
  await reserveEmailSlot(email)
  const link = await firebaseLink(() => getAuth().generateEmailVerificationLink(email))
  await sendBrevo(3, email, { link })
  return { ok: true }
})

export const sendPasswordResetEmail = onCall(callable, async (request) => {
  const email = requireEmail(request.data?.email)
  await reserveEmailSlot(email)
  try {
    await getAuth().getUserByEmail(email)
  } catch (error) {
    if (authCode(error) === 'auth/user-not-found') return { ok: true }
    logger.error('Lettura account non riuscita', { code: authCode(error) })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
  const link = await firebaseLink(() => getAuth().generatePasswordResetLink(email))
  await sendBrevo(4, email, { link, email })
  return { ok: true }
})
