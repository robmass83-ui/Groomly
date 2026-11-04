import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FILE_AMMESSI, fileSorgente, fileTsx, frasiNelFile } from './frasiFisse'

/** Tutte le schermate, salvo i test e le pagine di sviluppo (kit, anteprima beta). */
export const puliti = [...fileTsx('src/pages'), ...fileTsx('src/components')]
  .map((file) => file.replace(/\\/g, '/'))
  .sort()

const sorgenti = [...fileSorgente('src'), ...fileSorgente('functions/src')]
  .map((file) => file.replace(/\\/g, '/'))
  .filter((file) => !FILE_AMMESSI.has(file))
  .sort()

/** Frasi che T4, T5 e T6 devono tradurre: si tolgono da `debitoFrasi.json` man mano. */
const frasiDaPagare = JSON.parse(readFileSync('src/i18n/debitoFrasi.json', 'utf8')) as Record<string, string[]>
const trovate = new Map(sorgenti.map((file) => [file, frasiNelFile(join(process.cwd(), file))]))

describe('frasi fisse', () => {
  it('nessun file tiene una frase italiana fissa fuori dall’elenco di debito', () => {
    const nuove = [...trovate].flatMap(([file, frasi]) => frasi
      .filter((frase) => !frasiDaPagare[file]?.includes(frase))
      .map((frase) => `${file}: ${frase}`))
    expect(nuove).toEqual([])
  })

  it('l’elenco di debito si svuota: una frase tolta dal codice si toglie anche da lì', () => {
    const vecchie = Object.entries(frasiDaPagare).flatMap(([file, frasi]) => frasi
      .filter((frase) => !trovate.get(file)?.includes(frase))
      .map((frase) => `${file}: ${frase}`))
    expect(vecchie).toEqual([])
  })
})
