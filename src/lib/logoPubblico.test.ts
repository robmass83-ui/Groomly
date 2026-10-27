import { describe, expect, it } from 'vitest'
import { idFileLogo, logoDaThumb, logoSicuro } from './logoPubblico'

describe('logo pubblico', () => {
  it('tiene l’anteprima immagine e scarta il resto', () => {
    const png = new Uint8Array([137, 80, 78, 71])
    const url = logoDaThumb('image/png', png)
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
    expect(logoSicuro(url)).toBe(url)
    expect(logoDaThumb('text/html', png)).toBe('')
    expect(logoDaThumb('image/png', new Uint8Array(25001))).toBe('')
    expect(logoSicuro('javascript:alert(1)')).toBe('')
    expect(idFileLogo('file:6f1d7a2e-4c3b-4d2a-9e1f-0a1b2c3d4e5f')).toBe('6f1d7a2e-4c3b-4d2a-9e1f-0a1b2c3d4e5f')
    expect(idFileLogo('file:../segreto')).toBe('')
  })
})
