import { describe, expect, it } from 'vitest'
import { emailMessaggio, etichettaRuolo, type TipoEmail } from './emailHtml'
import type { Lingua } from './lingua'

const TIPI: TipoEmail[] = ['verifica', 'reset', 'invito', 'ricevuta', 'conferma', 'proposta', 'rifiuto', 'liberato', 'scadenza', 'disdetta', 'promemoria']
const SENZA_PULSANTI: TipoEmail[] = ['conferma', 'rifiuto', 'liberato', 'scadenza']
const LINGUE: Lingua[] = ['it', 'en', 'es']

describe('email', () => {
  it('undici email, tre lingue, con logo e pulsante dove serve, e il nome escapato', () => {
    expect(TIPI).toHaveLength(11)
    for (const tipo of TIPI) {
      for (const lingua of LINGUE) {
        const messaggio = emailMessaggio(lingua, tipo, { nome: 'Rex <b>', salone: 'Pelo & C', url: 'https://groomlyapp.it/azione?lang=' + lingua })
        expect(messaggio.oggetto.length).toBeGreaterThan(0)
        expect(messaggio.html).toContain('groomly-logo')
        if (SENZA_PULSANTI.includes(tipo)) expect(messaggio.html).not.toContain('<a ')
        else expect(messaggio.html).toContain('<a ')
        expect(messaggio.html).toContain('Rex &lt;b&gt;')
        expect(messaggio.html).toContain('Pelo &amp; C')
        expect(messaggio.html).not.toContain('Rex <b>')
        expect(messaggio.html).not.toContain('.apk')
      }
    }
  })

  it('la proposta ha due pulsanti, Conferma e Rifiuta, con gli indirizzi escapati; le altre nessuno', () => {
    const url = 'https://x.it/r?salonId=s&id=i&azione=conferma'
    const urlRifiuta = 'https://x.it/r?salonId=s&id=i&azione=rifiuta'
    for (const lingua of LINGUE) {
      const proposta = emailMessaggio(lingua, 'proposta', { url, urlRifiuta })
      expect(proposta.html).toContain(url.replaceAll('&', '&amp;'))
      expect(proposta.html).toContain(urlRifiuta.replaceAll('&', '&amp;'))
      expect(proposta.html.match(/<a /g)).toHaveLength(2)
      for (const tipo of SENZA_PULSANTI) {
        const altra = emailMessaggio(lingua, tipo, { url, urlRifiuta })
        expect(altra.html).not.toContain('<a ')
        expect(altra.html).not.toContain('azione=rifiuta')
      }
    }
    expect(emailMessaggio('it', 'proposta', { url }).html.match(/<a /g)).toHaveLength(1)
  })

  it('la proposta dice l’orario nuovo, quello chiesto e il tempo, con Conferma e Rifiuta', () => {
    const proposta = emailMessaggio('it', 'proposta', {
      nome: 'Rex',
      salone: 'Canespa',
      url: 'https://groomlyapp.it/r?azione=conferma',
      urlRifiuta: 'https://groomlyapp.it/r?azione=rifiuta',
      quando: 'giovedì 29 ottobre, 10:00–11:00',
      invece: 'mercoledì 28 ottobre alle 17:00',
      entro: 'le 22:15',
    })
    expect(proposta.html).toContain('Conferma')
    expect(proposta.html).toContain('Rifiuta')
    expect(proposta.html).toContain('le 22:15')
    expect(proposta.html).not.toContain('>Togli<')
    expect(proposta.html).toContain('giovedì 29 ottobre, 10:00–11:00')
    expect(proposta.html).toContain('mercoledì 28 ottobre alle 17:00')
    expect(proposta.html).toContain('#9E2F2A')
    expect(proposta.html).toContain('https://groomlyapp.it/r?azione=conferma')
    expect(proposta.html).toContain('https://groomlyapp.it/r?azione=rifiuta')
    const conferma = proposta.html.indexOf('>Conferma<')
    const rifiuta = proposta.html.indexOf('>Rifiuta<')
    expect(conferma).toBeGreaterThan(-1)
    expect(rifiuta).toBeGreaterThan(conferma)
    const cella = proposta.html.slice(proposta.html.lastIndexOf('<td', conferma), rifiuta)
    expect(cella).toContain('azione=conferma')
  })

  it('la conferma dice l’orario senza pulsante', () => {
    const quando = 'mercoledì 28 ottobre, 17:00–18:00'
    const conferma = emailMessaggio('it', 'conferma', { nome: 'Rex', salone: 'Canespa', quando })
    expect(conferma.html).toContain(`Canespa ha confermato l’appuntamento di Rex. L’appuntamento è ${quando}.`)
    expect(conferma.html).not.toContain('<a ')
    expect(emailMessaggio('en', 'conferma', { quando: 'x' }).html).toContain('The appointment is x.')
    expect(emailMessaggio('es', 'conferma', { quando: 'x' }).html).toContain('La cita es x.')
  })

  it('il posto liberato non ha pulsante e dice che il posto è stato liberato', () => {
    const liberato = emailMessaggio('it', 'liberato')
    expect(liberato.oggetto).toBe('Posto liberato')
    expect(liberato.html).not.toContain('<a ')
    expect(liberato.html).toContain('Il posto è stato liberato')
  })

  it('il rifiuto del salone resta non può accettare, senza ancora', () => {
    const rifiuto = emailMessaggio('it', 'rifiuto', { salone: 'Canespa' })
    expect(rifiuto.html).toContain('non può accettare')
    expect(rifiuto.html).not.toContain('<a ')
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
