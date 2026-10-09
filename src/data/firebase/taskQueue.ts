/**
 * Coda in memoria degli upload verso Storage.
 * Non sopravvive a un refresh: non si aggiunge una chiave localStorage.
 * Un task rifiutato chiama onFail, così la UI mostra «Salvataggio non riuscito»,
 * e resta in coda fino al prossimo evento online.
 */
export function createUploadQueue(onFail: () => void) {
  const tasks: Array<() => void> = []
  let onlineBound = false

  function listenOnline(): void {
    if (onlineBound || typeof window === 'undefined') return
    onlineBound = true
    window.addEventListener('online', () => {
      const pending = tasks.splice(0, tasks.length)
      for (const task of pending) task()
    })
  }

  function enqueue(task: () => Promise<void>): void {
    const run = () => {
      void task().catch(() => {
        onFail()
        tasks.push(run)
        listenOnline()
      })
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      tasks.push(run)
      listenOnline()
      return
    }
    run()
  }

  return { enqueue }
}
