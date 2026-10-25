import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fileTsx, frasiNelFile } from './frasiFisse'

/** Tutte le schermate, salvo i test e la pagina del kit. */
export const puliti = [...fileTsx('src/pages'), ...fileTsx('src/components')]
  .map((file) => file.replace(/\\/g, '/'))
  .sort()

describe('frasi fisse', () => {
  it('i file già tradotti non tengono una frase italiana fissa', () => {
    const resti = puliti.flatMap((file) => frasiNelFile(join(process.cwd(), file)).map((frase) => `${file}: ${frase}`))
    expect(resti).toEqual([])
  })
})
