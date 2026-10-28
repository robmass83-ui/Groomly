import { describe, expect, it } from 'vitest'
import { emailMessaggio, etichettaRuolo, riepilogoRicevuta, type TipoEmail } from './emailHtml'
import type { Lingua } from './lingua'

const TIPI: TipoEmail[] = ['verifica', 'reset', 'invito', 'ricevuta', 'conferma', 'proposta', 'rifiuto', 'liberato', 'scadenza', 'disdetta', 'promemoria', 'pronto', 'auguri', 'recensione', 'attesa']
const SENZA_PULSANTI: TipoEmail[] = ['ricevuta', 'conferma', 'rifiuto', 'liberato', 'scadenza', 'disdetta', 'promemoria', 'pronto', 'auguri']
const LINGUE: Lingua[] = ['it', 'en', 'es']
const SERVIZI: TipoEmail[] = ['promemoria', 'pronto', 'auguri', 'recensione', 'attesa']
const SILENZIO: Record<Lingua, string> = {
  it: 'Non voglio più ricevere queste email',
  en: "I don't want to receive these emails any more",
  es: 'No quiero recibir más estos correos',
}
const RECENSIONE: Record<Lingua, string> = {
  it: 'una recensione su Google ci aiuta tanto e richiede un minuto',
  en: 'a Google review helps us a lot and only takes a minute',
  es: 'una reseña en Google nos ayuda mucho y solo lleva un minuto',
}
const POSTO = 'https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00'
const PIENI = {
  cliente: 'Giulia',
  cane: 'Rex',
  salone: 'Canespa',
  quando: 'martedì 4 novembre, 10:30–11:30',
  invece: 'lunedì 3 novembre alle 09:00',
  entro: 'le 18:00',
  rispondi: true,
}

const FRASI: Record<TipoEmail, Record<Lingua, { oggetto: string; frase: string }> | null> = {
  verifica: null,
  reset: null,
  invito: null,
  ricevuta: {
    it: { oggetto: 'Abbiamo ricevuto la tua richiesta', frase: 'Ciao Giulia, grazie per aver scelto Canespa. La richiesta per Rex è arrivata: ti scriviamo appena il salone risponde.' },
    en: { oggetto: "We've received your request", frase: "Hi Giulia, thank you for choosing Canespa. Your request for Rex has arrived: we'll let you know as soon as the salon replies." },
    es: { oggetto: 'Hemos recibido tu solicitud', frase: 'Hola Giulia, gracias por elegir Canespa. Tu solicitud para Rex ha llegado: te escribiremos en cuanto la peluquería responda.' },
  },
  conferma: {
    it: { oggetto: 'Appuntamento confermato per Rex', frase: 'Ciao Giulia, buone notizie: Canespa ha confermato l’appuntamento di Rex, martedì 4 novembre, 10:30–11:30.' },
    en: { oggetto: 'Appointment confirmed for Rex', frase: "Hi Giulia, good news: Canespa has confirmed Rex's appointment, martedì 4 novembre, 10:30–11:30." },
    es: { oggetto: 'Cita confirmada para Rex', frase: 'Hola Giulia, buenas noticias: Canespa ha confirmado la cita de Rex, martedì 4 novembre, 10:30–11:30.' },
  },
  proposta: {
    it: { oggetto: 'Un nuovo orario per Rex', frase: 'ma Canespa può accogliere Rex martedì 4 novembre, 10:30–11:30. Ti chiediamo di rispondere entro le 18:00: dopo, il posto verrà liberato.' },
    en: { oggetto: 'A new time for Rex', frase: "but Canespa can see Rex martedì 4 novembre, 10:30–11:30. Please reply by le 18:00: after that, the slot will be released." },
    es: { oggetto: 'Un nuevo horario para Rex', frase: 'pero Canespa puede atender a Rex martedì 4 novembre, 10:30–11:30. Te pedimos que respondas antes de le 18:00: después, el hueco quedará libre.' },
  },
  rifiuto: {
    it: { oggetto: 'Aggiornamento sulla tua richiesta', frase: 'Ciao Giulia, ci dispiace: questa volta Canespa non riesce ad accogliere la richiesta per Rex.' },
    en: { oggetto: 'An update on your request', frase: "Hi Giulia, we're sorry: this time Canespa isn't able to accept the request for Rex." },
    es: { oggetto: 'Novedades sobre tu solicitud', frase: 'Hola Giulia, lo sentimos: esta vez Canespa no puede aceptar la solicitud para Rex.' },
  },
  liberato: {
    it: { oggetto: 'Il posto è stato liberato', frase: 'l’orario proposto per Rex non è più riservato. Se vuoi fissare un altro appuntamento, invia una nuova richiesta a Canespa' },
    en: { oggetto: 'The slot has been released', frase: "the proposed time for Rex is no longer held. If you'd like to book another appointment, just send a new request to Canespa" },
    es: { oggetto: 'El hueco ha quedado libre', frase: 'el horario propuesto para Rex ya no está reservado. Si quieres pedir otra cita, envía una nueva solicitud a Canespa' },
  },
  scadenza: {
    it: { oggetto: 'La tua richiesta è scaduta', frase: 'la richiesta per Rex a Canespa è scaduta perché il salone non è riuscito a rispondere in tempo.' },
    en: { oggetto: 'Your request has expired', frase: "the request for Rex to Canespa has expired because the salon wasn't able to reply in time." },
    es: { oggetto: 'Tu solicitud ha caducado', frase: 'la solicitud para Rex a Canespa ha caducado porque la peluquería no pudo responder a tiempo.' },
  },
  disdetta: {
    it: { oggetto: 'Appuntamento di Rex disdetto', frase: 'l’appuntamento di Rex da Canespa è stato disdetto. Quando vuoi fissarne un altro, invia una nuova richiesta o rispondi a questa email.' },
    en: { oggetto: "Rex's appointment cancelled", frase: "Rex's appointment at Canespa has been cancelled. Whenever you'd like to book another, send a new request or reply to this email." },
    es: { oggetto: 'Cita de Rex cancelada', frase: 'la cita de Rex en Canespa ha sido cancelada. Cuando quieras pedir otra, envía una nueva solicitud o responde a este correo.' },
  },
  promemoria: {
    it: { oggetto: 'Ci vediamo presto, Rex!', frase: 'Canespa ti ricorda il prossimo appuntamento di Rex, martedì 4 novembre, 10:30–11:30.' },
    en: { oggetto: 'See you soon, Rex!', frase: "Canespa would like to remind you of Rex's next appointment on martedì 4 novembre, 10:30–11:30." },
    es: { oggetto: '¡Nos vemos pronto, Rex!', frase: 'Canespa te recuerda la próxima cita de Rex, martedì 4 novembre, 10:30–11:30.' },
  },
  pronto: {
    it: { oggetto: 'Rex è pronto!', frase: 'abbiamo finito: Rex è pronto per tornare a casa e puoi passare a prenderlo. Grazie per averlo affidato a Canespa.' },
    en: { oggetto: 'Rex is ready!', frase: "we're all done: Rex is ready to go home and you can come and pick them up. Thank you for trusting Canespa." },
    es: { oggetto: '¡Rex ya está listo!', frase: 'hemos terminado: Rex ya puede volver a casa y puedes pasar a recogerlo. Gracias por confiar en Canespa.' },
  },
  auguri: {
    it: { oggetto: 'Buon compleanno, Rex!', frase: 'tutto lo staff di Canespa fa tanti auguri a Rex.' },
    en: { oggetto: 'Happy birthday, Rex!', frase: 'everyone at Canespa wishes Rex a very happy birthday.' },
    es: { oggetto: '¡Feliz cumpleaños, Rex!', frase: 'todo el equipo de Canespa le desea un muy feliz cumpleaños a Rex.' },
  },
  recensione: {
    it: { oggetto: 'Com’è andata con Rex?', frase: 'Se invece qualcosa non ti ha convinto, rispondi a questa email: ci teniamo a saperlo.' },
    en: { oggetto: 'How did it go with Rex?', frase: "If something wasn't quite right, just reply to this email: we'd really like to know." },
    es: { oggetto: '¿Qué tal le fue a Rex?', frase: 'Si algo no te convenció, responde a este correo: nos importa saberlo.' },
  },
  attesa: {
    it: { oggetto: 'Si è liberato un posto per Rex', frase: 'da Canespa si è liberato un posto in un orario che fa per Rex.' },
    en: { oggetto: 'A slot has opened up for Rex', frase: 'a slot has opened up at Canespa at a time that suits Rex.' },
    es: { oggetto: 'Se ha liberado un hueco para Rex', frase: 'en Canespa se ha liberado un hueco en un horario que le viene bien a Rex.' },
  },
}

const CORNICI: Record<Lingua, Array<{ tipo: TipoEmail; oggetto: string }>> = {
  it: [
    { tipo: 'conferma', oggetto: 'Appuntamento confermato' },
    { tipo: 'proposta', oggetto: 'Un nuovo orario' },
    { tipo: 'promemoria', oggetto: 'Ci vediamo presto!' },
    { tipo: 'pronto', oggetto: 'È pronto' },
    { tipo: 'auguri', oggetto: 'Buon compleanno!' },
    { tipo: 'recensione', oggetto: 'Com’è andata?' },
    { tipo: 'attesa', oggetto: 'Si è liberato un posto' },
    { tipo: 'disdetta', oggetto: 'Appuntamento disdetto' },
  ],
  en: [
    { tipo: 'conferma', oggetto: 'Appointment confirmed' },
    { tipo: 'proposta', oggetto: 'A new time' },
    { tipo: 'promemoria', oggetto: 'See you soon!' },
    { tipo: 'pronto', oggetto: 'Ready for pick-up' },
    { tipo: 'auguri', oggetto: 'Happy birthday!' },
    { tipo: 'recensione', oggetto: 'How did it go?' },
    { tipo: 'attesa', oggetto: 'A slot has opened up' },
    { tipo: 'disdetta', oggetto: 'Appointment cancelled' },
  ],
  es: [
    { tipo: 'conferma', oggetto: 'Cita confirmada' },
    { tipo: 'proposta', oggetto: 'Un nuevo horario' },
    { tipo: 'promemoria', oggetto: '¡Nos vemos pronto!' },
    { tipo: 'pronto', oggetto: 'Ya está listo' },
    { tipo: 'auguri', oggetto: '¡Feliz cumpleaños!' },
    { tipo: 'recensione', oggetto: '¿Qué tal fue?' },
    { tipo: 'attesa', oggetto: 'Se ha liberado un hueco' },
    { tipo: 'disdetta', oggetto: 'Cita cancelada' },
  ],
}

describe('email', () => {
  it('ogni tipo, tre lingue, con logo e pulsante dove serve, e il nome escapato', () => {
    expect(TIPI).toHaveLength(15)
    for (const tipo of TIPI) {
      for (const lingua of LINGUE) {
        const messaggio = emailMessaggio(lingua, tipo, {
          cliente: 'Giulia <i>',
          cane: 'Rex <b>',
          salone: 'Pelo & C',
          url: 'https://groomlyapp.it/azione?lang=' + lingua,
          urlRifiuta: 'https://groomlyapp.it/r?azione=rifiuta',
        })
        expect(messaggio.oggetto.length).toBeGreaterThan(0)
        expect(messaggio.html).toContain('groomly-logo')
        if (SENZA_PULSANTI.includes(tipo)) expect(messaggio.html).not.toContain('<a ')
        else expect(messaggio.html).toContain('<a ')
        expect(messaggio.html).not.toContain('Rex <b>')
        expect(messaggio.html).not.toContain('.apk')
        if (!['verifica', 'reset'].includes(tipo)) {
          expect(messaggio.html).toContain('Pelo &amp; C')
          if (tipo !== 'invito') expect(messaggio.html).toContain('Rex &lt;b&gt;')
        }
      }
    }
  })

  it('oggetto e una frase del corpo, per ogni mail al cliente e ogni lingua', () => {
    const url = 'https://groomlyapp.it/r?azione=conferma'
    const urlRifiuta = 'https://groomlyapp.it/r?azione=rifiuta'
    for (const tipo of TIPI) {
      const frasi = FRASI[tipo]
      if (!frasi) continue
      for (const lingua of LINGUE) {
        const mail = emailMessaggio(lingua, tipo, {
          ...PIENI,
          url: tipo === 'proposta' || tipo === 'recensione' || tipo === 'attesa' ? url : undefined,
          urlRifiuta: tipo === 'proposta' ? urlRifiuta : undefined,
        })
        expect(mail.oggetto).toBe(frasi[lingua].oggetto)
        expect(mail.html).toContain(frasi[lingua].frase)
        expect(mail.html).toContain('Canespa · Rex')
      }
    }
    const proposta = emailMessaggio('it', 'proposta', { ...PIENI, url, urlRifiuta })
    expect(proposta.html).toContain('>Confermo<')
    expect(proposta.html).toContain('>Non posso<')
    expect(proposta.html).not.toContain('>Rifiuta<')
    expect(emailMessaggio('en', 'proposta', { ...PIENI, url, urlRifiuta }).html).toContain(">Confirm<")
    expect(emailMessaggio('en', 'proposta', { ...PIENI, url, urlRifiuta }).html).toContain(">I can't make it<")
    expect(emailMessaggio('en', 'proposta', { ...PIENI, url, urlRifiuta }).html).not.toContain('>Decline<')
    expect(emailMessaggio('es', 'proposta', { ...PIENI, url, urlRifiuta }).html).toContain('>Confirmo<')
    expect(emailMessaggio('es', 'proposta', { ...PIENI, url, urlRifiuta }).html).toContain('>No puedo<')
    expect(emailMessaggio('es', 'proposta', { ...PIENI, url, urlRifiuta }).html).not.toContain('>Rechazar<')
  })

  it('senza cane l’oggetto resta la cornice', () => {
    for (const lingua of LINGUE) {
      for (const cornice of CORNICI[lingua]) {
        expect(emailMessaggio(lingua, cornice.tipo, { cliente: 'Giulia', cane: '', salone: 'Canespa' }).oggetto).toBe(cornice.oggetto)
      }
    }
  })

  it('la proposta ha due pulsanti, Confermo e Non posso, con gli indirizzi escapati; le altre nessuno', () => {
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
    expect(emailMessaggio('it', 'proposta', {}).html).not.toContain('<a ')
    expect(emailMessaggio('it', 'recensione', { cliente: 'Giulia', cane: 'Rex' }).html).not.toContain('<a ')
    expect(emailMessaggio('it', 'attesa', { cliente: 'Giulia', cane: 'Rex', url }).html).toContain('>Prenota il posto<')
    expect(emailMessaggio('it', 'attesa', { cliente: 'Giulia', cane: 'Rex' }).html).not.toContain('<a ')
  })

  it('la proposta dice l’orario nuovo, quello chiesto e il tempo, con Confermo e Non posso', () => {
    const proposta = emailMessaggio('it', 'proposta', {
      cliente: 'Giulia',
      cane: 'Rex',
      salone: 'Canespa',
      url: 'https://groomlyapp.it/r?azione=conferma',
      urlRifiuta: 'https://groomlyapp.it/r?azione=rifiuta',
      quando: 'giovedì 29 ottobre, 10:00–11:00',
      invece: 'mercoledì 28 ottobre alle 17:00',
      entro: 'le 22:15',
    })
    expect(proposta.oggetto).toBe('Un nuovo orario per Rex')
    expect(proposta.html).toContain('Ciao Giulia, grazie per la richiesta. L’orario che avevi chiesto (mercoledì 28 ottobre alle 17:00) purtroppo non è disponibile, ma Canespa può accogliere Rex giovedì 29 ottobre, 10:00–11:00. Ti chiediamo di rispondere entro le 22:15: dopo, il posto verrà liberato.')
    expect(proposta.html).toContain('>Confermo<')
    expect(proposta.html).toContain('>Non posso<')
    expect(proposta.html).not.toContain('>Rifiuta<')
    expect(proposta.html).toContain('le 22:15')
    expect(proposta.html).not.toContain('>Togli<')
    expect(proposta.html).toContain('giovedì 29 ottobre, 10:00–11:00')
    expect(proposta.html).toContain('mercoledì 28 ottobre alle 17:00')
    const senzaInvece = emailMessaggio('it', 'proposta', { quando: 'giovedì 29 ottobre, 10:00–11:00', entro: 'le 22:15' })
    expect(senzaInvece.html).toContain('L’orario che avevi chiesto purtroppo non è disponibile, ma il salone può accogliere giovedì 29 ottobre, 10:00–11:00. Ti chiediamo di rispondere entro le 22:15: dopo, il posto verrà liberato.')
    expect(senzaInvece.html).not.toContain('()')
    expect(senzaInvece.html).not.toContain(', ,')
    const senzaQuando = emailMessaggio('it', 'proposta', { invece: 'mercoledì 28 ottobre alle 17:00', entro: 'le 22:15' })
    expect(senzaQuando.html).toContain('L’orario che avevi chiesto (mercoledì 28 ottobre alle 17:00) purtroppo non è disponibile. Ti chiediamo di rispondere entro le 22:15: dopo, il posto verrà liberato.')
    expect(senzaQuando.html).not.toContain('può accogliere')
    const senzaEntro = emailMessaggio('it', 'proposta', { invece: 'mercoledì 28 ottobre alle 17:00', quando: 'giovedì 29 ottobre, 10:00–11:00' })
    expect(senzaEntro.html).toContain('ma il salone può accogliere giovedì 29 ottobre, 10:00–11:00.')
    expect(senzaEntro.html).not.toContain('Ti chiediamo di rispondere')
    expect(emailMessaggio('en', 'proposta').oggetto).toBe('A new time')
    expect(emailMessaggio('en', 'proposta', { invece: 'Wednesday', quando: 'Thursday', entro: '18:00' }).html).toContain("Unfortunately the time you asked for (Wednesday) isn't available, but the salon can see Thursday. Please reply by 18:00: after that, the slot will be released.")
    expect(emailMessaggio('es', 'proposta').oggetto).toBe('Un nuevo horario')
    expect(emailMessaggio('es', 'proposta', { invece: 'miércoles', quando: 'jueves', entro: 'las 18:00' }).html).toContain('Lamentablemente el horario que pediste (miércoles) no está disponible, pero la peluquería puede atender jueves. Te pedimos que respondas antes de las 18:00: después, el hueco quedará libre.')
    expect(proposta.html).toContain('#9E2F2A')
    expect(proposta.html).toContain('https://groomlyapp.it/r?azione=conferma')
    expect(proposta.html).toContain('https://groomlyapp.it/r?azione=rifiuta')
    const conferma = proposta.html.indexOf('>Confermo<')
    const rifiuta = proposta.html.indexOf('>Non posso<')
    expect(conferma).toBeGreaterThan(-1)
    expect(rifiuta).toBeGreaterThan(conferma)
    const cella = proposta.html.slice(proposta.html.lastIndexOf('<td', conferma), rifiuta)
    expect(cella).toContain('azione=conferma')
  })

  it('la conferma saluta, non ha pulsante e non dice di arrivare puntuali', () => {
    const mail = emailMessaggio('it', 'conferma', PIENI)
    expect(mail.oggetto).toBe('Appuntamento confermato per Rex')
    expect(mail.html).toContain('Ciao Giulia, buone notizie: Canespa ha confermato l’appuntamento di Rex, martedì 4 novembre, 10:30–11:30.')
    expect(mail.html).not.toContain('puntuali')
    expect(mail.html).not.toContain('>Vedi')
    expect(mail.html).toContain('Hai una domanda?')
    expect(mail.html).toContain('Canespa · Rex')
  })

  it('senza rispondi-a non promette la risposta', () => {
    const mail = emailMessaggio('it', 'conferma', { ...PIENI, rispondi: false })
    expect(mail.html).not.toContain('Hai una domanda?')
    const recensione = emailMessaggio('it', 'recensione', { ...PIENI, rispondi: false, url: 'https://groomlyapp.it/s/x' })
    expect(recensione.html).not.toContain('rispondi a questa email')
    expect(recensione.html).toContain('Lascia una recensione')
  })

  it('il posto liberato ha la nota della pagina, non quella della risposta', () => {
    const mail = emailMessaggio('it', 'liberato', PIENI)
    expect(mail.html).toContain('Puoi inviare una nuova richiesta dalla pagina del salone.')
    expect(mail.html).not.toContain('Hai una domanda?')
  })

  it('senza nome del salone non scrive Groomly né «di il»', () => {
    const mail = emailMessaggio('it', 'promemoria', { cliente: 'Giulia', cane: 'Rex', quando: 'martedì 4 novembre alle 10:30', rispondi: false })
    expect(mail.html).toContain('il salone ti ricorda')
    expect(mail.html).not.toContain('Groomly ti ricorda')
    const disdetta = emailMessaggio('it', 'disdetta', { cliente: 'Giulia', cane: 'Rex', rispondi: false })
    expect(disdetta.html).toContain('dal salone')
    expect(disdetta.html).not.toContain('di il')
    expect(disdetta.html).not.toContain('<a ')
  })

  it('il promemoria mette il giorno nella frase e non ha pulsante', () => {
    const mail = emailMessaggio('it', 'promemoria', { ...PIENI, quando: 'martedì 4 novembre alle 10:30' })
    expect(mail.oggetto).toBe('Ci vediamo presto, Rex!')
    expect(mail.html).toContain('il prossimo appuntamento di Rex, martedì 4 novembre alle 10:30')
    expect(mail.html).not.toContain('nel promemoria')
    expect(mail.html).not.toContain('Non voglio più ricevere queste email')
  })

  it('senza cliente il saluto è Ciao, e senza cane l’oggetto resta intero', () => {
    const mail = emailMessaggio('it', 'pronto', { cliente: '', cane: '', salone: 'Canespa', rispondi: false })
    expect(mail.oggetto).toBe('È pronto')
    expect(mail.html).toContain('Ciao, abbiamo finito')
  })

  it('il rifiuto non ha pulsante, nemmeno con la pagina pubblica', () => {
    const url = 'https://groomlyapp.it/s/i-pelosetti'
    const rifiuto = emailMessaggio('it', 'rifiuto', { cliente: 'Giulia', cane: 'Rex', salone: 'Canespa', url, rispondi: true })
    expect(rifiuto.oggetto).toBe('Aggiornamento sulla tua richiesta')
    expect(rifiuto.html).toContain('Ciao Giulia, ci dispiace: questa volta Canespa non riesce ad accogliere la richiesta per Rex.')
    expect(rifiuto.html).not.toContain('<a ')
    expect(rifiuto.html).not.toContain('>Scegli un altro orario<')
    expect(emailMessaggio('en', 'rifiuto', { cliente: 'Giulia', cane: 'Rex', salone: 'Canespa', url }).html).toContain("Hi Giulia, we're sorry: this time Canespa isn't able to accept the request for Rex.")
    expect(emailMessaggio('es', 'rifiuto', { cliente: 'Giulia', cane: 'Rex', salone: 'Canespa', url }).html).toContain('Hola Giulia, lo sentimos: esta vez Canespa no puede aceptar la solicitud para Rex.')
    expect(emailMessaggio('en', 'liberato', PIENI).html).toContain("You can send a new request from the salon's page.")
    expect(emailMessaggio('es', 'liberato', PIENI).html).toContain('Puedes enviar una nueva solicitud desde la página de la peluquería.')
    expect(emailMessaggio('en', 'conferma', { ...PIENI, rispondi: true }).html).toContain('Any questions? Just reply to this email and it will go straight to the salon.')
    expect(emailMessaggio('es', 'conferma', { ...PIENI, rispondi: true }).html).toContain('¿Tienes alguna pregunta? Responde a este correo y llegará directamente a la peluquería.')
  })

  it('l’invito usa le etichette della lingua di chi invita', () => {
    expect(etichettaRuolo('en', 'socio')).toBe('Partner')
    expect(etichettaRuolo('en', 'collaboratore')).toBe('Team member')
    expect(etichettaRuolo('es', 'socio')).toBe('Socio')
    expect(etichettaRuolo('es', 'collaboratore')).toBe('Colaborador')
    const invito = emailMessaggio('en', 'invito', { ruolo: 'collaboratore' })
    expect(invito.html).toContain('Team member')
    expect(invito.html).toContain('>Accept the invite<')
  })

  it('la password dice l’indirizzo e che si può ignorare', () => {
    const mail = emailMessaggio('it', 'reset', { account: 'ada@salone.it', url: 'https://groomlyapp.it/azione/?mode=resetPassword' })
    expect(mail.oggetto).toBe('Reimposta la tua password')
    expect(mail.html).toContain('account ada@salone.it')
    expect(mail.html).toContain('Se non sei stato tu')
    expect(mail.html).toContain('Reimposta la password')
  })

  it('l’invito non ha la nota sul salone sconosciuto', () => {
    const mail = emailMessaggio('it', 'invito', { salone: 'Canespa', ruolo: 'collaboratore', url: 'https://groomlyapp.it/invito' })
    expect(mail.oggetto).toBe('Canespa ti invita su Groomly')
    expect(mail.html).toContain('come Collaboratore')
    expect(mail.html).not.toContain('Se non conosci')
  })

  it('senza salone l’invito ha l’oggetto di riserva', () => {
    const vuoto = emailMessaggio('it', 'invito', { ruolo: 'socio', url: 'https://groomlyapp.it/invito' })
    expect(vuoto.oggetto).toBe('Sei invitato su Groomly')
    expect(vuoto.html).toContain('il salone ti ha invitato')
    expect(vuoto.html).not.toContain('di il')
    expect(emailMessaggio('en', 'invito', { url: 'https://groomlyapp.it/invito' }).oggetto).toBe('You’re invited to Groomly')
    expect(emailMessaggio('en', 'invito', { url: 'https://groomlyapp.it/invito' }).html).toContain('the salon has invited you')
    expect(emailMessaggio('es', 'invito', { url: 'https://groomlyapp.it/invito' }).oggetto).toBe('Te invitan a Groomly')
    expect(emailMessaggio('es', 'invito', { url: 'https://groomlyapp.it/invito' }).html).toContain('la peluquería te ha invitado')
  })

  it('verifica, reset e invito usano le frasi della specifica', () => {
    const url = 'https://groomlyapp.it/azione'
    expect(emailMessaggio('it', 'verifica', { url }).oggetto).toBe('Benvenuto su Groomly, conferma la tua email')
    expect(emailMessaggio('it', 'verifica', { url }).html).toContain('Ciao e benvenuto! Manca solo un passaggio: tocca il pulsante per confermare il tuo indirizzo, poi torna all’app e inizia a lavorare.')
    expect(emailMessaggio('it', 'verifica', { url }).html).not.toContain('Se non hai creato')
    expect(emailMessaggio('en', 'verifica', { url }).oggetto).toBe('Welcome to Groomly, please confirm your email')
    expect(emailMessaggio('en', 'verifica', { url }).html).toContain('Hi and welcome! Just one more step: tap the button to confirm your address, then go back to the app and get started.')
    expect(emailMessaggio('en', 'verifica', { url }).html).not.toContain('If you did not create')
    expect(emailMessaggio('es', 'verifica', { url }).oggetto).toBe('Bienvenido a Groomly, confirma tu correo')
    expect(emailMessaggio('es', 'verifica', { url }).html).toContain('¡Hola y bienvenido! Solo falta un paso: toca el botón para confirmar tu dirección, luego vuelve a la app y empieza a trabajar.')
    expect(emailMessaggio('es', 'verifica', { url }).html).not.toContain('Si no has creado')

    expect(emailMessaggio('en', 'reset', { account: 'ada@salone.it', url }).html).toContain("Hi, we received a request to reset the password for the account ada@salone.it. Tap the button to choose a new one. If this wasn't you, you can safely ignore this email: your password will stay the same.")
    expect(emailMessaggio('es', 'reset', { account: 'ada@salone.it', url }).html).toContain('Hola, hemos recibido una solicitud para restablecer la contraseña de la cuenta ada@salone.it. Toca el botón para elegir una nueva. Si no has sido tú, puedes ignorar este correo: tu contraseña seguirá siendo la misma.')
    expect(emailMessaggio('it', 'reset', { account: 'ada@salone.it', url }).html).toContain('Ciao, abbiamo ricevuto una richiesta per reimpostare la password dell’account ada@salone.it. Tocca il pulsante per sceglierne una nuova. Se non sei stato tu, ignora pure questa email: la password resta quella di prima.')

    expect(emailMessaggio('en', 'invito', { salone: 'Canespa', ruolo: 'collaboratore', url }).oggetto).toBe('Canespa has invited you to Groomly')
    expect(emailMessaggio('en', 'invito', { salone: 'Canespa', ruolo: 'collaboratore', url }).html).toContain('Hi! Canespa has invited you to join the team as Team member. Tap the button and sign in with this same email address. Enjoy working together!')
    expect(emailMessaggio('en', 'invito', { salone: 'Canespa', ruolo: 'collaboratore', url }).html).not.toContain('If you do not know')
    expect(emailMessaggio('es', 'invito', { salone: 'Canespa', ruolo: 'collaboratore', url }).oggetto).toBe('Canespa te invita a Groomly')
    expect(emailMessaggio('es', 'invito', { salone: 'Canespa', ruolo: 'collaboratore', url }).html).toContain('¡Hola! Canespa te ha invitado a unirte al equipo como Colaborador. Toca el botón y entra con esta misma dirección de correo. ¡Buen trabajo!')
    expect(emailMessaggio('es', 'invito', { salone: 'Canespa', ruolo: 'collaboratore', url }).html).not.toContain('Si no conoces')
  })

  it('i cinque servizi hanno oggetto, corpo e il silenzio, e il pulsante solo se c’è un indirizzo', () => {
    const silenzio = 'https://groomlyapp.it/azione?mode=silenzio&salon=salone-1&token=aaaaaaaaaaaaaaaa'
    for (const tipo of SERVIZI) {
      for (const lingua of LINGUE) {
        const messaggio = emailMessaggio(lingua, tipo, {
          cliente: 'Giulia',
          cane: 'Rex',
          salone: 'Pelo',
          url: tipo === 'recensione' || tipo === 'attesa' ? (tipo === 'attesa' ? POSTO : 'https://groomlyapp.it/azione') : undefined,
          silenzio,
        })
        expect(messaggio.oggetto.length).toBeGreaterThan(0)
        expect(messaggio.html).toContain('<a ')
        expect(messaggio.html).toContain(SILENZIO[lingua])
        expect(messaggio.html).toContain('mode=silenzio')
        expect(messaggio.html.indexOf(SILENZIO[lingua])).toBeGreaterThan(messaggio.html.indexOf('<h1'))
        if (tipo === 'attesa') expect(messaggio.html.replaceAll('&amp;', '&')).toContain(POSTO)
        if (tipo === 'recensione') expect(messaggio.html).toContain(RECENSIONE[lingua])
        if (tipo === 'promemoria' || tipo === 'pronto' || tipo === 'auguri') expect(messaggio.html.match(/<a /g)).toHaveLength(1)
      }
    }
    expect(emailMessaggio('it', 'verifica').html).not.toContain('Non voglio più ricevere queste email')
  })

  it('la ricevuta dice che la richiesta è arrivata e riporta i dati della prenotazione', () => {
    const scheda = riepilogoRicevuta('it', {
      nome: 'Mario Rossi',
      cane: 'Birba',
      razza: 'Meticcio',
      specie: 'cane',
      taglia: 'media',
      servizi: ['Bagno', 'Nodi'],
      inizio: new Date('2026-10-28T15:00:00.000Z'),
      fine: new Date('2026-10-28T16:00:00.000Z'),
      durataMin: 60,
      totale: 35,
      telefono: '3331234567',
    })
    const mail = emailMessaggio('it', 'ricevuta', { cliente: 'Mario Rossi', cane: 'Birba', salone: 'I Pelosetti', scheda, rispondi: true })
    expect(mail.oggetto).toBe('Abbiamo ricevuto la tua richiesta')
    expect(mail.html).toContain('Ciao Mario Rossi, grazie per aver scelto I Pelosetti. La richiesta per Birba è arrivata: ti scriviamo appena il salone risponde.')
    expect(mail.html).toContain('Hai una domanda? Rispondi a questa email, arriva direttamente al salone.')
    expect(mail.html).toContain('Birba · cane · taglia media · Meticcio')
    expect(mail.html).toContain('Bagno, Nodi')
    expect(mail.html).toContain('Durata 60 min · Prezzo indicativo € 35')
    expect(mail.html).toContain('I prezzi sono indicativi.')
    expect(mail.html).toContain('Telefono del salone: 3331234567')
    expect(mail.html).not.toContain('cartella spam')
    expect(mail.html).not.toContain('<a ')
  })

  it('il promemoria senza giorno non lascia la virgola, e la disdetta senza rispondi non invita a rispondere', () => {
    const mail = emailMessaggio('it', 'promemoria', { cliente: 'Giulia', cane: 'Rex', salone: 'Canespa', rispondi: false })
    expect(mail.html).toContain('il prossimo appuntamento di Rex.')
    expect(mail.html).not.toContain('Rex, .')
    expect(mail.html).not.toContain('Hai una domanda?')
    const en = emailMessaggio('en', 'promemoria', { cliente: 'Giulia', cane: 'Rex', salone: 'Canespa' })
    expect(en.html).toContain("Rex's next appointment.")
    expect(en.html).not.toContain(' on .')
    const disdetta = emailMessaggio('it', 'disdetta', { cliente: 'Giulia', cane: 'Rex', salone: 'Canespa', rispondi: false })
    expect(disdetta.html).toContain('invia una nuova richiesta.')
    expect(disdetta.html).not.toContain('rispondi a questa email')
  })
})
