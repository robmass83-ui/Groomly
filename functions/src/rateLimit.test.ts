import { describe, expect, it } from 'vitest'
import { EMAIL_RATE_WINDOW_MS, rateDecision } from './rateLimit'

describe('limite email', () => {
  const now = 1_000_000

  it('accetta tre invii e blocca il quarto nella finestra di 15 minuti', () => {
    const first = rateDecision([], now)
    const second = rateDecision(first.next, now + 1)
    const third = rateDecision(second.next, now + 2)
    const fourth = rateDecision(third.next, now + 3)
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(third.ok).toBe(true)
    expect(third.next).toHaveLength(3)
    expect(fourth.ok).toBe(false)
    expect(fourth.next).toEqual(third.next)
  })

  it('dimentica un invio più vecchio di 15 minuti', () => {
    const old = now - EMAIL_RATE_WINDOW_MS
    const decision = rateDecision([old, now - 10, now - 5], now)
    expect(decision.ok).toBe(true)
    expect(decision.next).toEqual([now - 10, now - 5, now])
  })

  it('ignora valori che non sono orari', () => {
    const decision = rateDecision(['x', null, now - 1], now)
    expect(decision.ok).toBe(true)
    expect(decision.next).toEqual([now - 1, now])
  })
})
