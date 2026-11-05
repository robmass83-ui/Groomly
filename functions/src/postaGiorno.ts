import type { Firestore } from 'firebase-admin/firestore'
import { TETTO_EMAIL_GIORNO } from '../../src/lib/promemoriaEmail'
import { romeDay } from '../../src/lib/romeTime'

// Il conto delle email del giorno: il tetto di Brevo è uno solo per promemoria dei saloni e Console.

export type PostaGiorno = { totale: number; perSalone: Record<string, number>; accesi: string[] }

export const POSTA_GIORNO = 'sistema/postaGiorno'

function postaDi(data: Record<string, unknown> | undefined, giorno: string): PostaGiorno {
  const accesi = Array.isArray(data?.accesi) ? data.accesi.filter((id): id is string => typeof id === 'string' && id !== '') : []
  if (!data || data.giorno !== giorno) return { totale: 0, perSalone: {}, accesi }
  const perSalone: Record<string, number> = {}
  if (data.perSalone && typeof data.perSalone === 'object') {
    for (const [id, n] of Object.entries(data.perSalone as Record<string, unknown>)) {
      if (typeof n === 'number' && n > 0) perSalone[id] = n
    }
  }
  const totale = typeof data.n === 'number' && data.n > 0 ? data.n : 0
  return { totale, perSalone, accesi }
}

export async function postaOggi(db: Firestore, adesso: Date): Promise<PostaGiorno> {
  return postaDi((await db.doc(POSTA_GIORNO).get()).data(), romeDay(adesso))
}

/** Somma gli invii nella transazione: due giri o un «invia subito» insieme non si cancellano il conto. */
export async function contaInvii(db: Firestore, adesso: Date, salonId: string, inviate: number, posta: PostaGiorno): Promise<void> {
  posta.totale += inviate
  posta.perSalone[salonId] = (posta.perSalone[salonId] ?? 0) + inviate
  if (inviate <= 0) return
  const giorno = romeDay(adesso)
  const ref = db.doc(POSTA_GIORNO)
  await db.runTransaction(async (tx) => {
    const letta = postaDi((await tx.get(ref)).data(), giorno)
    letta.perSalone[salonId] = (letta.perSalone[salonId] ?? 0) + inviate
    tx.set(ref, { giorno, n: letta.totale + inviate, perSalone: letta.perSalone, accesi: letta.accesi })
  })
}

export async function emailOggi(db: Firestore, adesso: Date): Promise<number> {
  return (await postaOggi(db, adesso)).totale
}

/** Quante email può mandare la Console: metà di quelle rimaste, così i promemoria dei saloni non restano a secco. */
export function margineConsole(totale: number): number {
  return Math.floor(Math.max(0, TETTO_EMAIL_GIORNO - totale) / 2)
}

/** Prenota i posti prima dell'invio. I conti dei saloni non cambiano: il loro margine scende col totale. */
export async function prenotaEmail(db: Firestore, adesso: Date, n: number): Promise<boolean> {
  if (n <= 0) return true
  const giorno = romeDay(adesso)
  const ref = db.doc(POSTA_GIORNO)
  return db.runTransaction(async (tx) => {
    const letta = postaDi((await tx.get(ref)).data(), giorno)
    if (n > margineConsole(letta.totale)) return false
    tx.set(ref, { giorno, n: letta.totale + n, perSalone: letta.perSalone, accesi: letta.accesi })
    return true
  })
}
