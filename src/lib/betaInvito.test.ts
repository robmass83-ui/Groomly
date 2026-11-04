import { describe, expect, it } from 'vitest'
import { GIORNI_SCADENZA_INVITO, invitoBetaDi, transizioneInvito, type InvitoBeta } from './betaInvito'

const valido: InvitoBeta = {
  salonId: 's1',
  piano: 'salone',
  giorni: 30,
  messaggio: null,
  stato: 'invitato',
  invitatoIl: '2026-11-04T10:00:00.000Z',
  scadeInvitoIl: '2026-11-18T10:00:00.000Z',
  rispostoIl: null,
  motivoRifiuto: null,
  altroRifiuto: null,
  revocatoIl: null,
  invitatoDa: 'masala.roberto@hotmail.it',
  aggiornatoIl: '2026-11-04T10:00:00.000Z',
}

describe('invito beta', () => {
  it('scade dopo 14 giorni', () => {
    expect(GIORNI_SCADENZA_INVITO).toBe(14)
  })

  it('transizioni ammesse', () => {
    expect(transizioneInvito('invitato', 'accettato')).toBe(true)
    expect(transizioneInvito('invitato', 'rifiutato')).toBe(true)
    expect(transizioneInvito('invitato', 'scaduto')).toBe(true)
    expect(transizioneInvito('invitato', 'revocato')).toBe(true)
    expect(transizioneInvito('accettato', 'revocato')).toBe(true)
  })

  it('transizioni negate', () => {
    expect(transizioneInvito('accettato', 'rifiutato')).toBe(false)
    expect(transizioneInvito('rifiutato', 'accettato')).toBe(false)
    expect(transizioneInvito('scaduto', 'accettato')).toBe(false)
    expect(transizioneInvito('revocato', 'invitato')).toBe(false)
    expect(transizioneInvito('invitato', 'invitato')).toBe(false)
  })

  it('legge un invito valido e rifiuta quelli rotti', () => {
    expect(invitoBetaDi(valido)).toEqual(valido)
    expect(invitoBetaDi({ ...valido, stato: 'boh' })).toBeNull()
    expect(invitoBetaDi({ ...valido, piano: 'base' })).toBeNull()
    expect(invitoBetaDi({ ...valido, giorni: 0 })).toBeNull()
    expect(invitoBetaDi({ ...valido, salonId: 3 })).toBeNull()
    expect(invitoBetaDi(null)).toBeNull()
    expect(invitoBetaDi({ ...valido, motivoRifiuto: 'strano' })).toEqual({ ...valido, motivoRifiuto: null })
  })
})
