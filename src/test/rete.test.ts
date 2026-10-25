import { afterEach, describe, expect, it, vi } from 'vitest'

describe('rete dei test', () => {
  afterEach(() => {
    vi.stubGlobal('fetch', globalThis.fetch)
  })

  it('dopo unstub un host esterno non esce dal processo', async () => {
    vi.unstubAllGlobals()
    const response = await fetch('https://api.github.com/repos/robmass83-ui/Groomly/releases/latest')
    expect(response.status).toBe(503)
    expect(await response.text()).toBe('offline')
  })
})
