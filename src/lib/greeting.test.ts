import { describe, expect, it } from 'vitest'
import { greetingName, greetingText } from './greeting'

describe('saluto', () => {
  it('riconosce Laura e le due email di Roberto', () => {
    expect(greetingName('laura.masala@tiscali.it')).toBe('Laura')
    expect(greetingName('masala.roberto@hotmail.it')).toBe('Roberto')
    expect(greetingName('robmass83@gmail.com')).toBe('Roberto')
  })

  it('ignora maiuscole e spazi', () => {
    expect(greetingName('  Laura.Masala@Tiscali.IT ')).toBe('Laura')
    expect(greetingName('RobMass83@Gmail.com')).toBe('Roberto')
  })

  it('senza abbinamento non c’è nome', () => {
    expect(greetingName('maria@salone.it')).toBeNull()
    expect(greetingName('')).toBeNull()
    expect(greetingName(null)).toBeNull()
    expect(greetingName(undefined)).toBeNull()
  })

  it('compone il testo del saluto', () => {
    expect(greetingText('laura.masala@tiscali.it')).toBe('Ciao Laura')
    expect(greetingText('robmass83@gmail.com')).toBe('Ciao Roberto')
    expect(greetingText('maria@salone.it')).toBe('Ciao!')
    expect(greetingText(null)).toBe('Ciao!')
  })

  it('preferisce il nome dell’account e tiene Laura se il nome è vuoto', () => {
    expect(greetingText('ada@salone.it', 'Ada')).toBe('Ciao Ada')
    expect(greetingText('laura.masala@tiscali.it', 'Giulia')).toBe('Ciao Giulia')
    expect(greetingText('laura.masala@tiscali.it', '')).toBe('Ciao Laura')
    expect(greetingText('laura.masala@tiscali.it', undefined)).toBe('Ciao Laura')
    expect(greetingText('sconosciuto@salone.it', '  ')).toBe('Ciao!')
    expect(greetingText('sconosciuto@salone.it', '')).toBe('Ciao!')
  })
})
