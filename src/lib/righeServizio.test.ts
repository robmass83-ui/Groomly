import { describe, expect, it } from 'vitest'
import type { RigaCoda } from './codaEmail'
import type { SceltaServizio } from './serviziEmail'
import { righeAuguri, righePromemoria, righePronto } from './righeServizio'

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

  it('in manuale la riga non ha ora di partenza', () => {
    const [riga] = righePromemoria([visita], { modo: 'manuale', anticipoGiorni: 1, ora: '18:00' }, [])
    expect(riga.parteIl).toBeNull()
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

  it('cambiare ora o passare al manuale aggiorna la riga ancora in coda', () => {
    const nate = righePromemoria([visita], automatico, [])
    const alleNove = righePromemoria([visita], { modo: 'automatico', anticipoGiorni: 1, ora: '09:00' }, nate)
    expect(alleNove[0].parteIl).toBe('2026-10-27T08:00:00.000Z')
    expect(alleNove[0].stato).toBe('in_coda')
    const manuale = righePromemoria([visita], { modo: 'manuale', anticipoGiorni: 1, ora: '18:00' }, alleNove)
    expect(manuale[0].parteIl).toBeNull()
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
    expect(manca.parteIl).toBeNull()
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
    }
    const dopo = righePromemoria([{ ...visita, status: 'disdetto' }], automatico, [pronto, promemoria])
    expect(dopo[0]).toBe(pronto)
    expect(dopo[1].stato).toBe('chiusa')
    expect(dopo[1].evento).toBe(promemoria.evento)
    expect(dopo).toHaveLength(2)
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
  it('il pronto parte 15 minuti dopo la chiusura salvata', () => {
    const [riga] = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    expect(riga.parteIl).toBe('2026-10-27T09:15:00.000Z')
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

  it('in manuale la riga non ha ora di partenza', () => {
    const [riga] = righePronto([visitaChiusa], { modo: 'manuale' }, [])
    expect(riga.parteIl).toBeNull()
    expect(riga.stato).toBe('in_coda')
    expect(riga.id).toBe('pronto:a')
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
    const [manca] = righePronto([{ ...visitaChiusa, email: undefined }], { modo: 'manuale' }, [])
    expect(manca.motivo).toBe('manca_email')
    expect(manca.email).toBe('')
    expect(manca.stato).toBe('in_coda')
    expect(manca.parteIl).toBeNull()
    expect(manca.evento).toBe('pronto:a')

    const [vuota] = righePronto([{ ...visitaChiusa, email: '' }], { modo: 'automatico' }, [])
    expect(vuota.motivo).toBe('manca_email')
    expect(vuota.parteIl).toBe('2026-10-27T09:15:00.000Z')

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

  it('una riga già in coda tiene l’ora di partenza già scritta', () => {
    const [nata] = righePronto([visitaChiusa], { modo: 'automatico' }, [])
    const gia: RigaCoda = { ...nata, id: 'vecchia', parteIl: '2026-10-27T09:20:00.000Z' }
    const dopo = righePronto([visitaChiusa], { modo: 'automatico' }, [gia])
    expect(dopo).toEqual([{ ...gia, motivo: '', email: 'a@b.it', nomeCane: 'Fido' }])
    expect(dopo[0].parteIl).toBe('2026-10-27T09:20:00.000Z')
    expect(dopo[0].id).toBe('vecchia')
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
  it('gli auguri partono alle 9 del compleanno e non senza data', () => {
    const cani = [
      luna,
      { id: 'e', nome: 'Rex', email: 'a@b.it' },
      { id: 'f', nome: 'Mia', email: 'a@b.it', birthMonth: 10 },
      { id: 'g', nome: 'Teo', email: 'a@b.it', birthDay: 27 },
    ]
    const righe = righeAuguri(cani, alleNove, [], oggiCompleanno)
    expect(righe).toHaveLength(1)
    expect(righe[0].evento).toBe('auguri:d:2026')
    expect(righe[0].parteIl).toBe('2026-10-27T08:00:00.000Z')
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
    expect(mezzanotte.parteIl).toBe('2026-10-27T08:00:00.000Z')

    expect(righeAuguri([luna], alleNove, [], new Date('2026-10-27T23:30:00.000Z'))).toEqual([])

    const capodanno = { id: 'd', nome: 'Luna', email: 'a@b.it', birthMonth: 1, birthDay: 1 }
    const [annoNuovo] = righeAuguri([capodanno], alleNove, [], new Date('2026-12-31T23:30:00.000Z'))
    expect(annoNuovo.evento).toBe('auguri:d:2027')
    expect(annoNuovo.parteIl).toBe('2027-01-01T08:00:00.000Z')
  })

  it('in manuale la riga non ha ora di partenza', () => {
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
    expect(vuota.parteIl).toBe('2026-10-27T08:00:00.000Z')

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
      parteIl: '2027-10-27T07:00:00.000Z',
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
})
