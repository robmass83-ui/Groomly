/**
 * Coda in memoria degli upload verso Storage.
 * Non sopravvive a un refresh: non si aggiunge una chiave localStorage.
 * Le cancellazioni (enqueueFirst) partono prima degli altri salvataggi.
 * Un task rifiutato chiama onFail una volta, così la UI mostra «Salvataggio non riuscito»,
 * e resta in testa alla sua lista fino al prossimo evento online.
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
        try {
          await next.task()
        } catch {
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

  return { enqueue, enqueueFirst }
}
