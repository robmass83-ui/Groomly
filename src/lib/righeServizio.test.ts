import { describe, expect, it } from 'vitest'
import type { RigaCoda } from './codaEmail'
import type { SceltaServizio } from './serviziEmail'
import { bozzaPronto, linkPostoLibero, parteIlRecensione, righeAttesa, righeAuguri, righePromemoria, righePronto, righeRecensione, vaChiestoPronto } from './righeServizio'

const visita = { id: 'a', dogId: 'd', start: new Date('2026-10-28T09:00:00+02:00'), status: 'programmato', nomeCane: 'Fido', email: 'a@b.it' }
const automatico = { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' } satisfies SceltaServizio

describe('promemoria', () => {
  it('in automatico parte il giorno prima alle 18 di Roma', () => {
    const [riga] = righePromemoria([visita], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, [])
    expect(riga.evento).toBe('promemoria:a:2026-10-28')
    expect(riga.parteIl).toBe('2026-10-27T17:00:00.000Z')
    expect(riga).toMatchObject({
      id: 'promemoria:a:2026-10-28',
      tipo: 'promemoria',
      dogId: 'd',
      appointmentId: 'a',
      stato: 'in_coda',
      motivo: '',
      email: 'a@b.it',
      nomeCane: 'Fido',
    })
  })

  it('il giorno della visita è quello di Roma', () => {
    const mezzanotteRoma = { ...visita, start: new Date('2026-10-27T23:30:00.000Z') }
    const [dopoMezzanotte] = righePromemoria([mezzanotteRoma], automatico, [])
    expect(dopoMezzanotte.evento).toBe('promemoria:a:2026-10-28')
    expect(dopoMezzanotte.parteIl).toBe('2026-10-27T17:00:00.000Z')

    const offsetScritto = { ...visita, start: new Date('2026-10-28T00:30:00+02:00') }
    const [prima] = righePromemoria([offsetScritto], automatico, [])
    expect(prima.evento).toBe('promemoria:a:2026-10-27')
    expect(prima.parteIl).toBe('2026-10-26T17:00:00.000Z')
  })

  it('l’anticipo si sottrae sul calendario e l’ora usa l’offset di Roma', () => {
    const [dueGiorni] = righePromemoria([visita], { modo: 'automatico', anticipoGiorni: 2, ora: '18:00' }, [])
    expect(dueGiorni.parteIl).toBe('2026-10-26T17:00:00.000Z')

    const estate = { ...visita, start: new Date('2026-07-15T09:00:00+02:00') }
    const [luglio] = righePromemoria([estate], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, [])
    expect(luglio.evento).toBe('promemoria:a:2026-07-15')
    expect(luglio.parteIl).toBe('2026-07-14T16:00:00.000Z')
  })

  it('spostare la visita chiude la riga vecchia e ne apre una', () => {
    const vecchia = righePromemoria([visita], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, [])
    const mossa = { ...visita, start: new Date('2026-10-29T09:00:00+02:00') }
    const dopo = righePromemoria([mossa], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, vecchia)
    expect(dopo.find((r) => r.evento.endsWith('2026-10-28'))?.stato).toBe('chiusa')
    expect(dopo.find((r) => r.evento.endsWith('2026-10-29'))?.stato).toBe('in_coda')
    expect(dopo.find((r) => r.evento.endsWith('2026-10-29'))?.parteIl).toBe('2026-10-28T17:00:00.000Z')
  })

  it('una fermata del giorno vecchio non blocca il giorno nuovo', () => {
    const [vecchia] = righePromemoria([visita], automatico, [])
    const fermata: RigaCoda = { ...vecchia, stato: 'fermata', motivo: 'fermata' }
    const mossa = { ...visita, start: new Date('2026-10-29T09:00:00+02:00') }
    const dopo = righePromemoria([mossa], automatico, [fermata])
    expect(dopo.find((r) => r.evento.endsWith('2026-10-28'))?.stato).toBe('chiusa')
    expect(dopo.find((r) => r.evento.endsWith('2026-10-29'))?.stato).toBe('in_coda')
  })

  it('un promemoria già inviato resta inviato se il giorno cambia', () => {
    const [vecchia] = righePromemoria([visita], automatico, [])
    const inviata: RigaCoda = { ...vecchia, stato: 'inviata' }
    const mossa = { ...visita, start: new Date('2026-10-29T09:00:00+02:00') }
    const dopo = righePromemoria([mossa], automatico, [inviata])
    expect(dopo.find((r) => r.evento.endsWith('2026-10-28'))).toBe(inviata)
    expect(dopo.find((r) => r.evento.endsWith('2026-10-29'))?.stato).toBe('in_coda')
  })

  it('un manuale rimasto in memoria parte come l’automatico', () => {
    const [riga] = righePromemoria([visita], { modo: 'manuale', anticipoGiorni: 1, ora: '18:00' }, [])
    expect(riga.parteIl).toBe('2026-10-27T17:00:00.000Z')
    expect(riga.stato).toBe('in_coda')
    expect(riga.id).toBe('promemoria:a:2026-10-28')
  })

  it('spento non crea promemoria e restituisce le righe esistenti', () => {
    const nate = righePromemoria([visita], automatico, [])
    const dopo = righePromemoria(
      [{ ...visita, status: 'disdetto' }, { ...visita, id: 'b', nomeCane: 'Luna' }],
      { modo: 'spento', anticipoGiorni: 1, ora: '18:00' },
      nate,
    )
    expect(dopo).toEqual(nate)
    expect(righePromemoria([visita], { modo: 'spento' }, [])).toEqual([])
  })

  it('disdetta e non venuto chiudono il promemoria non partito', () => {
    const nate = righePromemoria([visita], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, [])
    const dopo = righePromemoria([{ ...visita, status: 'disdetto' }], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, nate)
    expect(dopo[0].stato).toBe('chiusa')
    expect(dopo).toHaveLength(1)
    expect(nate[0].stato).toBe('in_coda')

    const nateAssente = righePromemoria([visita], automatico, [])
    const assente = righePromemoria([{ ...visita, status: 'non_venuto' }], automatico, nateAssente)
    expect(assente[0].stato).toBe('chiusa')
    expect(assente).toHaveLength(1)

    const inviata: RigaCoda = { ...nate[0], stato: 'inviata' }
    const resta = righePromemoria([{ ...visita, status: 'non_venuto' }], automatico, [inviata])
    expect(resta).toEqual([inviata])

    const nonInviata: RigaCoda = { ...nate[0], id: 'vecchia', stato: 'non_inviata', motivo: 'rete' }
    const chiusa = righePromemoria([{ ...visita, status: 'disdetto' }], automatico, [nonInviata])
    expect(chiusa).toEqual([{ ...nonInviata, stato: 'chiusa' }])
    expect(righePromemoria([{ ...visita, status: 'disdetto' }], automatico, [])).toEqual([])
  })

  it('cambiare ora aggiorna la riga ancora in coda, e un manuale rimasto riparte alle 18', () => {
    const nate = righePromemoria([visita], automatico, [])
    const alleNove = righePromemoria([visita], { modo: 'automatico', anticipoGiorni: 1, ora: '09:00' }, nate)
    expect(alleNove[0].parteIl).toBe('2026-10-27T08:00:00.000Z')
    expect(alleNove[0].stato).toBe('in_coda')
    const manuale = righePromemoria([visita], { modo: 'manuale', anticipoGiorni: 1, ora: '18:00' }, alleNove)
    expect(manuale[0].parteIl).toBe('2026-10-27T17:00:00.000Z')
  })

  it('completare la visita chiude il promemoria non partito', () => {
    const nate = righePromemoria([visita], automatico, [])
    const dopo = righePromemoria([{ ...visita, status: 'completato' }], automatico, nate)
    expect(dopo[0].stato).toBe('chiusa')
    expect(dopo).toHaveLength(1)
  })

  it('una fermata dello stesso giorno non rinasce', () => {
    const [vecchia] = righePromemoria([visita], automatico, [])
    const fermata: RigaCoda = { ...vecchia, stato: 'fermata', motivo: 'fermata' }
    expect(righePromemoria([visita], automatico, [fermata])).toEqual([fermata])
  })

  it('senza email la riga entra con motivo manca_email', () => {
    const [manca] = righePromemoria([{ ...visita, email: undefined }], { modo: 'manuale', anticipoGiorni: 1, ora: '18:00' }, [])
    expect(manca.motivo).toBe('manca_email')
    expect(manca.email).toBe('')
    expect(manca.stato).toBe('in_coda')
    expect(manca.parteIl).toBe('2026-10-27T17:00:00.000Z')
    expect(manca.evento).toBe('promemoria:a:2026-10-28')

    const [vuota] = righePromemoria([{ ...visita, email: '' }], automatico, [])
    expect(vuota.motivo).toBe('manca_email')
    expect(vuota.parteIl).toBe('2026-10-27T17:00:00.000Z')

    const [invalida] = righePromemoria([{ ...visita, email: 'fido' }], automatico, [])
    expect(invalida.motivo).toBe('manca_email')
    expect(invalida.email).toBe('fido')
    expect(invalida.nomeCane).toBe('Fido')
    expect(invalida.dogId).toBe('d')
  })

  it('lascia intatte le righe che non sono promemoria', () => {
    const [promemoria] = righePromemoria([visita], automatico, [])
    const pronto: RigaCoda = {
      id: 'pronto:a',
      tipo: 'pronto',
      dogId: 'd',
      appointmentId: 'a',
      evento: 'pronto:a',
      parteIl: null,
      stato: 'in_coda',
      motivo: '',
      email: 'a@b.it',
      nomeCane: 'Fido',
      nomeCliente: '',
      inizio: null,
    }
    const dopo = righePromemoria([{ ...visita, status: 'disdetto' }], automatico, [pronto, promemoria])
    expect(dopo[0]).toBe(pronto)
    expect(dopo[1].stato).toBe('chiusa')
    expect(dopo[1].evento).toBe(promemoria.evento)
    expect(dopo).toHaveLength(2)
  })

  it('scrive il nome di chi accompagna e l’inizio della visita', () => {
    const start = new Date('2026-11-04T09:00:00.000Z')
    const [conNome] = righePromemoria([{ ...visita, start, nomeCliente: 'Giulia' }], automatico, [])
    expect(conNome.nomeCliente).toBe('Giulia')
    expect(conNome.inizio).toBe(start.toISOString())

    const [senza] = righePromemoria([{ ...visita, start }], automatico, [])
    expect(senza.nomeCliente).toBe('')
    expect(senza.inizio).toBe(start.toISOString())
  })

  it('non chiude il promemoria di un altro appuntamento', () => {
    const [diA] = righePromemoria([visita], automatico, [])
    const altra = { ...visita, id: 'b', nomeCane: 'Luna', email: 'b@b.it' }
    const dopo = righePromemoria([{ ...altra, status: 'disdetto' }], automatico, [diA])
    expect(dopo).toEqual([diA])
  })
})

const visitaChiusa = {
  id: 'a',
  dogId: 'd',
  status: 'completato',
  chiusoIl: '2026-10-27T09:00:00.000Z',
  nomeCane: 'Fido',
  email: 'a@b.it',
}
const riaperta = { id: 'a', dogId: 'd', status: 'programmato', chiusoIl: null, nomeCane: 'Fido', email: 'a@b.it' }

describe('pronto', () => {
  it('il pronto automatico parte nell’istante della chiusura', () => {
    const [riga] = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    expect(riga.parteIl).toBe('2026-10-27T09:00:00.000Z')
    expect(riga.evento).toBe('pronto:a')
    expect(riga).toMatchObject({
      id: 'pronto:a',
      tipo: 'pronto',
      dogId: 'd',
      appointmentId: 'a',
      stato: 'in_coda',
      motivo: '',
      email: 'a@b.it',
      nomeCane: 'Fido',
    })
  })

  it('passare al manuale toglie l’ora al pronto ancora in coda', () => {
    const nata = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    const manuale = righePronto([visitaChiusa], { modo: 'manuale' }, nata)
    expect(manuale[0].parteIl).toBeNull()
    expect(manuale[0].stato).toBe('in_coda')
  })

  it('riaprire entro 15 minuti toglie la riga non partita', () => {
    const nata = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    const dopo = righePronto([riaperta], { modo: 'automatico' }, nata)
    expect(dopo.find((r) => r.evento === 'pronto:a')).toBeUndefined()
    expect(nata[0].stato).toBe('in_coda')

    const disdetta = righePronto([{ ...visitaChiusa, status: 'disdetto' }], { modo: 'automatico' }, nata)
    expect(disdetta.find((r) => r.evento === 'pronto:a')).toBeUndefined()

    const assente = righePronto([{ ...visitaChiusa, status: 'non_venuto' }], { modo: 'automatico' }, nata)
    expect(assente.find((r) => r.evento === 'pronto:a')).toBeUndefined()

    const inviata: RigaCoda = { ...nata[0], stato: 'inviata' }
    const resta = righePronto([riaperta], { modo: 'automatico' }, [inviata])
    expect(resta).toEqual([inviata])
    expect(resta[0]).toBe(inviata)
    const restaDisdetta = righePronto([{ ...visitaChiusa, status: 'disdetto' }], { modo: 'automatico' }, [inviata])
    expect(restaDisdetta).toEqual([inviata])
    const restaAssente = righePronto([{ ...visitaChiusa, status: 'non_venuto' }], { modo: 'automatico' }, [inviata])
    expect(restaAssente).toEqual([inviata])

    const nonInviata: RigaCoda = { ...nata[0], id: 'vecchia', stato: 'non_inviata', motivo: 'rete' }
    expect(righePronto([riaperta], { modo: 'automatico' }, [nonInviata])).toEqual([])
    expect(righePronto([{ ...visitaChiusa, status: 'disdetto' }], { modo: 'automatico' }, [nonInviata])).toEqual([])
    expect(righePronto([{ ...visitaChiusa, status: 'non_venuto' }], { modo: 'automatico' }, [nonInviata])).toEqual([])

    const fermata: RigaCoda = { ...nata[0], stato: 'fermata', motivo: 'fermata' }
    expect(righePronto([riaperta], { modo: 'automatico' }, [fermata])).toEqual([fermata])
  })

  it('in manuale il pronto non entra in coda: si chiede al completamento', () => {
    expect(righePronto([visitaChiusa], { modo: 'manuale' }, [])).toEqual([])
  })

  it('la bozza è la mail da inviare se la toelettatura dice sì', () => {
    const riga = bozzaPronto({ ...visitaChiusa, nomeCliente: 'Ada' })
    expect(riga).toMatchObject({
      id: 'pronto:a',
      parteIl: null,
      stato: 'in_coda',
      nomeCliente: 'Ada',
      motivo: '',
      email: 'a@b.it',
    })
    expect(vaChiestoPronto('manuale', 'a@b.it', true)).toBe(true)
    expect(vaChiestoPronto('automatico', 'a@b.it', true)).toBe(false)
    expect(vaChiestoPronto('spento', 'a@b.it', true)).toBe(false)
    expect(vaChiestoPronto('manuale', 'fido', true)).toBe(false)
    expect(vaChiestoPronto('manuale', 'a@b.it', false)).toBe(false)
  })

  it('spento non crea il pronto e restituisce le righe esistenti', () => {
    const nate = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    const dopo = righePronto(
      [{ ...visitaChiusa, status: 'disdetto' }, { ...visitaChiusa, id: 'b', nomeCane: 'Luna' }],
      { modo: 'spento' },
      nate,
    )
    expect(dopo).toEqual(nate)
    expect(dopo[0]).toBe(nate[0])
    expect(righePronto([visitaChiusa], { modo: 'spento' }, [])).toEqual([])
  })

  it('senza email la riga entra con motivo manca_email', () => {
    expect(righePronto([{ ...visitaChiusa, email: undefined }], { modo: 'manuale' }, [])).toEqual([])

    const [vuota] = righePronto([{ ...visitaChiusa, email: '' }], { modo: 'automatico' }, [])
    expect(vuota.motivo).toBe('manca_email')
    expect(vuota.parteIl).toBe('2026-10-27T09:00:00.000Z')

    const [invalida] = righePronto([{ ...visitaChiusa, email: 'fido' }], { modo: 'automatico' }, [])
    expect(invalida.motivo).toBe('manca_email')
    expect(invalida.email).toBe('fido')
    expect(invalida.nomeCane).toBe('Fido')
    expect(invalida.dogId).toBe('d')
  })

  it('non crea il pronto senza chiusura o se la visita non è completata', () => {
    expect(righePronto([{ ...visitaChiusa, chiusoIl: '' }], { modo: 'automatico' }, [])).toEqual([])
    expect(righePronto([{ ...visitaChiusa, chiusoIl: null }], { modo: 'automatico' }, [])).toEqual([])
    expect(righePronto([{ ...visitaChiusa, status: 'programmato' }], { modo: 'automatico' }, [])).toEqual([])
  })

  it('la stessa chiusura tiene sempre lo stesso istante e lo stesso id', () => {
    const [nata] = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    const gia: RigaCoda = { ...nata, id: 'vecchia' }
    const dopo = righePronto([visitaChiusa], { modo: 'automatico' }, [gia])
    expect(dopo[0].parteIl).toBe('2026-10-27T09:00:00.000Z')
    expect(dopo[0].id).toBe('vecchia')
    expect(righePronto([visitaChiusa], { modo: 'automatico' }, dopo)[0].parteIl).toBe(dopo[0].parteIl)
  })

  it('un pronto già inviato non rinasce', () => {
    const [nata] = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    const inviata: RigaCoda = { ...nata, stato: 'inviata' }
    expect(righePronto([visitaChiusa], { modo: 'automatico' }, [inviata])).toEqual([inviata])
  })

  it('lascia intatte le righe che non sono pronto', () => {
    const [promemoria] = righePromemoria([visita], automatico, [])
    const [pronto] = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    const dopo = righePronto([riaperta], { modo: 'automatico' }, [promemoria, pronto])
    expect(dopo).toEqual([promemoria])
    expect(dopo[0]).toBe(promemoria)
  })

  it('non toglie il pronto di un altro appuntamento', () => {
    const [diA] = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    const dopo = righePronto(
      [{ id: 'b', dogId: 'e', status: 'non_venuto', chiusoIl: null, nomeCane: 'Luna', email: 'b@b.it' }],
      { modo: 'automatico' },
      [diA],
    )
    expect(dopo).toEqual([diA])
    expect(dopo[0]).toBe(diA)
  })

  it('un cane non in cura chiude pronto e promemoria aperti e non ne crea', () => {
    const [promemoria] = righePromemoria([visita], automatico, [])
    const [pronto] = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    const altroPromemoria: RigaCoda = {
      ...promemoria,
      id: 'promemoria:b:2026-10-28',
      evento: 'promemoria:b:2026-10-28',
      dogId: 'e',
      appointmentId: 'b',
      nomeCane: 'Luna',
    }
    const altroPronto: RigaCoda = {
      ...pronto,
      id: 'pronto:b',
      evento: 'pronto:b',
      dogId: 'e',
      appointmentId: 'b',
      nomeCane: 'Luna',
    }
    const nonInviata: RigaCoda = { ...pronto, id: 'pronto:c', evento: 'pronto:c', appointmentId: 'c', stato: 'non_inviata', motivo: 'rete' }
    const esistenti = [promemoria, pronto, altroPromemoria, altroPronto, nonInviata]

    const dopoPromemoria = righePromemoria([visita], automatico, esistenti, false)
    expect(dopoPromemoria.find((r) => r.evento === promemoria.evento)?.stato).toBe('chiusa')
    expect(dopoPromemoria.find((r) => r.evento === altroPromemoria.evento)).toBe(altroPromemoria)
    expect(dopoPromemoria.find((r) => r.evento === pronto.evento)).toBe(pronto)
    expect(dopoPromemoria.find((r) => r.evento === altroPronto.evento)).toBe(altroPronto)
    expect(dopoPromemoria.find((r) => r.evento === nonInviata.evento)).toBe(nonInviata)
    expect(dopoPromemoria).toHaveLength(esistenti.length)
    expect(righePromemoria([visita], automatico, [], false)).toEqual([])

    const dopoPronto = righePronto([visitaChiusa], { modo: 'automatico' }, esistenti, false)
    expect(dopoPronto.find((r) => r.evento === 'pronto:a')?.stato).toBe('chiusa')
    expect(dopoPronto.find((r) => r.evento === 'pronto:b')).toBe(altroPronto)
    expect(dopoPronto.find((r) => r.evento === promemoria.evento)).toBe(promemoria)
    expect(dopoPronto.find((r) => r.evento === nonInviata.evento)).toBe(nonInviata)
    expect(dopoPronto.filter((r) => r.tipo === 'pronto' && r.dogId === 'd' && r.stato === 'in_coda')).toEqual([])
    expect(dopoPronto).toHaveLength(esistenti.length)
    expect(righePronto([visitaChiusa], { modo: 'automatico' }, [], false)).toEqual([])
  })
})

const luna = { id: 'd', nome: 'Luna', email: 'a@b.it', birthMonth: 10, birthDay: 27 }
const oggiCompleanno = new Date('2026-10-27T06:00:00.000Z')
const alleNove = { modo: 'automatico', ora: '09:00' } satisfies SceltaServizio

describe('auguri', () => {
  it('gli auguri del compleanno restano in coda senza ora', () => {
    const cani = [
      luna,
      { id: 'e', nome: 'Rex', email: 'a@b.it' },
      { id: 'f', nome: 'Mia', email: 'a@b.it', birthMonth: 10 },
      { id: 'g', nome: 'Teo', email: 'a@b.it', birthDay: 27 },
    ]
    const righe = righeAuguri(cani, alleNove, [], oggiCompleanno)
    expect(righe).toHaveLength(1)
    expect(righe[0].evento).toBe('auguri:d:2026')
    expect(righe[0].parteIl).toBeNull()
    expect(righe[0].stato).toBe('in_coda')
    expect(righe[0]).toMatchObject({
      id: 'auguri:d:2026',
      tipo: 'auguri',
      dogId: 'd',
      appointmentId: null,
      stato: 'in_coda',
      motivo: '',
      email: 'a@b.it',
      nomeCane: 'Luna',
    })
  })

  it('il giorno e l’anno del compleanno sono quelli di Roma', () => {
    const [mezzanotte] = righeAuguri([luna], alleNove, [], new Date('2026-10-26T23:30:00.000Z'))
    expect(mezzanotte.evento).toBe('auguri:d:2026')
    expect(mezzanotte.parteIl).toBeNull()

    expect(righeAuguri([luna], alleNove, [], new Date('2026-10-27T23:30:00.000Z'))).toEqual([])

    const capodanno = { id: 'd', nome: 'Luna', email: 'a@b.it', birthMonth: 1, birthDay: 1 }
    const [annoNuovo] = righeAuguri([capodanno], alleNove, [], new Date('2026-12-31T23:30:00.000Z'))
    expect(annoNuovo.evento).toBe('auguri:d:2027')
    expect(annoNuovo.parteIl).toBeNull()
  })

  it('un manuale rimasto in memoria resta in coda senza ora', () => {
    const [riga] = righeAuguri([luna], { modo: 'manuale', ora: '09:00' }, [], oggiCompleanno)
    expect(riga.parteIl).toBeNull()
    expect(riga.stato).toBe('in_coda')
    expect(riga.id).toBe('auguri:d:2026')
  })

  it('spento non crea auguri e restituisce le righe esistenti', () => {
    const nate = righeAuguri([luna], alleNove, [], oggiCompleanno)
    const dopo = righeAuguri(
      [luna, { id: 'e', nome: 'Rex', email: 'a@b.it', birthMonth: 10, birthDay: 27 }],
      { modo: 'spento', ora: '09:00' },
      nate,
      oggiCompleanno,
    )
    expect(dopo).toEqual(nate)
    expect(dopo[0]).toBe(nate[0])
    expect(righeAuguri([luna], { modo: 'spento' }, [], oggiCompleanno)).toEqual([])
  })

  it('senza email la riga entra con motivo manca_email', () => {
    const base = { id: 'd', nome: 'Luna', birthMonth: 10, birthDay: 27 }
    const [manca] = righeAuguri([{ ...base, email: undefined }], { modo: 'manuale', ora: '09:00' }, [], oggiCompleanno)
    expect(manca.motivo).toBe('manca_email')
    expect(manca.email).toBe('')
    expect(manca.stato).toBe('in_coda')
    expect(manca.parteIl).toBeNull()
    expect(manca.evento).toBe('auguri:d:2026')

    const [vuota] = righeAuguri([{ ...base, email: '' }], alleNove, [], oggiCompleanno)
    expect(vuota.motivo).toBe('manca_email')
    expect(vuota.parteIl).toBeNull()

    const [invalida] = righeAuguri([{ ...base, email: 'luna' }], alleNove, [], oggiCompleanno)
    expect(invalida.motivo).toBe('manca_email')
    expect(invalida.email).toBe('luna')
    expect(invalida.nomeCane).toBe('Luna')
    expect(invalida.dogId).toBe('d')
    expect(invalida.appointmentId).toBeNull()
  })

  it('un augurio già inviato o fermato non rinasce, l’anno dopo sì', () => {
    const [nata] = righeAuguri([luna], alleNove, [], oggiCompleanno)
    const inviata: RigaCoda = { ...nata, stato: 'inviata' }
    const stessoAnno = righeAuguri([luna], alleNove, [inviata], oggiCompleanno)
    expect(stessoAnno).toEqual([inviata])
    expect(stessoAnno[0]).toBe(inviata)

    const fermata: RigaCoda = { ...nata, stato: 'fermata', motivo: 'fermata' }
    const bloccata = righeAuguri([luna], alleNove, [fermata], oggiCompleanno)
    expect(bloccata).toEqual([fermata])
    expect(bloccata[0]).toBe(fermata)

    const annoDopo = righeAuguri([luna], alleNove, [inviata], new Date('2027-10-27T06:00:00.000Z'))
    expect(annoDopo.find((r) => r.evento === 'auguri:d:2026')).toBe(inviata)
    expect(annoDopo.find((r) => r.evento === 'auguri:d:2027')).toMatchObject({
      id: 'auguri:d:2027',
      stato: 'in_coda',
      parteIl: null,
      nomeCane: 'Luna',
      appointmentId: null,
    })
    expect(annoDopo).toHaveLength(2)
  })

  it('un altro giorno non crea la riga e non cancella quella già nata', () => {
    const nate = righeAuguri([luna], alleNove, [], oggiCompleanno)
    const dopo = righeAuguri([luna], alleNove, nate, new Date('2026-10-28T06:00:00.000Z'))
    expect(dopo).toEqual(nate)
    expect(dopo[0]).toBe(nate[0])
    expect(righeAuguri([luna], alleNove, [], new Date('2026-10-28T06:00:00.000Z'))).toEqual([])
  })

  it('lascia intatte le righe che non sono auguri', () => {
    const pronto: RigaCoda = {
      id: 'pronto:a',
      tipo: 'pronto',
      dogId: 'd',
      appointmentId: 'a',
      evento: 'pronto:a',
      parteIl: null,
      stato: 'in_coda',
      motivo: '',
      email: 'a@b.it',
      nomeCane: 'Luna',
      nomeCliente: '',
      inizio: null,
    }
    const dopo = righeAuguri([luna], alleNove, [pronto], oggiCompleanno)
    expect(dopo[0]).toBe(pronto)
    expect(dopo[1].tipo).toBe('auguri')
    expect(dopo[1].evento).toBe('auguri:d:2026')
    expect(dopo).toHaveLength(2)
  })

  it('un cane non in cura chiude gli auguri in coda e non ne crea', () => {
    const [auguri] = righeAuguri([luna], alleNove, [], oggiCompleanno)
    const altro: RigaCoda = { ...auguri, id: 'auguri:e:2026', evento: 'auguri:e:2026', dogId: 'e', nomeCane: 'Rex' }
    const promemoria: RigaCoda = {
      ...auguri,
      id: 'promemoria:a:2026-10-28',
      tipo: 'promemoria',
      evento: 'promemoria:a:2026-10-28',
      appointmentId: 'a',
    }
    const nonInviata: RigaCoda = { ...auguri, id: 'auguri:d:2025', evento: 'auguri:d:2025', stato: 'non_inviata', motivo: 'rete' }
    const esistenti = [auguri, altro, promemoria, nonInviata]
    const dopo = righeAuguri([luna], alleNove, esistenti, oggiCompleanno, false)
    expect(dopo.find((r) => r.evento === auguri.evento)?.stato).toBe('chiusa')
    expect(dopo.find((r) => r.evento === altro.evento)).toBe(altro)
    expect(dopo.find((r) => r.evento === promemoria.evento)).toBe(promemoria)
    expect(dopo.find((r) => r.evento === nonInviata.evento)).toBe(nonInviata)
    expect(dopo.filter((r) => r.tipo === 'auguri' && r.dogId === 'd' && r.stato === 'in_coda')).toEqual([])
    expect(dopo).toHaveLength(esistenti.length)
    expect(righeAuguri([luna], alleNove, [], oggiCompleanno, false)).toEqual([])
  })

  it('cambiare ora non dà un orario agli auguri ancora in coda', () => {
    const nati = righeAuguri([luna], alleNove, [], oggiCompleanno)
    const alleDieci = righeAuguri([luna], { modo: 'automatico', ora: '10:00' }, nati, oggiCompleanno)
    expect(alleDieci[0].parteIl).toBeNull()
    const manuale = righeAuguri([luna], { modo: 'manuale', ora: '09:00' }, alleDieci, oggiCompleanno)
    expect(manuale[0].parteIl).toBeNull()
  })
})

const visitaRecensione = {
  id: 'n',
  dogId: 'nuovo',
  status: 'completato',
  chiusoIl: '2026-10-27T09:00:00.000Z',
  nomeCane: 'N',
  email: 'a@b.it',
  noteProblema: false,
}
const adessoRecensione = new Date('2026-10-27T10:00:00.000Z')
const linkRecensione = 'https://g.page/x'
const riapertaRecensione = {
  id: 'n',
  dogId: 'nuovo',
  status: 'programmato',
  chiusoIl: null,
  nomeCane: 'N',
  email: 'a@b.it',
  noteProblema: false,
}

function fermateRecensione(n: number, parteIl: string | null, stato: RigaCoda['stato'] = 'fermata'): RigaCoda[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    tipo: 'recensione' as const,
    dogId: String(i),
    appointmentId: String(i),
    evento: `recensione:${i}`,
    parteIl,
    stato,
    motivo: '',
    email: 'a@b.it',
    nomeCane: 'X',
    nomeCliente: '',
    inizio: null,
  }))
}

describe('orario recensione', () => {
  it('la recensione delle 19:59 parte alle 20 dello stesso giorno', () => {
    expect(parteIlRecensione('2026-10-28T18:59:00.000Z')).toBe('2026-10-28T19:00:00.000Z')
  })

  it('la recensione delle 20:01 parte alle 9 del giorno dopo', () => {
    expect(parteIlRecensione('2026-10-28T19:01:00.000Z')).toBe('2026-10-29T08:00:00.000Z')
  })

  it('la recensione delle 20:00 esatte resta alle 20 dello stesso giorno', () => {
    expect(parteIlRecensione('2026-10-28T19:00:00.000Z')).toBe('2026-10-28T19:00:00.000Z')
  })
})

describe('recensione', () => {
  it('non chiede la recensione se oggi ce ne sono già cinque, fermate comprese', () => {
    const visite = [{ id: 'n', dogId: 'nuovo', status: 'completato', chiusoIl: '2026-10-27T09:00:00.000Z', nomeCane: 'N', email: 'a@b.it', noteProblema: false }]
    const gia = Array.from({ length: 5 }, (_, i) => ({
      id: String(i), tipo: 'recensione' as const, dogId: String(i), appointmentId: String(i),
      evento: `recensione:${i}`, parteIl: null, stato: 'fermata' as const, motivo: '', email: 'a@b.it', nomeCane: 'X',
      nomeCliente: '', inizio: null,
    }))
    expect(righeRecensione(visite, { modo: 'automatico' }, 'https://g.page/x', gia, new Date('2026-10-27T10:00:00.000Z'))).toEqual(gia)
  })

  it('cinque fermate di ieri non bloccano la recensione di oggi', () => {
    const ieri = fermateRecensione(5, '2026-10-26T22:30:00.000Z')
    const dopo = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, ieri, adessoRecensione)
    expect(dopo.slice(0, 5)).toEqual(ieri)
    expect(dopo[0]).toBe(ieri[0])
    expect(dopo).toHaveLength(6)
    expect(dopo[5]).toMatchObject({
      id: 'recensione:n',
      tipo: 'recensione',
      dogId: 'nuovo',
      appointmentId: 'n',
      evento: 'recensione:n',
      parteIl: '2026-10-27T19:00:00.000Z',
      stato: 'in_coda',
      motivo: '',
      email: 'a@b.it',
      nomeCane: 'N',
    })

    const mezzanotteRoma = fermateRecensione(5, '2026-10-26T23:00:00.000Z')
    expect(righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, mezzanotteRoma, adessoRecensione)).toEqual(mezzanotteRoma)

    const quattro = fermateRecensione(4, null)
    const quinta = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, quattro, adessoRecensione)
    expect(quinta).toHaveLength(5)
    expect(quinta[4].evento).toBe('recensione:n')
  })

  it('una visita con nota problema non crea la recensione', () => {
    expect(righeRecensione(
      [{ ...visitaRecensione, noteProblema: true }],
      { modo: 'automatico' },
      linkRecensione,
      [],
      adessoRecensione,
    )).toEqual([])
    const [nata] = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const dopo = righeRecensione(
      [{ ...visitaRecensione, noteProblema: true }],
      { modo: 'automatico' },
      linkRecensione,
      [nata],
      adessoRecensione,
    )
    expect(dopo.find((r) => r.evento === 'recensione:n')).toBeUndefined()
    const senzaLink = righeRecensione([visitaRecensione], { modo: 'automatico' }, '  ', [nata], adessoRecensione)
    expect(senzaLink.find((r) => r.evento === 'recensione:n')).toBeUndefined()
  })

  it('la recensione parte alle 20 di Roma e in manuale non ha ora', () => {
    const [riga] = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    expect(riga.parteIl).toBe('2026-10-27T19:00:00.000Z')
    expect(riga.evento).toBe('recensione:n')
    expect(riga).toMatchObject({
      id: 'recensione:n',
      tipo: 'recensione',
      dogId: 'nuovo',
      appointmentId: 'n',
      stato: 'in_coda',
      motivo: '',
      email: 'a@b.it',
      nomeCane: 'N',
    })

    const [manuale] = righeRecensione([visitaRecensione], { modo: 'manuale' }, linkRecensione, [], adessoRecensione)
    expect(manuale.parteIl).toBeNull()
    expect(manuale.stato).toBe('in_coda')
    expect(manuale.id).toBe('recensione:n')
    expect(manuale.appointmentId).toBe('n')

    const [chiusaIeri] = righeRecensione(
      [{ ...visitaRecensione, chiusoIl: '2026-10-26T10:00:00.000Z' }],
      { modo: 'automatico' },
      linkRecensione,
      [],
      adessoRecensione,
    )
    expect(chiusaIeri.parteIl).toBe('2026-10-26T19:00:00.000Z')
    expect(chiusaIeri.appointmentId).toBe('n')
  })

  it('riaprire la visita toglie la recensione non partita', () => {
    const nata = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const dopo = righeRecensione([riapertaRecensione], { modo: 'automatico' }, linkRecensione, nata, adessoRecensione)
    expect(dopo.find((r) => r.evento === 'recensione:n')).toBeUndefined()
    expect(nata[0].stato).toBe('in_coda')

    const disdetta = righeRecensione(
      [{ ...visitaRecensione, status: 'disdetto' }],
      { modo: 'automatico' },
      linkRecensione,
      nata,
      adessoRecensione,
    )
    expect(disdetta.find((r) => r.evento === 'recensione:n')).toBeUndefined()

    const assente = righeRecensione(
      [{ ...visitaRecensione, status: 'non_venuto' }],
      { modo: 'automatico' },
      linkRecensione,
      nata,
      adessoRecensione,
    )
    expect(assente.find((r) => r.evento === 'recensione:n')).toBeUndefined()

    const inviata: RigaCoda = { ...nata[0], stato: 'inviata' }
    expect(righeRecensione([riapertaRecensione], { modo: 'automatico' }, linkRecensione, [inviata], adessoRecensione)).toEqual([inviata])
    expect(righeRecensione([{ ...visitaRecensione, status: 'disdetto' }], { modo: 'automatico' }, linkRecensione, [inviata], adessoRecensione)).toEqual([inviata])
    expect(righeRecensione([{ ...visitaRecensione, status: 'non_venuto' }], { modo: 'automatico' }, linkRecensione, [inviata], adessoRecensione)).toEqual([inviata])

    const nonInviata: RigaCoda = { ...nata[0], id: 'vecchia', stato: 'non_inviata', motivo: 'rete' }
    expect(righeRecensione([riapertaRecensione], { modo: 'automatico' }, linkRecensione, [nonInviata], adessoRecensione)).toEqual([])
    expect(righeRecensione([{ ...visitaRecensione, status: 'disdetto' }], { modo: 'automatico' }, linkRecensione, [nonInviata], adessoRecensione)).toEqual([])
    expect(righeRecensione([{ ...visitaRecensione, status: 'non_venuto' }], { modo: 'automatico' }, linkRecensione, [nonInviata], adessoRecensione)).toEqual([])

    const fermata: RigaCoda = { ...nata[0], stato: 'fermata', motivo: 'fermata' }
    expect(righeRecensione([riapertaRecensione], { modo: 'automatico' }, linkRecensione, [fermata], adessoRecensione)).toEqual([fermata])
  })

  it('una riga tolta per la riapertura non conta nel tetto dei cinque', () => {
    for (const status of ['programmato', 'disdetto', 'non_venuto'] as const) {
      const cinque = fermateRecensione(5, null, 'in_coda')
      const tolta = { id: '0', dogId: '0', status, chiusoIl: null, nomeCane: 'X', email: 'a@b.it', noteProblema: false }
      const dopo = righeRecensione([visitaRecensione, tolta], { modo: 'automatico' }, linkRecensione, cinque, adessoRecensione)
      expect(dopo.find((r) => r.evento === 'recensione:0')).toBeUndefined()
      expect(dopo.find((r) => r.evento === 'recensione:n')).toMatchObject({
        id: 'recensione:n',
        stato: 'in_coda',
        appointmentId: 'n',
      })
      expect(dopo).toHaveLength(5)
      expect(cinque).toHaveLength(5)
    }
  })

  it('senza email valida o senza link non crea la recensione', () => {
    expect(righeRecensione([{ ...visitaRecensione, email: undefined }], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)).toEqual([])
    expect(righeRecensione([{ ...visitaRecensione, email: '' }], { modo: 'manuale' }, linkRecensione, [], adessoRecensione)).toEqual([])
    expect(righeRecensione([{ ...visitaRecensione, email: 'fido' }], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)).toEqual([])
    expect(righeRecensione([visitaRecensione], { modo: 'automatico' }, '', [], adessoRecensione)).toEqual([])
    expect(righeRecensione([visitaRecensione], { modo: 'automatico' }, '   ', [], adessoRecensione)).toEqual([])
  })

  it('nel tetto non contano le recensioni chiuse né le righe di un altro tipo', () => {
    const chiuse = fermateRecensione(5, null, 'chiusa')
    const dopoChiuse = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, chiuse, adessoRecensione)
    expect(dopoChiuse[5].evento).toBe('recensione:n')
    expect(dopoChiuse[0]).toBe(chiuse[0])

    const inviate = fermateRecensione(5, '2026-10-27T08:00:00.000Z', 'inviata')
    expect(righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, inviate, adessoRecensione)).toEqual(inviate)

    const pronti: RigaCoda[] = fermateRecensione(5, null).map((riga, i) => ({
      ...riga,
      id: `pronto:${i}`,
      tipo: 'pronto',
      evento: `pronto:${i}`,
    }))
    const dopoPronti = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, pronti, adessoRecensione)
    expect(dopoPronti.slice(0, 5)).toEqual(pronti)
    expect(dopoPronti[5].tipo).toBe('recensione')
  })

  it('passare al manuale toglie l’ora e la stessa chiusura tiene lo stesso istante', () => {
    const nata = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const manuale = righeRecensione([visitaRecensione], { modo: 'manuale' }, linkRecensione, nata, adessoRecensione)
    expect(manuale[0].parteIl).toBeNull()
    expect(manuale[0].stato).toBe('in_coda')
    expect(manuale[0].id).toBe('recensione:n')

    const [prima] = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const gia: RigaCoda = { ...prima, id: 'vecchia' }
    const dopo = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [gia], adessoRecensione)
    expect(dopo[0].parteIl).toBe('2026-10-27T19:00:00.000Z')
    expect(dopo[0].id).toBe('vecchia')
    expect(righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, dopo, adessoRecensione)[0].parteIl).toBe(dopo[0].parteIl)

    const spostata = righeRecensione(
      [{ ...visitaRecensione, chiusoIl: '2026-10-27T11:00:00.000Z' }],
      { modo: 'automatico' },
      linkRecensione,
      nata,
      adessoRecensione,
    )
    expect(spostata[0].parteIl).toBe('2026-10-27T19:00:00.000Z')
    expect(spostata[0].id).toBe(nata[0].id)

    const cinqueVisite = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      dogId: String(i),
      status: 'completato',
      chiusoIl: '2026-10-27T09:00:00.000Z',
      nomeCane: 'N',
      email: 'a@b.it',
      noteProblema: false,
    }))
    const cinque = righeRecensione(cinqueVisite, { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const cinqueManuali = righeRecensione(cinqueVisite, { modo: 'manuale' }, linkRecensione, cinque, adessoRecensione)
    expect(cinqueManuali.map((riga) => riga.parteIl)).toEqual([null, null, null, null, null])
    expect(cinqueManuali.map((riga) => riga.id)).toEqual(cinque.map((riga) => riga.id))
  })

  it('non chiede la recensione se a quel cane è già stata chiesta nell’ultimo anno', () => {
    expect(righeRecensione(
      [visitaRecensione],
      { modo: 'automatico' },
      linkRecensione,
      [],
      adessoRecensione,
      [{ dogId: 'nuovo', at: '2026-06-01T00:00:00.000Z' }],
    )).toEqual([])
    expect(righeRecensione(
      [visitaRecensione],
      { modo: 'automatico' },
      linkRecensione,
      [],
      adessoRecensione,
      [{ dogId: 'altro', at: '2026-06-01T00:00:00.000Z' }],
    )).toHaveLength(1)
    const [dopoUnAnno] = righeRecensione(
      [visitaRecensione],
      { modo: 'automatico' },
      linkRecensione,
      [],
      adessoRecensione,
      [{ dogId: 'nuovo', at: '2025-01-01T00:00:00.000Z' }],
    )
    expect(dopoUnAnno.evento).toBe('recensione:n')
  })

  it('non crea la recensione senza chiusura o se la visita non è completata', () => {
    expect(righeRecensione([{ ...visitaRecensione, chiusoIl: '' }], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)).toEqual([])
    expect(righeRecensione([{ ...visitaRecensione, chiusoIl: null }], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)).toEqual([])
    expect(righeRecensione([{ ...visitaRecensione, chiusoIl: 'no' }], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)).toEqual([])
    expect(righeRecensione([{ ...visitaRecensione, status: 'in_corso' }], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)).toEqual([])
  })

  it('spento non crea la recensione e restituisce le righe esistenti', () => {
    const nate = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const dopo = righeRecensione(
      [{ ...visitaRecensione, status: 'disdetto' }, { ...visitaRecensione, id: 'b', nomeCane: 'Luna' }],
      { modo: 'spento' },
      linkRecensione,
      nate,
      adessoRecensione,
    )
    expect(dopo).toEqual(nate)
    expect(dopo[0]).toBe(nate[0])
    expect(righeRecensione([visitaRecensione], { modo: 'spento' }, '', [], adessoRecensione)).toEqual([])
  })

  it('una recensione già inviata o fermata non rinasce', () => {
    const [nata] = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const inviata: RigaCoda = { ...nata, stato: 'inviata' }
    expect(righeRecensione(
      [{ ...visitaRecensione, chiusoIl: '2026-10-27T11:00:00.000Z' }],
      { modo: 'automatico' },
      linkRecensione,
      [inviata],
      adessoRecensione,
    )).toEqual([inviata])
    expect(inviata.parteIl).toBe('2026-10-27T19:00:00.000Z')

    const fermata: RigaCoda = { ...nata, stato: 'fermata', motivo: 'fermata' }
    expect(righeRecensione([visitaRecensione], { modo: 'manuale' }, linkRecensione, [fermata], adessoRecensione)).toEqual([fermata])
    expect(fermata.parteIl).toBe(nata.parteIl)
  })

  it('lascia intatte le righe che non sono recensioni', () => {
    const [promemoria] = righePromemoria([visita], automatico, [])
    const [recensione] = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const dopo = righeRecensione([riapertaRecensione], { modo: 'automatico' }, linkRecensione, [promemoria, recensione], adessoRecensione)
    expect(dopo).toEqual([promemoria])
    expect(dopo[0]).toBe(promemoria)
  })

  it('non toglie la recensione di un altro appuntamento', () => {
    const [diN] = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const dopo = righeRecensione(
      [{ id: 'b', dogId: 'e', status: 'non_venuto', chiusoIl: null, nomeCane: 'Luna', email: 'b@b.it', noteProblema: false }],
      { modo: 'automatico' },
      linkRecensione,
      [diN],
      adessoRecensione,
    )
    expect(dopo).toEqual([diN])
    expect(dopo[0]).toBe(diN)
  })

  it('sei visite nello stesso giro non superano le cinque recensioni di oggi', () => {
    const visite = Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      dogId: String(i),
      status: 'completato',
      chiusoIl: '2026-10-27T09:00:00.000Z',
      nomeCane: 'N',
      email: 'a@b.it',
      noteProblema: false,
    }))
    const dopo = righeRecensione(visite, { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    expect(dopo).toHaveLength(5)
    expect(dopo.map((riga) => riga.evento)).toEqual(['recensione:0', 'recensione:1', 'recensione:2', 'recensione:3', 'recensione:4'])
    expect(dopo.every((riga) => riga.appointmentId === riga.evento.slice('recensione:'.length))).toBe(true)
  })

  it('un cane non in cura chiude le recensioni in coda e non ne crea', () => {
    const [recensione] = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    const altro: RigaCoda = { ...recensione, id: 'recensione:b', evento: 'recensione:b', dogId: 'e', appointmentId: 'b', nomeCane: 'Luna' }
    const pronto: RigaCoda = { ...recensione, id: 'pronto:n', tipo: 'pronto', evento: 'pronto:n' }
    const nonInviata: RigaCoda = { ...recensione, id: 'recensione:c', evento: 'recensione:c', appointmentId: 'c', stato: 'non_inviata', motivo: 'rete' }
    const esistenti = [recensione, altro, pronto, nonInviata]
    const dopo = righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, esistenti, adessoRecensione, [], false)
    expect(dopo.find((r) => r.evento === recensione.evento)?.stato).toBe('chiusa')
    expect(dopo.find((r) => r.evento === altro.evento)).toBe(altro)
    expect(dopo.find((r) => r.evento === pronto.evento)).toBe(pronto)
    expect(dopo.find((r) => r.evento === nonInviata.evento)).toBe(nonInviata)
    expect(dopo.filter((r) => r.tipo === 'recensione' && r.dogId === 'nuovo' && r.stato === 'in_coda')).toEqual([])
    expect(dopo).toHaveLength(esistenti.length)
    expect(righeRecensione([visitaRecensione], { modo: 'automatico' }, linkRecensione, [], adessoRecensione, [], false)).toEqual([])
  })
})

const bucoAttesa = { id: 'dis', status: 'disdetto', ora: '10:00', minuti: 90, giorno: '2026-10-28' }
const adessoAttesa = new Date('2026-10-27T10:00:00.000Z')
const listaAttesa = [
  { id: 'w1', dogId: 'd1', durataMin: 60, preferenza: 'mattina' as const, arrivato: '2026-10-01', nomeCane: 'A', email: 'a@b.it' },
  { id: 'w2', dogId: 'd2', durataMin: 60, preferenza: 'mattina' as const, arrivato: '2026-10-02', nomeCane: 'B', email: 'b@b.it' },
]

describe('attesa', () => {
  it('il posto libero punta alla pagina del salone sul giorno e sull’ora', () => {
    expect(linkPostoLibero('i-pelosetti', '2026-10-28', '10:00')).toBe('https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00')
    expect(linkPostoLibero('', '2026-10-28', '10:00')).toBe('')
  })

  it('la prima mail partita chiude le altre della stessa disdetta', () => {
    const attesa = [
      { id: 'w1', dogId: 'd1', durataMin: 60, preferenza: 'mattina' as const, arrivato: '2026-10-01', nomeCane: 'A', email: 'a@b.it' },
      { id: 'w2', dogId: 'd2', durataMin: 60, preferenza: 'mattina' as const, arrivato: '2026-10-02', nomeCane: 'B', email: 'b@b.it' },
    ]
    const adesso = new Date('2026-10-27T10:00:00.000Z')
    const nate = righeAttesa({ id: 'dis', status: 'disdetto', ora: '10:00', minuti: 90, giorno: '2026-10-28' }, attesa, { modo: 'automatico' }, 'i-pelosetti', [], adesso)
    expect(nate.filter((r) => r.stato === 'in_coda')).toHaveLength(2)
    const dopo = righeAttesa({ id: 'dis', status: 'disdetto', ora: '10:00', minuti: 90, giorno: '2026-10-28' }, attesa, { modo: 'automatico' }, 'i-pelosetti', nate.map((r, i) => i === 0 ? { ...r, stato: 'inviata' as const } : r), adesso)
    expect(dopo.find((r) => r.dogId === 'd2')?.stato).toBe('chiusa')
  })

  it('un cane che aspetta il 2026-10-29 non prende il buco del 2026-10-28, chi non ha giorno sì', () => {
    const attesa = [
      { id: 'w1', dogId: 'd1', durataMin: 60, preferenza: 'mattina' as const, arrivato: '2026-10-01', nomeCane: 'A', email: 'a@b.it', giorno: '2026-10-29' },
      { id: 'w2', dogId: 'd2', durataMin: 60, preferenza: 'mattina' as const, arrivato: '2026-10-02', nomeCane: 'B', email: 'b@b.it' },
      { id: 'w3', dogId: 'd3', durataMin: 60, preferenza: 'mattina' as const, arrivato: '2026-10-03', nomeCane: 'C', email: 'c@b.it', giorno: '2026-10-28' },
    ]
    const nate = righeAttesa(bucoAttesa, attesa, { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)
    expect(nate.find((r) => r.dogId === 'd1')).toBeUndefined()
    expect(nate.find((r) => r.dogId === 'd2')).toMatchObject({
      id: 'attesa:dis:d2',
      evento: 'attesa:dis:d2',
      appointmentId: 'dis',
      stato: 'in_coda',
      nomeCane: 'B',
      email: 'b@b.it',
    })
    expect(nate.find((r) => r.dogId === 'd3')?.evento).toBe('attesa:dis:d3')
    expect(nate).toHaveLength(2)
  })

  it('una seconda chiamata venti minuti dopo non sposta l’ora di partenza', () => {
    const [nata] = righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)
    expect(nata.parteIl).toBe('2026-10-27T10:15:00.000Z')
    expect(nata).toMatchObject({
      id: 'attesa:dis:d1',
      tipo: 'attesa',
      evento: 'attesa:dis:d1',
      appointmentId: 'dis',
      dogId: 'd1',
      stato: 'in_coda',
      motivo: '',
      email: 'a@b.it',
      nomeCane: 'A',
    })
    const dopo = righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'automatico' }, 'i-pelosetti', [nata], new Date('2026-10-27T10:20:00.000Z'))
    expect(dopo[0].parteIl).toBe('2026-10-27T10:15:00.000Z')
    expect(dopo[0].stato).toBe('in_coda')
    expect(dopo[0].id).toBe(nata.id)
  })

  it('un cane che non entra più nel buco esce dalla coda, e una mail fallita non riparte se un’altra è già partita', () => {
    const nate = righeAttesa(bucoAttesa, listaAttesa, { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)
    const soloPomeriggio = listaAttesa.map((cane, i) => i === 1 ? { ...cane, preferenza: 'pomeriggio' as const } : cane)
    const ristretta = righeAttesa(bucoAttesa, soloPomeriggio, { modo: 'automatico' }, 'i-pelosetti', nate, adessoAttesa)
    expect(ristretta.find((r) => r.dogId === 'd1')?.stato).toBe('in_coda')
    expect(ristretta.find((r) => r.dogId === 'd2')?.stato).toBe('chiusa')

    const fallita = { ...nate[1], stato: 'non_inviata' as const, motivo: 'rete' }
    const dopo = righeAttesa(
      bucoAttesa,
      listaAttesa,
      { modo: 'automatico' },
      'i-pelosetti',
      [{ ...nate[0], stato: 'inviata' as const }, fallita],
      new Date('2026-10-27T10:20:00.000Z'),
    )
    expect(dopo.find((r) => r.dogId === 'd2')).toMatchObject({ stato: 'chiusa', parteIl: fallita.parteIl })
  })

  it('senza il buco non crea righe e chiude quelle in coda di quella disdetta', () => {
    const nate = righeAttesa(bucoAttesa, listaAttesa, { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)
    const inviata: RigaCoda = { ...nate[0], stato: 'inviata' }
    const fermata: RigaCoda = {
      id: 'attesa:dis:d3',
      tipo: 'attesa',
      dogId: 'd3',
      appointmentId: 'dis',
      evento: 'attesa:dis:d3',
      parteIl: nate[0].parteIl,
      stato: 'fermata',
      motivo: 'fermata',
      email: 'c@b.it',
      nomeCane: 'C',
      nomeCliente: '',
      inizio: null,
    }
    const altra: RigaCoda = {
      ...nate[1],
      id: 'attesa:altra:d9',
      evento: 'attesa:altra:d9',
      appointmentId: 'altra',
      dogId: 'd9',
      nomeCane: 'Z',
    }
    const pronto: RigaCoda = { ...nate[0], id: 'pronto:a', tipo: 'pronto', evento: 'pronto:a' }
    const dopo = righeAttesa(
      { ...bucoAttesa, status: 'programmato' },
      listaAttesa,
      { modo: 'automatico' },
      'i-pelosetti',
      [inviata, nate[1], fermata, altra, pronto],
      adessoAttesa,
    )
    expect(dopo.find((r) => r.evento === inviata.evento)).toBe(inviata)
    expect(dopo.find((r) => r.evento === nate[1].evento)?.stato).toBe('chiusa')
    expect(dopo.find((r) => r.evento === fermata.evento)).toBe(fermata)
    expect(dopo.find((r) => r.evento === altra.evento)).toBe(altra)
    expect(dopo.find((r) => r.evento === pronto.evento)).toBe(pronto)
    expect(dopo).toHaveLength(5)
    expect(righeAttesa({ ...bucoAttesa, status: 'programmato' }, listaAttesa, { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)).toEqual([])
  })

  it('un’email non valida crea comunque la riga con motivo manca_email', () => {
    const [invalida] = righeAttesa(
      bucoAttesa,
      [{ ...listaAttesa[0], email: 'fido' }],
      { modo: 'automatico' },
      'i-pelosetti',
      [],
      adessoAttesa,
    )
    expect(invalida.motivo).toBe('manca_email')
    expect(invalida.email).toBe('fido')
    expect(invalida.stato).toBe('in_coda')
    expect(invalida.parteIl).toBe('2026-10-27T10:15:00.000Z')
    expect(invalida.nomeCane).toBe('A')
    expect(invalida.evento).toBe('attesa:dis:d1')

    const [manca] = righeAttesa(
      bucoAttesa,
      [{ ...listaAttesa[0], email: undefined }],
      { modo: 'manuale' },
      'i-pelosetti',
      [],
      adessoAttesa,
    )
    expect(manca.motivo).toBe('manca_email')
    expect(manca.email).toBe('')
    expect(manca.parteIl).toBeNull()
  })

  it('in manuale la riga non ha ora di partenza', () => {
    const [riga] = righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'manuale' }, 'i-pelosetti', [], adessoAttesa)
    expect(riga.parteIl).toBeNull()
    expect(riga.stato).toBe('in_coda')
    expect(riga.motivo).toBe('')
    expect(riga.id).toBe('attesa:dis:d1')

    const nata = righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)
    const manuale = righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'manuale' }, 'i-pelosetti', nata, adessoAttesa)
    expect(manuale[0].parteIl).toBeNull()
    expect(manuale[0].stato).toBe('in_coda')
  })

  it('senza slug la riga dice pagina_assente e non ha ora di partenza', () => {
    const [riga] = righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'automatico' }, '', [], adessoAttesa)
    expect(riga.motivo).toBe('pagina_assente')
    expect(riga.parteIl).toBeNull()
    expect(riga.stato).toBe('in_coda')
    expect(riga.evento).toBe('attesa:dis:d1')
    expect(linkPostoLibero('NO', '2026-10-28', '10:00')).toBe('')
  })

  it('la mail già partita non tocca una fermata né un’altra disdetta', () => {
    const nate = righeAttesa(bucoAttesa, listaAttesa, { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)
    const inviata: RigaCoda = { ...nate[0], stato: 'inviata' }
    const fermata: RigaCoda = {
      id: 'attesa:dis:d3',
      tipo: 'attesa',
      dogId: 'd3',
      appointmentId: 'dis',
      evento: 'attesa:dis:d3',
      parteIl: nate[0].parteIl,
      stato: 'fermata',
      motivo: 'fermata',
      email: 'c@b.it',
      nomeCane: 'C',
      nomeCliente: '',
      inizio: null,
    }
    const altra: RigaCoda = { ...nate[1], id: 'attesa:altra:d9', evento: 'attesa:altra:d9', appointmentId: 'altra', dogId: 'd9', nomeCane: 'Z' }
    const pronto: RigaCoda = { ...nate[0], id: 'pronto:a', tipo: 'pronto', evento: 'pronto:a' }
    const dopo = righeAttesa(bucoAttesa, listaAttesa, { modo: 'automatico' }, 'i-pelosetti', [inviata, nate[1], fermata, altra, pronto], adessoAttesa)
    expect(dopo.find((r) => r.evento === inviata.evento)).toBe(inviata)
    expect(dopo.find((r) => r.evento === nate[1].evento)?.stato).toBe('chiusa')
    expect(dopo.find((r) => r.evento === fermata.evento)).toBe(fermata)
    expect(dopo.find((r) => r.evento === altra.evento)).toBe(altra)
    expect(dopo.find((r) => r.evento === pronto.evento)).toBe(pronto)
    expect(dopo).toHaveLength(5)
  })

  it('spento restituisce le righe esistenti e non ne crea', () => {
    const nate = righeAttesa(bucoAttesa, listaAttesa, { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)
    const dopo = righeAttesa(
      { ...bucoAttesa, status: 'programmato' },
      listaAttesa,
      { modo: 'spento' },
      '',
      nate,
      adessoAttesa,
    )
    expect(dopo).toEqual(nate)
    expect(dopo[0]).toBe(nate[0])
    expect(righeAttesa(bucoAttesa, listaAttesa, { modo: 'spento' }, 'i-pelosetti', [], adessoAttesa)).toEqual([])
  })

  it('un cane non in cura chiude le righe in coda di quei cani e non ne crea', () => {
    const nate = righeAttesa(bucoAttesa, listaAttesa, { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)
    const altro: RigaCoda = { ...nate[0], id: 'attesa:dis:d9', evento: 'attesa:dis:d9', dogId: 'd9', nomeCane: 'Z' }
    const pronto: RigaCoda = { ...nate[0], id: 'pronto:a', tipo: 'pronto', evento: 'pronto:a' }
    const inviata: RigaCoda = { ...nate[0], id: 'attesa:altra:d1', evento: 'attesa:altra:d1', appointmentId: 'altra', stato: 'inviata' }
    const esistenti = [nate[0], nate[1], altro, pronto, inviata]
    const dopo = righeAttesa(bucoAttesa, listaAttesa, { modo: 'automatico' }, 'i-pelosetti', esistenti, adessoAttesa, false)
    expect(dopo.find((r) => r.evento === nate[0].evento)?.stato).toBe('chiusa')
    expect(dopo.find((r) => r.evento === nate[1].evento)?.stato).toBe('chiusa')
    expect(dopo.find((r) => r.evento === altro.evento)).toBe(altro)
    expect(dopo.find((r) => r.evento === pronto.evento)).toBe(pronto)
    expect(dopo.find((r) => r.evento === inviata.evento)).toBe(inviata)
    expect(dopo.filter((r) => r.tipo === 'attesa' && (r.dogId === 'd1' || r.dogId === 'd2') && r.stato === 'in_coda')).toEqual([])
    expect(dopo).toHaveLength(esistenti.length)
    expect(righeAttesa(bucoAttesa, listaAttesa, { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa, false)).toEqual([])
  })

  it('chi non entra nel buco per fascia o durata non riceve la riga', () => {
    const attesa = [
      { id: 'w1', dogId: 'd1', durataMin: 120, preferenza: 'mattina' as const, arrivato: '2026-10-01', nomeCane: 'A', email: 'a@b.it' },
      { id: 'w2', dogId: 'd2', durataMin: 60, preferenza: 'pomeriggio' as const, arrivato: '2026-10-02', nomeCane: 'B', email: 'b@b.it' },
    ]
    expect(righeAttesa(bucoAttesa, attesa, { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)).toEqual([])
  })

  it('una fermata della stessa disdetta non rinasce', () => {
    const [nata] = righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'automatico' }, 'i-pelosetti', [], adessoAttesa)
    const fermata: RigaCoda = { ...nata, stato: 'fermata', motivo: 'fermata' }
    expect(righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'automatico' }, 'i-pelosetti', [fermata], adessoAttesa)).toEqual([fermata])
    expect(righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'automatico' }, 'i-pelosetti', [fermata], adessoAttesa)[0]).toBe(fermata)
  })

  it('copia il nome del cliente e lascia l’inizio vuoto', () => {
    const [riga] = righeAttesa(bucoAttesa, [{ ...listaAttesa[0], nomeCliente: 'Giulia' }], { modo: 'manuale' }, 'i-pelosetti', [], adessoAttesa)
    expect(riga.nomeCliente).toBe('Giulia')
    expect(riga.inizio).toBeNull()
    const [senza] = righeAttesa(bucoAttesa, [listaAttesa[0]], { modo: 'manuale' }, 'i-pelosetti', [], adessoAttesa)
    expect(senza.nomeCliente).toBe('')
  })
})

describe('nome del cliente sulle altre righe', () => {
  it('pronto, auguri e recensione copiano il nome e non l’inizio', () => {
    const [pronto] = righePronto([{ ...visitaChiusa, nomeCliente: 'Giulia' }], { modo: 'automatico' }, [])
    expect(pronto.nomeCliente).toBe('Giulia')
    expect(pronto.inizio).toBeNull()
    const [prontoVuoto] = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    expect(prontoVuoto.nomeCliente).toBe('')

    const [auguri] = righeAuguri([{ ...luna, nomeCliente: 'Giulia' }], alleNove, [], oggiCompleanno)
    expect(auguri.nomeCliente).toBe('Giulia')
    expect(auguri.inizio).toBeNull()

    const [recensione] = righeRecensione([{ ...visitaRecensione, nomeCliente: 'Giulia' }], { modo: 'automatico' }, linkRecensione, [], adessoRecensione)
    expect(recensione.nomeCliente).toBe('Giulia')
    expect(recensione.inizio).toBeNull()
  })
})
