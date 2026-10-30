/**
 * Ponte del backup notturno. Android apre Groomly in una WebView senza schermo e
 * aggiunge `window.GroomlyBackup`: qui file e Drive passano da lì, non da Capacitor.
 */
export interface PonteNativo {
  chiama(id: string, metodo: string, args: string): void
  fine(esito: string): void
}

declare global {
  interface Window {
    GroomlyBackup?: PonteNativo
    __groomlyRisposta?: (id: string, ok: boolean, dati: string) => void
  }
}

const attese = new Map<string, { resolve: (valore: unknown) => void; reject: (error: Error) => void }>()
let contatore = 0

export function ponteBackup(): PonteNativo | null {
  if (typeof window === 'undefined') return null
  return window.GroomlyBackup ?? null
}

function rispondi(id: string, ok: boolean, dati: string): void {
  const attesa = attese.get(id)
  if (!attesa) return
  attese.delete(id)
  let valore: unknown
  try {
    valore = dati ? JSON.parse(dati) : undefined
  } catch {
    valore = undefined
  }
  if (ok) attesa.resolve(valore)
  else attesa.reject(new Error(typeof valore === 'string' && valore ? valore : 'invio'))
}

export function chiamaPonte<T>(metodo: string, args: Record<string, unknown> = {}): Promise<T> {
  const ponte = ponteBackup()
  if (!ponte) return Promise.reject(new Error('telefono'))
  window.__groomlyRisposta = rispondi
  contatore += 1
  const id = String(contatore)
  return new Promise<T>((resolve, reject) => {
    attese.set(id, { resolve: resolve as (valore: unknown) => void, reject })
    try {
      ponte.chiama(id, metodo, JSON.stringify(args))
    } catch {
      attese.delete(id)
      reject(new Error('invio'))
    }
  })
}
