import { describe, expect, it } from 'vitest'
import { EXTRA_NOTE_LIMIT, EXTRA_NOTE_MAX, cleanExtraNote, hasExtraNotes } from './dogNotes'

describe('cleanExtraNote', () => {
  it('tiene 240 caratteri, scarta il vuoto e il 241', () => {
    expect(cleanExtraNote('  si muove  ')).toBe('si muove')
    expect(cleanExtraNote('   ')).toBeNull()
    expect(cleanExtraNote('a'.repeat(EXTRA_NOTE_MAX))).toHaveLength(EXTRA_NOTE_MAX)
    expect(cleanExtraNote('a'.repeat(EXTRA_NOTE_MAX + 1))).toBeNull()
    expect(EXTRA_NOTE_LIMIT).toBe(40)
  })

  it('hasExtraNotes ignora il vuoto', () => {
    expect(hasExtraNotes(undefined)).toBe(false)
    expect(hasExtraNotes([{ text: '  ' }])).toBe(false)
    expect(hasExtraNotes([{ text: 'in piedi' }])).toBe(true)
  })
})
