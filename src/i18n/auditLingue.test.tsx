import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthMark } from '../components/brand/AuthMark'
import { buildExportData } from '../lib/earningsExport'
import { mailPostoLibero } from './emailHtml'
import { fr } from './fr'
import { LinguaProvider } from './LinguaContext'

vi.mock('../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))

// Quello che il giro T7 ha trovato a schermo e nei file.
describe('audit delle cinque lingue', () => {
  afterEach(() => localStorage.clear())

  it('la scritta del login segue la lingua', () => {
    localStorage.setItem('groomly.lingua', 'de')
    render(<LinguaProvider><AuthMark /></LinguaProvider>)
    expect(screen.getByText('Hundesalon')).toBeTruthy()
    expect(screen.queryByText('toelettatura')).toBeNull()
  })

  it('i file degli incassi scrivono la data tedesca con i punti', () => {
    const giorno = new Date(2026, 9, 5, 10)
    const visita = { id: 'a', dogId: 'd', kind: 'pelosetto', start: giorno, status: 'completato', total: 20, services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 20 }], createdAt: giorno, updatedAt: giorno }
    const dati = (lingua: 'de' | 'fr') => buildExportData([visita] as never, [] as never, [] as never, {} as never, { from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) }, { riepilogo: true, dettaglio: true, attivita: false, mancati: false }, 'mese', new Date(2026, 10, 2), lingua)
    expect(dati('de').rows[0].date).toBe('05.10.2026')
    expect(dati('de').periodLabel).toBe('01.10.2026 - 31.10.2026')
    expect(dati('fr').rows[0].date).toBe('05/10/2026')
  })

  it('il francese tiene lo spazio insecabile', () => {
    const mail = mailPostoLibero({ lingua: 'fr', nomeSalone: 'Pelo', quando: '', url: 'https://x.test' })
    expect(mail.testo).toContain(' : https://x.test')
    for (const [chiave, frase] of Object.entries(fr)) expect(/\S [:;?!%](\s|$)/.test(frase), chiave).toBe(false)
  })
})
