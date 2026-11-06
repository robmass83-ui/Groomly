import { getAuth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import { linguaValida, type Lingua } from '../../../src/i18n/lingua'
import { leggiEmailPromo, type EmailPromo } from '../../../src/lib/versioneLegale'
import { erroreServer } from '../erroriServer'

const TOKEN = /^[a-f0-9]{32}$/

export interface ArchivioPromo {
  leggi(uid: string): Promise<{ email: string; lingua?: Lingua; emailPromo?: EmailPromo } | null>
  /** Senza riga cambia solo il token: nessuna scelta da registrare. */
  scrivi(uid: string, emailPromo: EmailPromo, riga?: Record<string, unknown>): Promise<void>
}

/** Le promozioni vanno solo all'indirizzo di accesso confermato, non a quello scritto nell'account. */
async function emailConfermata(uid: string): Promise<string> {
  try {
    const utente = await getAuth().getUser(uid)
    return utente.emailVerified === true ? utente.email ?? '' : ''
  } catch {
    return ''
  }
}

export function archivioPromo(db: Firestore): ArchivioPromo {
  return {
    async leggi(uid) {
      const snap = await db.doc(`accounts/${uid}`).get()
      if (!snap.exists) return null
      return {
        email: await emailConfermata(uid),
        lingua: linguaValida(snap.get('lingua')) ?? undefined,
        emailPromo: leggiEmailPromo(snap.get('emailPromo')),
      }
    },
    async scrivi(uid, emailPromo, riga) {
      const batch = db.batch()
      batch.set(db.doc(`accounts/${uid}`), { emailPromo }, { merge: true })
      if (riga) batch.set(db.collection(`accounts/${uid}/registro`).doc(), riga)
      await batch.commit()
    },
  }
}

async function cambia(
  uid: string,
  attivo: boolean,
  fonte: EmailPromo['fonte'],
  precedente: EmailPromo | undefined,
  archivio: ArchivioPromo,
  adesso: Date,
): Promise<void> {
  const at = adesso.toISOString()
  const token = precedente?.token ? { token: precedente.token } : {}
  await archivio.scrivi(uid, { attivo, at, fonte, ...token }, { tipo: 'email-promo', attivo, fonte, at })
}

export async function impostaEmailPromoPer(
  input: { uid: string; attivo: boolean; fonte: 'tour' | 'account' },
  archivio: ArchivioPromo,
  adesso: Date,
): Promise<{ ok: true }> {
  const account = await archivio.leggi(input.uid)
  await cambia(input.uid, input.attivo, input.fonte, account?.emailPromo, archivio, adesso)
  return { ok: true }
}

export async function disiscriviPromoPer(
  input: { uid: string; token: string },
  archivio: ArchivioPromo,
  adesso: Date,
): Promise<{ ok: true }> {
  if (input.uid === '' || input.uid.includes('/') || !TOKEN.test(input.token)) throw erroreServer('not-found', 'link_non_valido')
  const account = await archivio.leggi(input.uid)
  if (account?.emailPromo?.token !== input.token) throw erroreServer('not-found', 'link_non_valido')
  if (account.emailPromo.attivo) await cambia(input.uid, false, 'link', account.emailPromo, archivio, adesso)
  return { ok: true }
}
