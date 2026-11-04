import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/components/layout/bottomNav.css', 'utf8')

function blocco(selettore: string): string {
  const inizio = css.indexOf(`${selettore} {`)
  expect(inizio, `manca ${selettore}`).toBeGreaterThanOrEqual(0)
  return css.slice(inizio, css.indexOf('}', inizio))
}

describe('etichetta della barra in basso', () => {
  it('non usa i puntini di sospensione', () => {
    expect(blocco('.bottom-nav__label')).not.toMatch(/text-overflow:\s*ellipsis/)
    expect(blocco('.bottom-nav__label')).not.toMatch(/overflow:\s*hidden/)
  })

  it('sui telefoni stretti la stessa parola e\' piu\' piccola', () => {
    expect(css).toMatch(/@media \(max-width: 399px\)[\s\S]*\.bottom-nav__label[\s\S]*font-size:\s*9px/)
  })
})
