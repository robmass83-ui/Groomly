import { afterEach, describe, expect, it } from 'vitest'
import { bucketCopie, eseguiCopie } from './copieCloud'

describe('copie cloud sul server', () => {
  afterEach(() => {
    delete process.env.COPIE_BUCKET
  })

  it('senza bucket esce senza scrivere', async () => {
    delete process.env.COPIE_BUCKET
    expect(bucketCopie()).toBeNull()
    expect(await eseguiCopie()).toEqual({ scritto: false })
  })
})
