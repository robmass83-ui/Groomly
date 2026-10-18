import { describe, expect, it } from 'vitest'
import { accountSummary, businessName, salonSummary, summarizeDirectory } from './salonDirectory'

describe('salonDirectory', () => {
  it('conta gli account e le toelettature distinte e ordina le righe', () => {
    const directory = summarizeDirectory([
      { uid: 'b', firstName: 'Laura', lastName: '', email: 'laura.masala@tiscali.it', salonId: 'shared' },
      { uid: 'a', firstName: '', lastName: '', email: 'masala.roberto@hotmail.it', salonId: 'shared' },
      { uid: 'c', firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: 'c' },
      { uid: 'd', firstName: '', lastName: '', email: '', salonId: '' },
    ], new Map([['shared', ' I Pelosetti '], ['c', '']]))
    expect(directory.accountCount).toBe(4)
    expect(directory.salonCount).toBe(2)
    expect(directory.entries.map((entry) => entry.ownerName)).toEqual(['Laura', 'masala.roberto@hotmail.it', 'Ada Neri'])
    expect(directory.entries[0].salonName).toBe('I Pelosetti')
    expect(directory.entries[2].salonName).toBe('Senza nome')
    expect(accountSummary(1)).toBe('1 account creato')
    expect(accountSummary(2)).toBe('2 account creati')
    expect(salonSummary(1)).toBe('1 toelettatura creata')
    expect(salonSummary(0)).toBe('0 toelettature create')
  })

  it('il nome attività esce da business.name', () => {
    expect(businessName({ business: { name: '  Bauci  ' } })).toBe('Bauci')
    expect(businessName(null)).toBe('')
    expect(businessName({ business: { name: 3 } })).toBe('')
  })
})
