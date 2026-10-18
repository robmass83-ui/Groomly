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
  expect(css).toContain('--tx3: #5C677A;')
  expect(css).toContain('--warn: #7A4C09;')
  expect(css).toContain('--sh-btn: 0 6px 14px -6px rgba(58,91,160,.55), inset 0 1px 0 rgba(255,255,255,.14);')
  expect(css).toContain('--s-bagno: #2775C9;')
  expect(css).toContain('--s-bagno-bg: #E2EFFB;')
  expect(css).toContain('--scrim: rgba(18,26,42,.42);')
  expect(css).toContain('--sh-foot: 0 -8px 20px -14px rgba(20,30,50,.25);')
  const dark = css.slice(css.indexOf('[data-theme="dark"]'))
  expect(dark).toContain('--bg: #0C111A;')
  expect(dark).toContain('--tx3: #8491A6;')
  expect(dark).toContain('--pri: #8AA4E8;')
  expect(dark).toContain('--pri-solid: #4F6FC0;')
  expect(dark).toContain('--surf3: #232C3C;')
  expect(dark).toContain('--s-combo: #B7A2F5;')
  expect(dark).toContain('--sen: #a891f1;')
})

it('usa le misure comode per il tocco e per il testo', () => {
  expect(SIZES.calendar.hourHeight).toBe(50)
  expect(SIZES.button.h).toBe(44)
  expect(SIZES.button.hLg).toBe(48)
  expect(SIZES.field).toEqual({ h: 44, hLg: 44, label: 12, radius: 10, gap: 4, areaMin: 48 })
  expect(SIZES.button.hMd).toBe(44)
  expect(SIZES.button.radiusMd).toBe(10)
  expect(SIZES.serviceChip).toEqual({ h: 28, radius: 6, padX: 8, gap: 4, rowGap: 6 })
  expect(SIZES.filterChip).toEqual({ h: 44, padX: 12, font: 13 })
  expect(SIZES.pill).toEqual({ h: 20, padX: 8, dot: 6 })
  expect(SIZES.timeBox).toEqual({ w: 42, radius: 8, padY: 3, time: 12, duration: 10 })
  expect(SIZES.iconTile).toEqual({ size: 28, radius: 8, sm: 24, smRadius: 7 })
  expect(SIZES.switch).toEqual({ w: 48, h: 28, knob: 22 })
  expect(SIZES.kv).toEqual({ label: 12, value: 14, radius: 10, padY: 8, padX: 10 })
  expect(SIZES.sectionBar).toEqual({ w: 3, h: 14, radius: 2, countH: 17 })
  expect(SIZES.sheet.footer).toEqual({ padTop: 8, padX: 12, padBottom: 12, gap: 7 })
  expect(SIZES.chip.radius).toBe(999)
  expect(SIZES.headerIconBtn).toBe(44)
  expect(SIZES.search.h).toBe(44)
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
