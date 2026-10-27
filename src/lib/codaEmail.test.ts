import { describe, expect, it } from 'vitest'
import { bloccaCane, dovute, emailValida, eventoDi, fermaRiga, unisciRiga, visibiliInHome, type RigaCoda } from './codaEmail'

const base: RigaCoda = {
  id: '1', tipo: 'promemoria', dogId: 'd', appointmentId: 'a', evento: 'promemoria:a:2026-10-28',
  parteIl: '2026-10-27T16:00:00.000Z', stato: 'in_coda', motivo: '', email: 'a@b.it', nomeCane: 'Fido',
}

describe('coda email', () => {
  it('accetta solo un indirizzo con chiocciola e punto dopo', () => {
    expect(emailValida('  maria@salon.it ')).toBe(true)
    expect(emailValida('maria@salon')).toBe(false)
    expect(emailValida('')).toBe(false)
  })

  it('la stessa evento non duplica e ferma non rinasce', () => {
    const prima = unisciRiga([], base)
    const seconda = unisciRiga(prima, { ...base, id: '2' })
    expect(seconda).toHaveLength(1)
    const fermata = fermaRiga(seconda[0])
    expect(fermata).toEqual({ ...seconda[0], stato: 'fermata', motivo: 'fermata' })
    expect(unisciRiga([fermata], { ...base, id: '3', stato: 'in_coda' })).toEqual([fermata])
  })

  it('in coda tiene id e parteIl già scritti, non inviata prende la riga nuova', () => {
    const aggiornata = unisciRiga([base], {
      ...base,
      id: '2',
      parteIl: '2026-10-27T19:00:00.000Z',
      email: 'nuova@b.it',
      nomeCane: 'Luna',
    })
    expect(aggiornata).toEqual([{ ...base, email: 'nuova@b.it', nomeCane: 'Luna' }])

    const nonInviata: RigaCoda = { ...base, id: 'n', evento: 'altro', stato: 'non_inviata' }
    const nuova: RigaCoda = { ...nonInviata, id: 'n2', stato: 'in_coda', parteIl: '2026-10-27T19:00:00.000Z' }
    expect(unisciRiga([nonInviata], nuova)).toEqual([nuova])

    const inviata: RigaCoda = { ...base, id: 'i', evento: 'inv', stato: 'inviata' }
    const chiusa: RigaCoda = { ...base, id: 'c', evento: 'chi', stato: 'chiusa' }
    expect(unisciRiga([inviata], { ...inviata, id: 'x', stato: 'in_coda' })).toEqual([inviata])
    expect(unisciRiga([chiusa], { ...chiusa, id: 'x', stato: 'in_coda' })).toEqual([chiusa])

    const aggiunta: RigaCoda = { ...base, id: 'z', evento: 'nuovo' }
    expect(unisciRiga([base], aggiunta)).toEqual([base, aggiunta])
  })

  it('il server manda solo le automatiche scadute, non le manuali', () => {
    const manuale: RigaCoda = { ...base, id: 'm', parteIl: null, evento: 'promemoria:b:2026-10-28' }
    const futuro: RigaCoda = { ...base, id: 'f', parteIl: '2026-10-27T20:00:00.000Z', evento: 'x' }
    expect(dovute([base, manuale, futuro], new Date('2026-10-27T16:01:00.000Z')).map((r) => r.id)).toEqual(['1'])
  })

  it('la manuale resta in home dopo mezzanotte, l’automatica inviata no', () => {
    const inviata: RigaCoda = { ...base, stato: 'inviata' }
    const manuale: RigaCoda = { ...base, id: 'm', parteIl: null, evento: 'm', stato: 'in_coda' }
    const viste = visibiliInHome([inviata, manuale], new Date('2026-10-28T08:00:00.000Z'))
    expect(viste.map((r) => r.id)).toEqual(['m'])
  })

  it('la manuale non inviata resta, la fermata senza ora no', () => {
    const nonInviata: RigaCoda = { ...base, id: 'n', parteIl: null, evento: 'n', stato: 'non_inviata' }
    const fermata: RigaCoda = { ...base, id: 'f', parteIl: null, evento: 'f', stato: 'fermata', motivo: 'fermata' }
    const viste = visibiliInHome([nonInviata, fermata], new Date('2026-11-01T10:00:00.000Z'))
    expect(viste.map((r) => r.id)).toEqual(['n'])
  })

  it('l’automatica dello stesso giorno di Roma resta in home', () => {
    const inviata: RigaCoda = { ...base, stato: 'inviata' }
    const viste = visibiliInHome([inviata], new Date('2026-10-27T16:30:00.000Z'))
    expect(viste.map((r) => r.id)).toEqual(['1'])
  })

  it('alle 23:30 UTC del 27 la home è già il 28 di Roma', () => {
    const ancoraIeri: RigaCoda = {
      ...base,
      id: 'ieri',
      evento: 'promemoria:ieri',
      parteIl: '2026-10-27T21:30:00.000Z',
    }
    const giaOggi: RigaCoda = {
      ...base,
      id: 'notte',
      evento: 'promemoria:notte',
      parteIl: '2026-10-27T23:30:00.000Z',
    }
    const viste = visibiliInHome([ancoraIeri, giaOggi], new Date('2026-10-27T23:30:00.000Z'))
    expect(viste.map((r) => r.id)).toEqual(['notte'])
  })

  it('lo stesso evento di pronto e di promemoria hanno chiavi diverse', () => {
    expect(eventoDi('promemoria', { appointmentId: 'a', giorno: '2026-10-28' })).toBe('promemoria:a:2026-10-28')
    expect(eventoDi('pronto', { appointmentId: 'a' })).toBe('pronto:a')
    expect(eventoDi('auguri', { dogId: 'd', anno: 2026 })).toBe('auguri:d:2026')
    expect(eventoDi('attesa', { appointmentId: 'dis', dogId: 'd' })).toBe('attesa:dis:d')
    expect(eventoDi('recensione', { appointmentId: 'a' })).toBe('recensione:a')
  })

  it('blocca solo le righe in coda di quel cane', () => {
    const nonInviata: RigaCoda = { ...base, id: 'n', evento: 'n', stato: 'non_inviata' }
    const inviata: RigaCoda = { ...base, id: 'i', evento: 'i', stato: 'inviata' }
    const chiusa: RigaCoda = { ...base, id: 'c', evento: 'c', stato: 'chiusa' }
    const altro: RigaCoda = { ...base, id: 'a', dogId: 'altro', evento: 'a' }
    const dopo = bloccaCane([base, nonInviata, inviata, chiusa, altro], 'd')
    expect(dopo[0]).toEqual({ ...base, stato: 'fermata', motivo: 'fermata' })
    expect(dopo.slice(1)).toEqual([nonInviata, inviata, chiusa, altro])
  })
})
