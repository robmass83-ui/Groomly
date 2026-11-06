import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contaAperte, ingressoRichiestaPubblica } from '../../../src/lib/prenotazione'
import { nomeCaneRicevuta } from './inviaRichiesta'

describe('il nome del cane nella ricevuta', () => {
  it('sta in una riga e non supera 80 caratteri, per un testo scritto da un anonimo', () => {
    const nome = nomeCaneRicevuta(`${'x'.repeat(5000)}\nCompra qui`)
    expect(nome).toHaveLength(80)
    expect(nomeCaneRicevuta('Rex\r\nCompra qui')).toBe('Rex Compra qui')
    expect(nomeCaneRicevuta(undefined)).toBe('')
  })
})

describe('inviaRichiesta pubblica', () => {
  it('non scrive sul ramo inizio/fine e il posto usa la durata del servizio', () => {
    const funzione = readFileSync('functions/src/piano/inviaRichiesta.ts', 'utf8')
    expect(funzione).toContain('ingressoRichiestaPubblica')
    expect(funzione).toContain('contaAperte')
    expect(funzione).not.toContain('quando.giorno && quando.ora')
    expect(funzione).toContain('intervalloRichiesta({ giorno: ingresso.giorno, ora: ingresso.ora })')
    expect(funzione).toContain('postiLiberiPer(input.salonId, quando.giorno, scelta.durataMin)')
    const index = readFileSync('functions/src/index.ts', 'utf8')
    const da = index.indexOf('export const inviaRichiesta')
    const a = index.indexOf('function chiaveBrevo')
    const corpo = index.slice(da, a)
    expect(corpo).toContain('chiaveBrevo()')
  })
  it('la lingua della pagina arriva dalla callable, si salva sulla richiesta e guida la ricevuta', () => {
    const funzione = readFileSync('functions/src/piano/inviaRichiesta.ts', 'utf8')
    expect(funzione).toContain('...(linguaPagina ? { lingua: linguaPagina } : {})')
    expect(funzione).toContain('linguaCliente(linguaPagina, impostazioni.linguaClienti)')
    const index = readFileSync('functions/src/index.ts', 'utf8')
    expect(index.slice(index.indexOf('export const inviaRichiesta'), index.indexOf('function chiaveBrevo'))).toContain("lingua: text(field(request.data, 'lingua'))")
  })
  it('la terza richiesta con lo stesso cellulare senza prefisso è rifiutata come con lo stesso formato', () => {
    const aperte = [{ phone: '+39 320 5550000' }, { phone: '0039 320 5550000' }]
    const conti = contaAperte(aperte, '320 5550000', 'nuova@cliente.it')
    const esito = ingressoRichiestaPubblica({
      nome: 'Ada Rossi', phone: '320 5550000', email: 'nuova@cliente.it', giorno: '2026-11-10', ora: '10:00',
      esca: '', consenso: true, adesso: new Date('2026-11-03T10:00:00Z'), aperteTelefono: conti.aperteTelefono, aperteEmail: conti.aperteEmail, aperteMittente: conti.aperteMittente, aperteSalone: conti.aperteSalone,
    })
    expect(esito).toEqual({ ok: false, message: 'Troppe richieste' })
  })
})
