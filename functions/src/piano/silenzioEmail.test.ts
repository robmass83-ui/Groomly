import { describe, expect, it } from 'vitest'
import { chiaveEmail, impostaEmailClientePer, silenzioEmailPer, type ArchivioSilenzio } from './silenzioEmail'
import type { RigaCoda } from '../../../src/lib/codaEmail'

const base: RigaCoda = {
  id: '1',
  tipo: 'promemoria',
  dogId: 'd',
  appointmentId: 'a',
  evento: 'promemoria:a:2026-10-28',
  parteIl: '2026-10-27T16:00:00.000Z',
  stato: 'in_coda',
  motivo: '',
  email: 'a@b.it',
  nomeCane: 'Fido',
  nomeCliente: '',
  inizio: null,
}

function memoria(input: {
  salonId: string
  token: string
  dogId: string
  righe: RigaCoda[]
  email?: string
  cani?: Record<string, string>
  offerta?: { token: string; email: string }
}): ArchivioSilenzio & {
  bloccati: string[]
  sbloccati: string[]
  scritte: RigaCoda[]
  elenco: Map<string, string>
} {
  const bloccati: string[] = []
  const sbloccati: string[] = []
  const scritte: RigaCoda[] = []
  const elenco = new Map<string, string>()
  const cani = input.cani ?? { [input.dogId]: input.email ?? '' }
  return {
    bloccati,
    sbloccati,
    scritte,
    elenco,
    async leggiRiga(salonId, token) {
      if (salonId !== input.salonId || token !== input.token) return null
      return { dogId: input.dogId, email: input.email ?? '' }
    },
    async leggiOfferta(_salonId, token) {
      return input.offerta?.token === token ? { email: input.offerta.email } : null
    },
    async caneEsiste(_salonId, dogId) {
      return dogId in cani
    },
    async emailCane(_salonId, dogId) {
      return cani[dogId] ?? null
    },
    async caniConEmail(_salonId, email) {
      return Object.keys(cani).filter((id) => cani[id]?.trim().toLowerCase() === email.trim().toLowerCase())
    },
    async segnaBloccata(salonId, dogId, bloccata) {
      (bloccata ? bloccati : sbloccati).push(`${salonId}/${dogId}`)
    },
    async scriviBlocco(_salonId, email, fonte) {
      elenco.set(chiaveEmail(email), fonte)
    },
    async togliBlocco(_salonId, email) {
      elenco.delete(chiaveEmail(email))
    },
    async leggiRighe(salonId, dogId) {
      return input.righe.filter((riga) => salonId === input.salonId && riga.dogId === dogId)
    },
    async scriviFermate(_salonId, righe) {
      scritte.push(...righe)
    },
  }
}

describe('silenzio email', () => {
  it('segna il cane e ferma le righe in coda e quelle non partite', async () => {
    const nonInviata: RigaCoda = { ...base, id: 'n', evento: 'n', stato: 'non_inviata' }
    const altro: RigaCoda = { ...base, id: 'a', dogId: 'altro', evento: 'a' }
    const store = memoria({ salonId: 's', token: 'a'.repeat(32), dogId: 'd', righe: [base, nonInviata, altro] })
    await silenzioEmailPer({ salonId: 's', token: 'a'.repeat(32) }, store)
    expect(store.bloccati).toEqual(['s/d'])
    expect(store.scritte).toEqual([
      { ...base, stato: 'fermata', motivo: 'fermata' },
      { ...nonInviata, stato: 'fermata', motivo: 'fermata' },
    ])
  })

  it('un token diverso non scrive', async () => {
    const store = memoria({ salonId: 's', token: 'a'.repeat(32), dogId: 'd', righe: [base] })
    await expect(silenzioEmailPer({ salonId: 's', token: 'b'.repeat(32) }, store)).rejects.toThrow()
    expect(store.bloccati).toEqual([])
    expect(store.scritte).toEqual([])
  })

  it('la chiave ignora maiuscole e spazi', () => {
    expect(chiaveEmail(' A@B.it ')).toBe(chiaveEmail('a@b.it'))
  })

  it('con due cani stessa email blocca l’indirizzo e tutti e due', async () => {
    const secondo: RigaCoda = { ...base, id: 'b', dogId: 'e', evento: 'b' }
    const store = memoria({
      salonId: 's', token: 'a'.repeat(32), dogId: 'd', righe: [base, secondo], email: 'a@b.it', cani: { d: 'a@b.it', e: ' A@B.it ', f: 'c@d.it' },
    })
    await silenzioEmailPer({ salonId: 's', token: 'a'.repeat(32) }, store)
    expect(store.bloccati.sort()).toEqual(['s/d', 's/e'])
    expect(store.scritte.map((riga) => riga.id).sort()).toEqual(['1', 'b'])
    expect(store.elenco.get(chiaveEmail('a@b.it'))).toBe('link')
  })

  it('una riga senza indirizzo vale per il solo cane', async () => {
    const store = memoria({ salonId: 's', token: 'a'.repeat(32), dogId: 'd', righe: [base] })
    await silenzioEmailPer({ salonId: 's', token: 'a'.repeat(32) }, store)
    expect(store.bloccati).toEqual(['s/d'])
    expect(store.elenco.size).toBe(0)
  })

  it('il token di un posto libero blocca l’iscritto anche senza cane', async () => {
    const store = memoria({ salonId: 's', token: 'a'.repeat(32), dogId: 'd', righe: [], offerta: { token: 'c'.repeat(32), email: 'i@s.it' } })
    await silenzioEmailPer({ salonId: 's', token: 'c'.repeat(32) }, store)
    expect(store.elenco.get(chiaveEmail('i@s.it'))).toBe('link')
    expect(store.bloccati).toEqual([])
  })

  it('il salone shared è rifiutato', async () => {
    const store = memoria({ salonId: 'shared', token: 'a'.repeat(32), dogId: 'd', righe: [base], email: 'a@b.it' })
    await expect(silenzioEmailPer({ salonId: 'shared', token: 'a'.repeat(32) }, store)).rejects.toThrow()
    await expect(impostaEmailClientePer({ salonId: 'shared', ruolo: 'titolare', dogId: 'd', bloccata: true }, store)).rejects.toThrow()
    expect(store.bloccati).toEqual([])
    expect(store.elenco.size).toBe(0)
  })
})

describe('impostaEmailClientePer', () => {
  const carta = { salonId: 's', token: 'a'.repeat(32), dogId: 'd', righe: [base], email: 'a@b.it', cani: { d: 'a@b.it', e: 'a@b.it' } }

  it('il collaboratore non può', async () => {
    const store = memoria(carta)
    await expect(impostaEmailClientePer({ salonId: 's', ruolo: 'collaboratore', dogId: 'd', bloccata: true }, store))
      .rejects.toMatchObject({ code: 'permission-denied' })
    expect(store.elenco.size).toBe(0)
  })

  it('spegnere vale per tutti i cani dell’indirizzo', async () => {
    const store = memoria(carta)
    await impostaEmailClientePer({ salonId: 's', ruolo: 'socio', dogId: 'd', bloccata: true }, store)
    expect(store.bloccati.sort()).toEqual(['s/d', 's/e'])
    expect(store.elenco.get(chiaveEmail('a@b.it'))).toBe('scheda')
  })

  it('riaccendere toglie il blocco e allinea tutti i cani', async () => {
    const store = memoria(carta)
    await impostaEmailClientePer({ salonId: 's', ruolo: 'titolare', dogId: 'd', bloccata: true }, store)
    await impostaEmailClientePer({ salonId: 's', ruolo: 'titolare', dogId: 'd', bloccata: false }, store)
    expect(store.elenco.size).toBe(0)
    expect(store.sbloccati.sort()).toEqual(['s/d', 's/e'])
  })

  it('un cane che non esiste dà errore', async () => {
    await expect(impostaEmailClientePer({ salonId: 's', ruolo: 'titolare', dogId: 'z', bloccata: true }, memoria(carta)))
      .rejects.toMatchObject({ code: 'not-found' })
  })
})
