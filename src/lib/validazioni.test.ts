import { describe, expect, it } from 'vitest'
import { completeBirthday } from './dogScreen'
import { pesoDaTesto, servizioDoppio, telefonoValido, titolareDaRegistrazione } from './validazioni'

describe('telefonoValido', () => {
  it.each(['+39 333 123 4567', '+39 (02) 1234-5678', '02/123.456', '123456'])('accetta %s', (t) => {
    expect(telefonoValido(t)).toBe(true)
  })
  it.each(['', 'abc', '12345', '+39', '333abc4567', '1234567890123456'])('rifiuta %j', (t) => {
    expect(telefonoValido(t)).toBe(false)
  })
})

describe('pesoDaTesto', () => {
  it.each([['', null], ['  ', null], ['12,5', 12.5], ['12.5', 12.5], [' 12 ', 12], [',5', 0.5], ['150', 150], ['0,1', 0.1]])(
    'legge %j come %s',
    (t, atteso) => {
      expect(pesoDaTesto(t as string)).toBe(atteso)
    },
  )
  it.each(['1e3', '0x10', '0', '0,05', '150,5', '12,', '12.5.1', '1 000', '-3', 'abc'])('%j non è valido', (t) => {
    expect(pesoDaTesto(t)).toBeNaN()
  })
})

describe('servizioDoppio', () => {
  const servizi = [{ id: 'a', name: 'Bagno' }]
  it('trova il nome uguale ignorando spazi e maiuscole', () => {
    expect(servizioDoppio('  bagno ', servizi)).toEqual({ id: 'a', name: 'Bagno' })
  })
  it('ignora gli accenti', () => {
    expect(servizioDoppio('Bàgno', servizi)).toEqual({ id: 'a', name: 'Bagno' })
  })
  it('esclude il servizio che si sta modificando', () => {
    expect(servizioDoppio('BAGNO', servizi, 'a')).toBeNull()
  })
  it('nome diverso non è doppio', () => {
    expect(servizioDoppio('Taglio', servizi)).toBeNull()
  })
})

describe('completeBirthday con la data di oggi', () => {
  const oggi = new Date(2026, 10, 3)
  it('accetta oggi', () => {
    expect(completeBirthday('11', '3', 2026, oggi)).toEqual({ birthMonth: 11, birthDay: 3 })
  })
  it('rifiuta domani con anno', () => {
    expect(completeBirthday('11', '4', 2026, oggi)).toBe('invalido')
  })
  it('rifiuta un mese futuro dello stesso anno', () => {
    expect(completeBirthday('12', '25', 2026, oggi)).toBe('invalido')
  })
  it('accetta lo stesso giorno nell\'anno scorso', () => {
    expect(completeBirthday('12', '25', 2025, oggi)).not.toBe('invalido')
  })
  it('senza anno non è mai futuro', () => {
    expect(completeBirthday('12', '25', null, oggi)).not.toBe('invalido')
  })
  it('29 febbraio senza anno e con anno bisestile è valido', () => {
    expect(completeBirthday('2', '29', null, oggi)).not.toBe('invalido')
    expect(completeBirthday('2', '29', 2024, oggi)).not.toBe('invalido')
  })
  it('a inizio anno', () => {
    const capodanno = new Date(2026, 0, 1)
    expect(completeBirthday('1', '1', 2026, capodanno)).not.toBe('invalido')
    expect(completeBirthday('1', '2', 2026, capodanno)).toBe('invalido')
  })
  it('vuoto', () => {
    expect(completeBirthday('', '', null, oggi)).toBe('vuoto')
  })
})

describe('titolareDaRegistrazione', () => {
  it('unisce nome e cognome, senza spazi in più, al massimo 80 caratteri', () => {
    expect(titolareDaRegistrazione(' Prova ', ' Account ')).toBe('Prova Account')
    expect(titolareDaRegistrazione('Ada', '')).toBe('Ada')
    expect(titolareDaRegistrazione('a'.repeat(100), 'B')).toHaveLength(80)
  })
})
