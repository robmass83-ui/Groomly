/**
 * Coda in memoria degli upload verso Storage.
 * Non sopravvive a un refresh: non si aggiunge una chiave localStorage.
 * Le cancellazioni (enqueueFirst) partono prima degli altri salvataggi.
 * Un task rifiutato chiama onFail una volta sola, così la UI mostra «Salvataggio non riuscito»,
 * e resta in testa alla sua lista: riparte al prossimo evento online o dopo RIPROVA_MS.
 * Su un telefono sempre in rete l'evento online non arriva mai: senza il nuovo tentativo a tempo
 * il task resterebbe fermo fino al riavvio, e Esci avviserebbe di modifiche in sospeso per sempre.
 * clear() svuota entrambe le liste: all'uscita di un account i task in coda non devono più partire.
 */
type UploadTask = () => Promise<void>
type Lane = 'first' | 'rest'
// `copia`: il task scrive una copia di dati già nel cloud (il backup), quindi non conta per inAttesa().
type Entry = { task: UploadTask; copia: boolean; avvisato: boolean }

export const RIPROVA_MS = 30_000

export function createUploadQueue(onFail: () => void) {
  const first: Entry[] = []
  const rest: Entry[] = []
  let pumping = false
  let running: Entry | null = null
  let holdFirst = false
  let holdRest = false
  let onlineBound = false
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  // Cambia a ogni clear(): un task già partito che poi fallisce non rientra in una coda svuotata.
  let epoch = 0

  function resume(): void {
    clearTimeout(retryTimer)
    retryTimer = undefined
    holdFirst = false
    holdRest = false
    void pump()
  }

  function listenOnline(): void {
    if (onlineBound || typeof window === 'undefined') return
    onlineBound = true
    window.addEventListener('online', resume)
  }

  function hold(lane: Lane, retry: boolean): void {
    if (lane === 'first') holdFirst = true
    else holdRest = true
    listenOnline()
    // Offline basta l'evento online; un rifiuto con la rete accesa si riprova da solo.
    if (retry && retryTimer === undefined) retryTimer = setTimeout(resume, RIPROVA_MS)
  }

  function take(): { entry: Entry; lane: Lane } | undefined {
    if (holdFirst) return undefined
    const priority = first.shift()
    if (priority) return { entry: priority, lane: 'first' }
    if (holdRest) return undefined
    const next = rest.shift()
    if (next) return { entry: next, lane: 'rest' }
    return undefined
  }

  function putBack(lane: Lane, entry: Entry): void {
    if (lane === 'first') first.unshift(entry)
    else rest.unshift(entry)
  }

  async function pump(): Promise<void> {
    if (pumping) return
    pumping = true
    try {
      for (;;) {
        const next = take()
        if (!next) return
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          putBack(next.lane, next.entry)
          hold(next.lane, false)
          return
        }
        const started = epoch
        running = next.entry
        try {
          await next.entry.task()
        } catch {
          // Svuotata mentre girava: il task è di un account uscito, non si rimette e non si segnala.
          if (started !== epoch) continue
          if (!next.entry.avvisato) {
            next.entry.avvisato = true
            onFail()
          }
          putBack(next.lane, next.entry)
          hold(next.lane, true)
          return
        } finally {
          running = null
        }
      }
    } finally {
      pumping = false
    }
  }

  function enqueue(task: UploadTask, opzioni: { copia?: boolean } = {}): void {
    rest.push({ task, copia: opzioni.copia === true, avvisato: false })
    void pump()
  }

  function enqueueFirst(task: UploadTask): void {
    first.push({ task, copia: false, avvisato: false })
    void pump()
  }

  function clear(): void {
    epoch += 1
    first.length = 0
    rest.length = 0
    holdFirst = false
    holdRest = false
    clearTimeout(retryTimer)
    retryTimer = undefined
  }

  /** Vero se c'è una modifica ancora da inviare, in lista o in corso; le copie del backup non contano. */
  function inAttesa(): boolean {
    const conta = (entry: Entry) => !entry.copia
    return (running !== null && conta(running)) || first.some(conta) || rest.some(conta)
  }

  return { enqueue, enqueueFirst, clear, inAttesa }
}
