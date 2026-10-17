/**
 * Coda in memoria degli upload verso Storage.
 * Non sopravvive a un refresh: non si aggiunge una chiave localStorage.
 * Le cancellazioni (enqueueFirst) partono prima degli altri salvataggi.
 * Un task rifiutato chiama onFail una volta, così la UI mostra «Salvataggio non riuscito»,
 * e resta in testa alla sua lista fino al prossimo evento online.
 * clear() svuota entrambe le liste: all'uscita di un account i task in coda non devono più partire.
 */
type UploadTask = () => Promise<void>
type Lane = 'first' | 'rest'

export function createUploadQueue(onFail: () => void) {
  const first: UploadTask[] = []
  const rest: UploadTask[] = []
  let pumping = false
  let holdFirst = false
  let holdRest = false
  let onlineBound = false
  // Cambia a ogni clear(): un task già partito che poi fallisce non rientra in una coda svuotata.
  let epoch = 0

  function listenOnline(): void {
    if (onlineBound || typeof window === 'undefined') return
    onlineBound = true
    window.addEventListener('online', () => {
      holdFirst = false
      holdRest = false
      void pump()
    })
  }

  function hold(lane: Lane): void {
    if (lane === 'first') holdFirst = true
    else holdRest = true
    listenOnline()
  }

  function take(): { task: UploadTask; lane: Lane } | undefined {
    if (holdFirst) return undefined
    const priority = first.shift()
    if (priority) return { task: priority, lane: 'first' }
    if (holdRest) return undefined
    const next = rest.shift()
    if (next) return { task: next, lane: 'rest' }
    return undefined
  }

  function putBack(lane: Lane, task: UploadTask): void {
    if (lane === 'first') first.unshift(task)
    else rest.unshift(task)
  }

  async function pump(): Promise<void> {
    if (pumping) return
    pumping = true
    try {
      for (;;) {
        const next = take()
        if (!next) return
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          putBack(next.lane, next.task)
          hold(next.lane)
          return
        }
        const started = epoch
        try {
          await next.task()
        } catch {
          // Svuotata mentre girava: il task è di un account uscito, non si rimette e non si segnala.
          if (started !== epoch) continue
          onFail()
          putBack(next.lane, next.task)
          hold(next.lane)
          return
        }
      }
    } finally {
      pumping = false
    }
  }

  function enqueue(task: UploadTask): void {
    rest.push(task)
    void pump()
  }

  function enqueueFirst(task: UploadTask): void {
    first.push(task)
    void pump()
  }

  function clear(): void {
    epoch += 1
    first.length = 0
    rest.length = 0
    holdFirst = false
    holdRest = false
  }

  return { enqueue, enqueueFirst, clear }
}
