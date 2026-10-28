import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('informativa prenotazione', () => {
  it('resta sopra il modulo e non naviga verso /privacy/', () => {
    const js = readFileSync('hosting/s/pagina.js', 'utf8')
    expect(js.includes("id = 'informativa'") || js.includes('torna-prenotazione')).toBe(true)
    expect(js).not.toContain("privacy.href = '/privacy/")
    expect(js).toContain('Torna alla prenotazione')
    expect(js).toContain('Back to the booking')
    expect(js).toContain('Volver a la reserva')
    const torna = js.match(/torna\.addEventListener\('click', function \(\) \{([\s\S]*?)\n    \}\)/)
    expect(torna).not.toBeNull()
    const corpo = torna ? torna[1] : ''
    expect(corpo).toContain('chiudiInformativa()')
    expect(corpo.indexOf('chiudiInformativa()')).toBeLessThan(corpo.indexOf('history.back()'))
    expect(js).toMatch(/contentDocument[\s\S]*?addEventListener\('click'[\s\S]*?preventDefault\(\)/)
  })
})
