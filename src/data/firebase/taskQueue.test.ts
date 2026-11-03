import { describe, expect, it, vi } from 'vitest'
import { createUploadQueue, RIPROVA_MS } from './taskQueue'

describe('createUploadQueue', () => {
  it('un upload fallito segnala l’errore e non lo ingoia', async () => {
    const onFail = vi.fn()
    const queue = createUploadQueue(onFail)
    queue.enqueue(() => Promise.reject(new Error('storage')))
    await vi.waitFor(() => {
      expect(onFail).toHaveBeenCalledOnce()
    })
  })

  it('in assenza di rete accoda senza segnalare un errore', () => {
    const onFail = vi.fn()
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const queue = createUploadQueue(onFail)
    const task = vi.fn(() => Promise.resolve())
    queue.enqueue(task)
    expect(task).not.toHaveBeenCalled()
    expect(onFail).not.toHaveBeenCalled()
    online.mockRestore()
  })

  it('esegue la cancellazione prima di un salvataggio già in coda', async () => {
    const order: string[] = []
    let releaseSave: () => void = () => {}
    const saveGate = new Promise<void>((resolve) => { releaseSave = resolve })
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const queue = createUploadQueue(vi.fn())
    queue.enqueue(() => saveGate.then(() => { order.push('save') }))
    queue.enqueueFirst(() => { order.push('delete'); return Promise.resolve() })
    online.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(order).toEqual(['delete']))
    releaseSave()
    await vi.waitFor(() => expect(order).toEqual(['delete', 'save']))
    online.mockRestore()
  })

  it('clear svuota entrambe le liste: tornati online nessun task parte', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const queue = createUploadQueue(vi.fn())
    const save = vi.fn(() => Promise.resolve())
    const remove = vi.fn(() => Promise.resolve())
    queue.enqueue(save)
    queue.enqueueFirst(remove)
    queue.clear()
    online.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(save).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    online.mockRestore()
  })

  it('dopo clear un task nuovo parte e uno già in corso che fallisce non rientra', async () => {
    const onFail = vi.fn()
    const queue = createUploadQueue(onFail)
    let fail: (error: Error) => void = () => {}
    const running = vi.fn(() => new Promise<void>((_resolve, reject) => { fail = reject }))
    queue.enqueue(running)
    await vi.waitFor(() => expect(running).toHaveBeenCalledOnce())
    queue.clear()
    const next = vi.fn(() => Promise.resolve())
    queue.enqueue(next)
    fail(new Error('rete'))
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce())
    expect(onFail).not.toHaveBeenCalled()
    expect(running).toHaveBeenCalledOnce()
  })

  it('inAttesa dice se c’è un compito in lista o in corso, e torna falso dopo clear()', async () => {
    const queue = createUploadQueue(vi.fn())
    expect(queue.inAttesa()).toBe(false)
    let finish: () => void = () => undefined
    queue.enqueue(() => new Promise<void>((resolve) => { finish = resolve }))
    expect(queue.inAttesa()).toBe(true)
    queue.enqueue(() => Promise.resolve())
    queue.clear()
    expect(queue.inAttesa()).toBe(true)
    finish()
    await vi.waitFor(() => {
      expect(queue.inAttesa()).toBe(false)
    })
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    queue.enqueue(() => Promise.resolve())
    expect(queue.inAttesa()).toBe(true)
    queue.clear()
    expect(queue.inAttesa()).toBe(false)
    online.mockRestore()
  })
  it('con la rete accesa un upload fallito riprova da solo e avvisa una volta sola', async () => {
    vi.useFakeTimers()
    try {
      const onFail = vi.fn()
      const queue = createUploadQueue(onFail)
      let tentativi = 0
      queue.enqueue(() => {
        tentativi += 1
        return tentativi < 3 ? Promise.reject(new Error('rete')) : Promise.resolve()
      })
      await vi.advanceTimersByTimeAsync(0)
      expect(tentativi).toBe(1)
      expect(queue.inAttesa()).toBe(true)
      await vi.advanceTimersByTimeAsync(RIPROVA_MS)
      expect(tentativi).toBe(2)
      await vi.advanceTimersByTimeAsync(RIPROVA_MS)
      expect(tentativi).toBe(3)
      expect(queue.inAttesa()).toBe(false)
      expect(onFail).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('una copia del backup ferma in coda non conta come modifica in sospeso', async () => {
    const queue = createUploadQueue(vi.fn())
    queue.enqueue(() => Promise.reject(new Error('drive')), { copia: true })
    await vi.waitFor(() => expect(queue.inAttesa()).toBe(false))
    queue.enqueue(() => Promise.resolve())
    await vi.waitFor(() => expect(queue.inAttesa()).toBe(true))
    queue.clear()
  })
})
