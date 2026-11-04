import type { FeedbackBeta } from '../../lib/betaFeedback'
import { invitoBetaDi, type InvitoBeta, type MotivoRifiutoBeta } from '../../lib/betaInvito'
import { callCallableData, database, loadFirestore } from './client'

// Callable e letture della beta lato titolare (firme fisse nei contratti di 2026-11-04-beta-fondamenta-design.md).

/** Errore di una callable beta: `message` è il testo del server da mostrare, vuoto se non c'è niente di utile. */
export class ErroreBeta extends Error {
  readonly code: string
  readonly details: unknown
  constructor(message: string, code: string, details?: unknown) {
    super(message)
    this.name = 'ErroreBeta'
    this.code = code
    this.details = details
  }
}

function comeErroreBeta(error: unknown): ErroreBeta {
  const testo = error instanceof Error ? error.message.trim() : ''
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : ''
  const generico = testo === '' || testo.startsWith('Firebase') || testo === 'internal' || code.endsWith('/internal') || code.endsWith('/unavailable')
  const details = error && typeof error === 'object' && 'details' in error ? error.details : undefined
  return new ErroreBeta(generico ? '' : testo, code, details)
}

async function chiama(nome: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const risposta = await callCallableData(nome, data)
    return risposta && typeof risposta === 'object' ? risposta as Record<string, unknown> : {}
  } catch (error) {
    throw comeErroreBeta(error)
  }
}

export async function rispondiInvitoBeta(input: { accetta: boolean; motivo?: MotivoRifiutoBeta; altro?: string }): Promise<{ ok: true; scadeIl: string | null }> {
  const risposta = await chiama('rispondiInvitoBeta', input)
  return { ok: true, scadeIl: typeof risposta.scadeIl === 'string' ? risposta.scadeIl : null }
}

export type InputFeedbackBeta = Omit<FeedbackBeta, 'salonId' | 'uid' | 'piano' | 'creatoIl'>

export async function inviaFeedbackBeta(input: InputFeedbackBeta): Promise<{ ok: true }> {
  await chiama('inviaFeedbackBeta', { ...input })
  return { ok: true }
}

/** L'invito del salone: lo legge solo il titolare (regole), agli altri arriva null. */
export async function listenInvitoBeta(salonId: string, onData: (invito: InvitoBeta | null) => void): Promise<() => void> {
  const db = await database()
  const { doc, onSnapshot } = await loadFirestore()
  return onSnapshot(doc(db, 'betaInviti', salonId), (snap) => {
    onData(snap.exists() ? invitoBetaDi(snap.data()) : null)
  }, () => onData(null))
}
