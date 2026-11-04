import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Legge tokens.css e controlla che le coppie testo/fondo siano leggibili (>= 4,5:1) nei due temi.
const css = readFileSync(resolve(process.cwd(), 'src/theme/tokens.css'), 'utf8')

type Rgba = { r: number; g: number; b: number; a: number }

function blocco(selettore: string): Record<string, string> {
  const inizio = css.indexOf(selettore + ' {')
  const fine = css.indexOf('\n}', inizio)
  const corpo = css.slice(inizio + selettore.length + 2, fine)
  const out: Record<string, string> = {}
  for (const m of corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

const CHIARO = blocco(':root')
const SCURO = { ...CHIARO, ...blocco('[data-theme="dark"]') }

function colore(valore: string, vars: Record<string, string>): Rgba {
  const v = valore.trim()
  const rif = v.match(/^var\((--[\w-]+)\)$/)
  if (rif) return colore(vars[rif[1]], vars)
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1]
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 }
  }
  const rgba = v.match(/^rgba?\(([^)]+)\)$/)
  if (rgba) {
    const p = rgba[1].split(',').map((x) => parseFloat(x))
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }
  }
  throw new Error(`Colore non riconosciuto: ${valore}`)
}

function sopra(primo: Rgba, fondo: Rgba): Rgba {
  const a = primo.a
  return { r: primo.r * a + fondo.r * (1 - a), g: primo.g * a + fondo.g * (1 - a), b: primo.b * a + fondo.b * (1 - a), a: 1 }
}

function luminanza({ r, g, b }: Rgba): number {
  const c = [r, g, b].map((x) => {
    const s = x / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

function rapporto(testo: string, fondo: string, vars: Record<string, string>, base = '--card'): number {
  const sfondo = sopra(colore(fondo, vars), colore(vars[base], vars))
  const t = sopra(colore(testo, vars), sfondo)
  const [a, b] = [luminanza(t), luminanza(sfondo)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

const SERVIZI = ['bagno', 'taglio', 'combo', 'strip', 'nodi', 'derma', 'anti', 'pelo', 'mens']

const temi: [string, Record<string, string>][] = [['chiaro', CHIARO], ['scuro', SCURO]]

describe.each(temi)('colori del testo, tema %s', (_nome, vars) => {
  it.each(SERVIZI)('--s-%s su il suo fondo', (s) => {
    expect(rapporto(`var(--s-${s})`, `var(--s-${s}-bg)`, vars)).toBeGreaterThanOrEqual(4.5)
  })

  it('--tea su --tea-s', () => {
    expect(rapporto('var(--tea)', 'var(--tea-s)', vars)).toBeGreaterThanOrEqual(4.5)
  })

  it('testo della testata (--nome-a-testo) su --card, --surf e --bg', () => {
    for (const f of ['--card', '--surf', '--bg', '--line']) {
      expect(rapporto('var(--nome-a-testo)', `var(${f})`, vars), f).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('bollini numerici: testo su fondo pieno (--on-fill su --pri, --ok, --bad)', () => {
    for (const f of ['--pri', '--ok', '--bad']) {
      expect(rapporto('var(--on-fill)', `var(${f})`, vars), f).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('bollino personale e nuovo: --on-pri su --pri-solid e su --personal', () => {
    expect(rapporto('var(--on-pri)', 'var(--pri-solid)', vars)).toBeGreaterThanOrEqual(4.5)
    expect(rapporto('var(--on-pri)', 'var(--personal)', vars)).toBeGreaterThanOrEqual(4.5)
  })

  it('etichetta dell’ora attuale (--on-fill su --bad)', () => {
    expect(rapporto('var(--on-fill)', 'var(--bad)', vars)).toBeGreaterThanOrEqual(4.5)
  })

  it('testi di base su --card', () => {
    for (const t of ['--tx', '--tx2', '--tx3', '--ok', '--warn', '--bad']) {
      expect(rapporto(`var(${t})`, 'var(--card)', vars), t).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('etichetta BETA: --plus-ink su --plus-s e --sal-ink su --sal-s', () => {
    expect(rapporto('var(--plus-ink)', 'var(--plus-s)', vars)).toBeGreaterThanOrEqual(4.5)
    expect(rapporto('var(--sal-ink)', 'var(--sal-s)', vars)).toBeGreaterThanOrEqual(4.5)
  })
})
