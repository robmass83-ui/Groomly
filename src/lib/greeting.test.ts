import { describe, expect, it } from 'vitest'
import { greetingText } from './greeting'

describe('saluto', () => {
  it('usa il nome del profilo', () => {
    expect(greetingText('Laura')).toContain('Laura')
    expect(greetingText('  Ada ')).toContain('Ada')
  })

  it('senza nome saluta senza nome', () => {
    expect(greetingText('')).toBe(greetingText(null))
    expect(greetingText(undefined)).not.toContain('undefined')
  })
})
