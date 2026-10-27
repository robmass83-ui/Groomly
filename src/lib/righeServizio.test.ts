import { describe, expect, it } from 'vitest'
import type { RigaCoda } from './codaEmail'
import type { SceltaServizio } from './serviziEmail'
import { righePromemoria } from './righeServizio'

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
