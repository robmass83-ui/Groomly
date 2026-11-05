import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LICENZE } from './licenze'

function produzione(lockfile: string): string[] {
  const lock = JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: Record<string, { dev?: boolean; version?: string }> }
  return Object.entries(lock.packages).flatMap(([percorso, voce]) => {
    if (percorso === '' || voce.dev === true || !percorso.includes('node_modules/')) return []
    return [`${percorso.slice(percorso.lastIndexOf('node_modules/') + 13)}@${voce.version}`]
  })
}

describe('elenco delle licenze', () => {
  it('ha ogni pacchetto di produzione dei due lockfile: se fallisce, npm run licenze', () => {
    const presenti = new Set(LICENZE.map((voce) => `${voce.nome}@${voce.versione}`))
    const mancanti = [...produzione('package-lock.json'), ...produzione('functions/package-lock.json')].filter((voce) => !presenti.has(voce))
    expect(mancanti).toEqual([])
  })

  it('nessuna licenza vuota e nessuna GPL obbligatoria', () => {
    expect(LICENZE.filter((voce) => voce.licenza.trim() === '')).toEqual([])
    const copyleft = LICENZE.filter((voce) => /GPL/i.test(voce.licenza) && !/ OR /.test(voce.licenza))
    expect(copyleft).toEqual([])
  })

  it('jszip si usa con la MIT', () => {
    expect(LICENZE.find((voce) => voce.nome === 'jszip')?.licenza).toBe('MIT')
  })

  it('il documento degli asset esiste', () => {
    expect(existsSync('docs/licenze_asset.md')).toBe(true)
  })
})
