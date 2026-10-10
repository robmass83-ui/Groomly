import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme'

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

describe('resolveTheme', () => {
  it('rispetta chiaro, scuro e auto', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
  })
})
