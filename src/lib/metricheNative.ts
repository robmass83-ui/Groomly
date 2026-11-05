import { Capacitor } from '@capacitor/core'
import { registra, type EventoMetrica } from './metriche'

type Riga = { functionName?: string; fileName: string; lineNumber: number }

const RIGHE_MAX = 20
const RIGA_STACK = /^at (?:(.+?) \()?([^ ]+):(\d+):\d+\)?$/
const NOMI_ERRORE = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError', 'FirebaseError'])

let attiva = false

async function analytics() {
  return (await import('@capacitor-firebase/analytics')).FirebaseAnalytics
}

async function crashlytics() {
  return (await import('@capacitor-firebase/crashlytics')).FirebaseCrashlytics
}

/** Il sì e il no restano salvati nel telefono: va ripetuto a ogni avvio. I crash nativi cambiano dal prossimo avvio. */
export async function impostaRaccolta(valore: boolean, proprieta?: { piano: string; lingua: string }): Promise<void> {
  attiva = valore && Capacitor.isNativePlatform()
  if (!Capacitor.isNativePlatform()) return
  try {
    const [google, crash] = await Promise.all([analytics(), crashlytics()])
    await Promise.all([google.setEnabled({ enabled: valore }), crash.setEnabled({ enabled: valore })])
    if (!valore) {
      await crash.deleteUnsentReports()
      return
    }
    if (proprieta) {
      await google.setUserProperty({ key: 'piano', value: proprieta.piano })
      await google.setUserProperty({ key: 'lingua', value: proprieta.lingua })
    }
  } catch {
    // Le statistiche non devono mai disturbare il lavoro.
  }
}

export function traccia(evento: EventoMetrica): void {
  registra(attiva, evento, ({ nome, ...params }) => {
    void analytics()
      .then((google) => google.logEvent({ name: nome, params }))
      .catch(() => undefined)
  })
}

function righeStack(stack: string | undefined): Riga[] {
  const righe: Riga[] = []
  for (const riga of (stack ?? '').split('\n')) {
    const trovata = RIGA_STACK.exec(riga.trim())
    if (!trovata) continue
    righe.push({
      ...(trovata[1] ? { functionName: trovata[1] } : {}),
      fileName: trovata[2] ?? '',
      lineNumber: Number(trovata[3]),
    })
  }
  return righe.slice(0, RIGHE_MAX)
}

/** Il messaggio di un errore può contenere il nome di un cliente: si mandano solo il tipo e le righe di codice. */
export function segnalaErrore(errore: unknown): void {
  if (!attiva) return
  const tipo = errore instanceof Error && NOMI_ERRORE.has(errore.name) ? errore.name : 'Error'
  const stacktrace = errore instanceof Error ? righeStack(errore.stack) : []
  void crashlytics()
    .then((crash) => crash.recordException({ message: tipo, stacktrace }))
    .catch(() => undefined)
}
