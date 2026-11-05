import { beforeEach, describe, expect, it, vi } from 'vitest'
import { impostaRaccolta, segnalaErrore, traccia } from './metricheNative'

const m = vi.hoisted(() => ({
  nativo: true,
  logEvent: vi.fn(async () => undefined),
  analyticsEnabled: vi.fn(async () => undefined),
  setUserProperty: vi.fn(async () => undefined),
  crashEnabled: vi.fn(async () => undefined),
  recordException: vi.fn(async () => undefined),
  deleteUnsentReports: vi.fn(async () => undefined),
}))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => m.nativo } }))
vi.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: { logEvent: m.logEvent, setEnabled: m.analyticsEnabled, setUserProperty: m.setUserProperty },
}))
vi.mock('@capacitor-firebase/crashlytics', () => ({
  FirebaseCrashlytics: { setEnabled: m.crashEnabled, recordException: m.recordException, deleteUnsentReports: m.deleteUnsentReports },
}))

async function attesa(): Promise<void> {
  await new Promise((fatto) => { setTimeout(fatto, 0) })
}

describe('raccolta sul telefono', () => {
  beforeEach(async () => {
    m.nativo = true
    await impostaRaccolta(false)
    vi.clearAllMocks()
  })

  it('a raccolta spenta non parte niente', async () => {
    traccia({ nome: 'cane_creato' })
    segnalaErrore(new Error('x'))
    await attesa()
    expect(m.logEvent).not.toHaveBeenCalled()
    expect(m.recordException).not.toHaveBeenCalled()
  })

  it('accesa manda eventi e proprietà', async () => {
    await impostaRaccolta(true, { piano: 'go', lingua: 'it' })
    traccia({ nome: 'avvisami_toccato', piano: 'plus' })
    await attesa()
    expect(m.analyticsEnabled).toHaveBeenCalledWith({ enabled: true })
    expect(m.crashEnabled).toHaveBeenCalledWith({ enabled: true })
    expect(m.setUserProperty).toHaveBeenCalledWith({ key: 'piano', value: 'go' })
    expect(m.logEvent).toHaveBeenCalledWith({ name: 'avvisami_toccato', params: { piano: 'plus' } })
  })

  it('spegnere ferma gli eventi e cancella i crash non inviati', async () => {
    await impostaRaccolta(true)
    vi.clearAllMocks()
    const fatto = impostaRaccolta(false)
    traccia({ nome: 'cane_creato' })
    await fatto
    await attesa()
    expect(m.logEvent).not.toHaveBeenCalled()
    expect(m.analyticsEnabled).toHaveBeenCalledWith({ enabled: false })
    expect(m.crashEnabled).toHaveBeenCalledWith({ enabled: false })
    expect(m.deleteUnsentReports).toHaveBeenCalledTimes(1)
  })

  it('segnalaErrore manda nome e righe di codice, mai il messaggio', async () => {
    await impostaRaccolta(true)
    const errore = new TypeError('Cliente Mario Rossi')
    errore.stack = 'TypeError: Cliente Mario Rossi\nat Mario Rossi\n    at salva (https://localhost/assets/app.js:10:5)'
    segnalaErrore(errore)
    await attesa()
    expect(JSON.stringify(m.recordException.mock.calls)).not.toContain('Mario')
    expect(m.recordException).toHaveBeenCalledWith({
      message: 'TypeError',
      stacktrace: [{ functionName: 'salva', fileName: 'https://localhost/assets/app.js', lineNumber: 10 }],
    })
  })

  it('un nome di errore inventato non passa', async () => {
    await impostaRaccolta(true)
    const errore = new Error('x')
    errore.name = 'Mario Rossi'
    segnalaErrore(errore)
    await attesa()
    expect(JSON.stringify(m.recordException.mock.calls)).not.toContain('Mario')
  })

  it('segnalaErrore su un valore che non è un errore non manda il valore', async () => {
    await impostaRaccolta(true)
    segnalaErrore('Mario Rossi')
    await attesa()
    expect(JSON.stringify(m.recordException.mock.calls)).not.toContain('Mario')
  })

  it('sul web non carica i plugin', async () => {
    m.nativo = false
    await impostaRaccolta(true)
    traccia({ nome: 'cane_creato' })
    await attesa()
    expect(m.analyticsEnabled).not.toHaveBeenCalled()
    expect(m.logEvent).not.toHaveBeenCalled()
  })
})
