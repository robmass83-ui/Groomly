import { afterEach, describe, expect, it, vi } from 'vitest'
import { agendaInAttesa, allargaAgenda, inizioFinestraAgenda, mostraIncassoZero, onFinestraAgenda, pavimentoAgenda, pavimentoVistaRapida, ripristinaFinestraAgenda, testoAgendaVuota } from './finestraAgenda'

describe('finestra agenda', () => {
  afterEach(() => {
    ripristinaFinestraAgenda()
  })

  it('parte da tredici mesi fa, a mezzanotte', () => {
    const adesso = new Date(2026, 9, 25, 15, 40, 0, 0)
    expect(inizioFinestraAgenda(adesso)).toEqual(new Date(2025, 8, 25, 0, 0, 0, 0))
  })

  it('un mese più vecchio abbassa il pavimento e avvisa', () => {
    const visto = vi.fn()
    const stop = onFinestraAgenda(visto)
    const prima = pavimentoAgenda()
    allargaAgenda(new Date(prima - 86_400_000))
    expect(pavimentoAgenda()).toBeLessThan(prima)
    expect(visto).toHaveBeenCalledOnce()
    allargaAgenda(new Date())
    expect(visto).toHaveBeenCalledOnce()
    stop()
  })

  it('la vista rapida è più vicina dei tredici mesi', () => {
    const adesso = new Date(2026, 9, 25, 15, 40, 0, 0)
    expect(pavimentoVistaRapida(adesso)).toBe(new Date(2026, 9, 4, 0, 0, 0, 0).getTime())
    expect(pavimentoVistaRapida(adesso)).toBeGreaterThan(inizioFinestraAgenda(adesso).getTime())
  })

  it('l’agenda non aspetta i cani: basta lo snapshot degli appuntamenti', () => {
    expect(agendaInAttesa(true, false)).toBe(true)
    expect(agendaInAttesa(true, true)).toBe(false)
    expect(agendaInAttesa(false, false)).toBe(false)
  })

  it('in attesa la home non scrive zero euro', () => {
    expect(testoAgendaVuota(true)).toBe("Carico l'agenda…")
    expect(testoAgendaVuota(false)).toBe('Nessun appuntamento')
    expect(mostraIncassoZero(true, 0)).toBe(true)
    expect(mostraIncassoZero(true, 20)).toBe(false)
    expect(mostraIncassoZero(false, 0)).toBe(false)
  })
})
