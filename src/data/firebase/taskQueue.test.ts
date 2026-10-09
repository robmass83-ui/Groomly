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
})
