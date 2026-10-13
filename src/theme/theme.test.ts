import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { applyPlatform, resolveTheme } from './theme'
import { SIZES } from './sizes'

it('i token chiari e scuri sono quelli del mockup', () => {
  const css = readFileSync(createRequire(import.meta.url).resolve('./tokens.css'), 'utf8')
  expect(css).toContain('--bg: #ECEFF4;')
  expect(css).toContain('--surf3: #FFFFFF;')
  expect(css).toContain('--pri-solid: #3A5BA0;')
  expect(css).toContain('--pri-ink: #2C4785;')
  expect(css).toContain('--sh-btn: 0 6px 14px -6px rgba(58,91,160,.55), inset 0 1px 0 rgba(255,255,255,.14);')
  expect(css).toContain('--s-bagno: #2775C9;')
  expect(css).toContain('--s-bagno-bg: #E2EFFB;')
  expect(css).toContain('--scrim: rgba(18,26,42,.42);')
  expect(css).toContain('--sh-foot: 0 -8px 20px -14px rgba(20,30,50,.25);')
  const dark = css.slice(css.indexOf('[data-theme="dark"]'))
  expect(dark).toContain('--bg: #0C111A;')
  expect(dark).toContain('--pri: #8AA4E8;')
  expect(dark).toContain('--pri-solid: #4F6FC0;')
  expect(dark).toContain('--surf3: #232C3C;')
  expect(dark).toContain('--s-combo: #B7A2F5;')
  expect(dark).toContain('--sen: #a891f1;')
})

it('aggiunge le misure del mockup senza ingrandire quelle esistenti', () => {
  expect(SIZES.calendar.hourHeight).toBe(50)
  expect(SIZES.button.h).toBe(26)
  expect(SIZES.button.hLg).toBe(34)
  expect(SIZES.field).toEqual({ h: 32, hLg: 44, label: 11, radius: 9, gap: 4, areaMin: 48 })
  expect(SIZES.button.hMd).toBe(30)
  expect(SIZES.button.radiusMd).toBe(8)
  expect(SIZES.serviceChip).toEqual({ h: 20, radius: 6, padX: 6, gap: 3, rowGap: 5 })
  expect(SIZES.filterChip).toEqual({ h: 26, padX: 10, font: 11.5 })
  expect(SIZES.pill).toEqual({ h: 20, padX: 8, dot: 6 })
  expect(SIZES.timeBox).toEqual({ w: 42, radius: 8, padY: 3, time: 12, duration: 10 })
  expect(SIZES.iconTile).toEqual({ size: 28, radius: 8, sm: 24, smRadius: 7 })
  expect(SIZES.switch).toEqual({ w: 38, h: 22, knob: 16 })
  expect(SIZES.kv).toEqual({ label: 9.5, value: 13, radius: 10, padY: 6, padX: 10 })
  expect(SIZES.sectionBar).toEqual({ w: 3, h: 14, radius: 2, countH: 17 })
  expect(SIZES.sheet.footer).toEqual({ padTop: 8, padX: 12, padBottom: 12, gap: 7 })
  expect(SIZES.chip.radius).toBe(999)
})

describe('resolveTheme', () => {
  it('rispetta chiaro, scuro e auto', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
  })
})

describe('applyPlatform', () => {
  it('segna l’app Android e la toglie nel browser', () => {
    const css = readFileSync(createRequire(import.meta.url).resolve('../index.css'), 'utf8')
    expect(css).toContain('--safe-top: env(safe-area-inset-top, 0px);')
    expect(css).toContain(':root.native')
    applyPlatform(true)
    expect(document.documentElement.classList.contains('native')).toBe(true)
    applyPlatform(false)
    expect(document.documentElement.classList.contains('native')).toBe(false)
  })
})
