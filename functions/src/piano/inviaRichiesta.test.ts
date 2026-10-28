import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('inviaRichiesta pubblica', () => {
  it('non scrive sul ramo inizio/fine e il posto usa la durata del servizio', () => {
    const funzione = readFileSync('functions/src/piano/inviaRichiesta.ts', 'utf8')
    expect(funzione).toContain('ingressoRichiestaPubblica')
    expect(funzione).toContain('contaAperte')
    expect(funzione).not.toContain('quando.giorno && quando.ora')
    expect(funzione).toContain('intervalloRichiesta({ giorno: ingresso.giorno, ora: ingresso.ora })')
    expect(funzione).toContain('postiLiberiPer(input.salonId, quando.giorno, scelta.durataMin)')
    const index = readFileSync('functions/src/index.ts', 'utf8')
    const da = index.indexOf('export const inviaRichiesta')
    const a = index.indexOf('function chiaveBrevo')
    const corpo = index.slice(da, a)
    expect(corpo).toContain('chiaveBrevo()')
  })
})
