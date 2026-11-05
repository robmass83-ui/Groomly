// Le decisioni di scripts/imposta-admin.ts: qui si provano senza toccare Firebase.
// I Pelosetti sta in salons/{uid di Laura}: salon/shared è un resto in sola lettura e lo script non lo tocca mai.

export type PassoCollega = 'elimina-salone-prova' | 'scrivi-account' | 'scrivi-membro'
export type PassoStacca = 'elimina-account-hotmail' | 'elimina-membro-hotmail'
export type Decisione<P> = { ok: true; passi: P[] } | { ok: false; motivo: string }

export type StatoRobmass = {
  uid: string | null
  salonId: string | null
  /** Persone del suo salone, lui escluso. */
  altrePersone: number
  /** Ha già la riga attiva nei membri del salone di Laura. */
  membroAttivo: boolean
  lauraUid: string | null
  lauraSalonId: string | null
}

export type StatoStacco = {
  hotmailUid: string | null
  claimAdmin: boolean
  robmassSalonId: string | null
  lauraUid: string | null
  robmassEntratoDopoCollegamento: boolean
}

export function decidiCollega(stato: StatoRobmass): Decisione<PassoCollega> {
  const { uid, salonId, lauraUid } = stato
  if (!lauraUid) return { ok: false, motivo: 'Laura non esiste in Auth.' }
  if (stato.lauraSalonId !== lauraUid) return { ok: false, motivo: `Il salone di Laura non è il suo uid: trovato ${stato.lauraSalonId ?? 'niente'}.` }
  if (!uid) return { ok: false, motivo: 'robmass83 non esiste in Auth: va prima registrato.' }
  if (uid === lauraUid) return { ok: false, motivo: 'robmass83 e Laura hanno lo stesso uid.' }
  const scrivi: PassoCollega[] = ['scrivi-account', 'scrivi-membro']
  if (salonId === lauraUid) return { ok: true, passi: stato.membroAttivo ? [] : scrivi }
  if (salonId === null || salonId === '' || salonId === 'shared') return { ok: true, passi: scrivi }
  if (salonId !== uid) return { ok: false, motivo: `L'account di robmass83 punta a un terzo salone: ${salonId}.` }
  if (stato.altrePersone > 0) return { ok: false, motivo: `Il salone di robmass83 ha altre ${stato.altrePersone} persone.` }
  return { ok: true, passi: ['elimina-salone-prova', ...scrivi] }
}

export function decidiStacca(stato: StatoStacco): Decisione<PassoStacca> {
  if (!stato.hotmailUid) return { ok: false, motivo: 'La hotmail non esiste in Auth.' }
  if (!stato.claimAdmin) return { ok: false, motivo: 'La hotmail non ha il claim admin: resterebbe fuori da tutto.' }
  if (!stato.lauraUid || stato.robmassSalonId !== stato.lauraUid) return { ok: false, motivo: 'robmass83 non è collegato al salone di Laura.' }
  if (!stato.robmassEntratoDopoCollegamento) return { ok: false, motivo: 'robmass83 non ha ancora fatto un accesso dopo il collegamento.' }
  return { ok: true, passi: ['elimina-account-hotmail', 'elimina-membro-hotmail'] }
}

/** Il solo percorso che lo script può cancellare per intero: mai `shared`, mai il salone di Laura. */
export function bersaglioSaloneProva(uid: string, lauraUid: string): string {
  if (uid === '' || lauraUid === '' || uid === lauraUid || uid === 'shared' || uid.includes('/')) {
    throw new Error(`Bersaglio rifiutato: ${uid}`)
  }
  return `salons/${uid}`
}
