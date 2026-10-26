import { describe, expect, it } from 'vitest'
import { emailMessaggio, etichettaRuolo, type TipoEmail } from './emailHtml'
import type { Lingua } from './lingua'

const TIPI: TipoEmail[] = ['verifica', 'reset', 'invito', 'ricevuta', 'conferma', 'proposta', 'rifiuto', 'scadenza', 'disdetta', 'promemoria']
const LINGUE: Lingua[] = ['it', 'en', 'es']

describe('email', () => {
  it('dieci email, tre lingue, con logo e pulsante, e il nome escapato', () => {
    expect(TIPI).toHaveLength(10)
    for (const tipo of TIPI) {
      for (const lingua of LINGUE) {
        const messaggio = emailMessaggio(lingua, tipo, { nome: 'Rex <b>', salone: 'Pelo & C', url: 'https://groomlyapp.it/azione?lang=' + lingua })
        expect(messaggio.oggetto.length).toBeGreaterThan(0)
        expect(messaggio.html).toContain('groomly-logo')
        expect(messaggio.html).toContain('<a ')
        expect(messaggio.html).toContain('Rex &lt;b&gt;')
        expect(messaggio.html).toContain('Pelo &amp; C')
        expect(messaggio.html).not.toContain('Rex <b>')
        expect(messaggio.html).not.toContain('.apk')
      }
    }
  })

  it('l’invito usa le etichette della lingua di chi invita', () => {
    expect(etichettaRuolo('en', 'socio')).toBe('Partner')
    expect(etichettaRuolo('en', 'collaboratore')).toBe('Team member')
    expect(etichettaRuolo('es', 'socio')).toBe('Socio')
    expect(etichettaRuolo('es', 'collaboratore')).toBe('Colaborador')
    const invito = emailMessaggio('en', 'invito', { ruolo: 'collaboratore' })
    expect(invito.html).toContain('Team member')
  })
})
