import { describe, expect, it } from 'vitest'
import { emailMessaggio, etichettaRuolo, type TipoEmail } from './emailHtml'
import type { Lingua } from './lingua'

const TIPI: TipoEmail[] = ['verifica', 'reset', 'invito', 'ricevuta', 'conferma', 'proposta', 'rifiuto', 'liberato', 'scadenza', 'disdetta', 'promemoria', 'pronto', 'auguri', 'recensione', 'attesa']
const SENZA_PULSANTI: TipoEmail[] = ['conferma', 'rifiuto', 'liberato', 'scadenza']
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
  it('ogni tipo, tre lingue, con logo e pulsante dove serve, e il nome escapato', () => {
    expect(TIPI).toHaveLength(15)
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
    expect(proposta.oggetto).toBe('Proposta di orario')
    expect(proposta.html).toContain('Ci scusiamo, ma nella data e nell’orario scelti, mercoledì 28 ottobre alle 17:00, non è possibile effettuare il trattamento. Le proponiamo in alternativa giovedì 29 ottobre, 10:00–11:00. Rispondi entro le 22:15.')
    expect(proposta.html).toContain('Conferma')
    expect(proposta.html).toContain('Rifiuta')
    expect(proposta.html).toContain('le 22:15')
    expect(proposta.html).not.toContain('>Togli<')
    expect(proposta.html).toContain('giovedì 29 ottobre, 10:00–11:00')
    expect(proposta.html).toContain('mercoledì 28 ottobre alle 17:00')
    const senzaInvece = emailMessaggio('it', 'proposta', { quando: 'giovedì 29 ottobre, 10:00–11:00', entro: 'le 22:15' })
    expect(senzaInvece.html).toContain('nell’orario scelti non è possibile effettuare il trattamento. Le proponiamo in alternativa giovedì 29 ottobre, 10:00–11:00. Rispondi entro le 22:15.')
    expect(senzaInvece.html).not.toContain(', ,')
    const senzaQuando = emailMessaggio('it', 'proposta', { invece: 'mercoledì 28 ottobre alle 17:00', entro: 'le 22:15' })
    expect(senzaQuando.html).toContain('scelti, mercoledì 28 ottobre alle 17:00, non è possibile effettuare il trattamento. Rispondi entro le 22:15.')
    expect(senzaQuando.html).not.toContain('Le proponiamo')
    const senzaEntro = emailMessaggio('it', 'proposta', { invece: 'mercoledì 28 ottobre alle 17:00', quando: 'giovedì 29 ottobre, 10:00–11:00' })
    expect(senzaEntro.html).toContain('Le proponiamo in alternativa giovedì 29 ottobre, 10:00–11:00.')
    expect(senzaEntro.html).not.toContain('Rispondi entro')
    expect(emailMessaggio('en', 'proposta').oggetto).toBe('Suggested time')
    expect(emailMessaggio('en', 'proposta', { invece: 'Wednesday', quando: 'Thursday', entro: '18:00' }).html).toContain('We are sorry, but the treatment cannot be done on the date and time you chose, Wednesday. We suggest Thursday instead. Please reply by 18:00.')
    expect(emailMessaggio('es', 'proposta').oggetto).toBe('Propuesta de horario')
    expect(emailMessaggio('es', 'proposta', { invece: 'miércoles', quando: 'jueves', entro: 'las 18:00' }).html).toContain('Lo sentimos, pero en la fecha y la hora elegidas, miércoles, no es posible realizar el tratamiento. Le proponemos como alternativa jueves. Responda antes de las 18:00.')
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

  it('il rifiuto chiede un altro orario e, con la pagina pubblica, ha un solo pulsante', () => {
    const url = 'https://groomlyapp.it/s/i-pelosetti'
    const rifiuto = emailMessaggio('it', 'rifiuto', { salone: 'Canespa', url, invece: 'mercoledì 28 ottobre alle 17:00' })
    expect(rifiuto.oggetto).toBe('Richiesta non accettata')
    expect(rifiuto.html).toContain('Ci scusiamo, ma nella data e nell’orario scelti, mercoledì 28 ottobre alle 17:00, non è possibile effettuare il trattamento. Si prega di selezionare un’altra data e un orario disponibile.')
    expect(rifiuto.html.match(/<a /g)).toHaveLength(1)
    expect(rifiuto.html).toContain(`href="${url}"`)
    expect(rifiuto.html).toContain('>Scegli un altro orario<')
    expect(rifiuto.html).not.toContain('>Conferma<')
    const senza = emailMessaggio('it', 'rifiuto', { salone: 'Canespa' })
    expect(senza.html).toContain('Ci scusiamo, ma nella data e nell’orario scelti non è possibile effettuare il trattamento. Si prega di selezionare un’altra data e un orario disponibile.')
    expect(senza.html).not.toContain('<a ')
    expect(senza.html).not.toContain(', ,')
    expect(emailMessaggio('en', 'rifiuto', { url, invece: 'Wednesday' }).html).toContain('We are sorry, but the treatment cannot be done on the date and time you chose, Wednesday. Please choose another date and an available time.')
    expect(emailMessaggio('en', 'rifiuto', { url }).html).toContain('>Choose another time<')
    expect(emailMessaggio('es', 'rifiuto', { url, invece: 'miércoles' }).html).toContain('Lo sentimos, pero en la fecha y la hora elegidas, miércoles, no es posible realizar el tratamiento. Seleccione otra fecha y un horario disponible.')
    expect(emailMessaggio('es', 'rifiuto', { url }).html).toContain('>Elegir otro horario<')
    const indirizzoChiuso = emailMessaggio('it', 'rifiuto', { url: 'https://groomlyapp.it/azione' })
    expect(indirizzoChiuso.html).not.toContain('<a ')
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
