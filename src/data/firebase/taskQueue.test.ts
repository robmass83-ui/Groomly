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
})
