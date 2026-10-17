import { describe, expect, it, vi } from 'vitest'
import { createUploadQueue } from './taskQueue'

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
})
