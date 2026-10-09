import { describe, expect, it } from 'vitest'
import { reminderText } from './reminderText'

describe('reminderText', () => {
  it('riassume i mensili da programmare', () => {
    expect(reminderText([])).toBeNull()
    expect(reminderText([{ dog: { name: 'Toby' } }])).toBe('1 mensile da programmare: Toby')
    expect(reminderText([
      { dog: { name: 'Toby' } },
      { dog: { name: 'Kira' } },
      { dog: { name: 'Oscar' } },
      { dog: { name: 'Luna' } },
    ])).toBe('4 mensili da programmare: Toby, Kira, Oscar')
  })
})
