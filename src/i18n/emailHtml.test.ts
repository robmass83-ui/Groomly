import { describe, expect, it } from 'vitest'
import { emailMessaggio, etichettaRuolo, type TipoEmail } from './emailHtml'
import type { Lingua } from './lingua'

const TIPI: TipoEmail[] = ['verifica', 'reset', 'invito', 'ricevuta', 'conferma', 'proposta', 'rifiuto', 'scadenza', 'disdetta', 'promemoria', 'pronto', 'auguri', 'recensione', 'attesa']
const LINGUE: Lingua[] = ['it', 'en', 'es']
const SERVIZI: TipoEmail[] = ['promemoria', 'pronto', 'auguri', 'recensione', 'attesa']
const SILENZIO: Record<Lingua, string> = {
  it: 'Non scrivermi più',
  en: 'Don’t email me again',
  es: 'No me escribas más',
}
const RECENSIONE: Record<Lingua, string> = {
  it: 'Se ti è piaciuto il lavoro, una recensione su Google ci aiuta. Grazie.',
  en: 'If you liked the work, a Google review helps us. Thank you.',
  es: 'Si te ha gustado el trabajo, una reseña en Google nos ayuda. Gracias.',
}
const POSTO = 'https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00'

describe('email', () => {
  it('ogni tipo, tre lingue, con logo e pulsante, e il nome escapato', () => {
    expect(TIPI).toHaveLength(14)
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

  it('i cinque servizi hanno oggetto, corpo, bottone e nota, e finiscono col silenzio', () => {
    const silenzio = 'https://groomlyapp.it/azione?mode=silenzio&salon=salone-1&token=aaaaaaaaaaaaaaaa'
    for (const tipo of SERVIZI) {
      for (const lingua of LINGUE) {
        const messaggio = emailMessaggio(lingua, tipo, {
          nome: 'Rex',
          salone: 'Pelo',
          url: tipo === 'attesa' ? POSTO : 'https://groomlyapp.it/azione',
          silenzio,
        })
        expect(messaggio.oggetto.length).toBeGreaterThan(0)
        expect(messaggio.html).toContain('<a ')
        expect(messaggio.html).toContain(SILENZIO[lingua])
        expect(messaggio.html).toContain('mode=silenzio')
        expect(messaggio.html.indexOf(SILENZIO[lingua])).toBeGreaterThan(messaggio.html.indexOf('<h1'))
        if (tipo === 'attesa') expect(messaggio.html.replaceAll('&amp;', '&')).toContain(POSTO)
        if (tipo === 'recensione') expect(messaggio.html).toContain(RECENSIONE[lingua])
      }
    }
    expect(emailMessaggio('it', 'verifica').html).not.toContain('Non scrivermi più')
  })
})
