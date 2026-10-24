import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

describe('ingresso scheda', () => {
  it('scivola di 16 px in 180 ms e sta ferma se i movimenti sono ridotti', () => {
    const css = readFileSync(createRequire(import.meta.url).resolve('./schedaEnter.css'), 'utf8')
    expect(css).toContain('@keyframes scheda-enter')
    expect(css).toContain('translateX(16px)')
    expect(css).toContain('translateX(0)')
    expect(css).toContain('animation: scheda-enter 180ms ease-out')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation: none')
    expect(css).toContain('.scheda-enter.is-settled')
    expect(css).toContain('transform: none')
    expect(css).toContain('.scheda-scroll button')
    expect(css).toContain('touch-action: pan-y')
  })
})
