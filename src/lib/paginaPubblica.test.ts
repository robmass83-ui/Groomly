import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { htmlPaginaAssente, htmlPaginaPubblica, testoOrari } from './paginaPubblica'

const base = { lang: 'it' as const, nome: 'I Pelosetti', indirizzo: 'Via Roma 1', telefono: '3331234567', prenotabile: true, salonId: 'abc' }
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('htmlPaginaPubblica', () => {
  it('con placeId il link alla mappa punta al luogo verificato', () => {
    const html = htmlPaginaPubblica({ ...base, placeId: 'abc' })
    expect(html).toContain('query_place_id=abc')
    expect(html).toContain('query=Via%20Roma%201')
  })

  it('senza placeId il link alla mappa resta quello di sempre', () => {
    const html = htmlPaginaPubblica(base)
    expect(html).toContain('https://maps.google.com/?q=Via%20Roma%201')
    expect(html).not.toContain('query_place_id')
  })

  it('mette il nome nel title e in og:title, senza partita IVA', () => {
    const html = htmlPaginaPubblica({ ...base, vat: '01234567890' })
    expect(html).toContain('<title>I Pelosetti</title>')
    expect(html).toContain('property="og:title" content="I Pelosetti"')
    expect(html).not.toContain('01234567890')
    expect(html).toContain('"prenotabile":true')
    expect(html).toContain('"specie":["cane","gatto","altro"]')
    expect(htmlPaginaPubblica({ ...base, specie: ['cane'] })).toContain('"specie":["cane"]')
    expect(html).toContain('/s/pagina.js')
    expect(html).toContain('/groomly-logo-orizzontale.svg')
    expect(html).toContain('href="?lang=it"')
    expect(html).toContain('href="tel:3331234567"')
    expect(html).toContain('class="marchio monogramma"')
  })

  it('mostra il logo del salone solo se è un’immagine, e riassume gli orari', () => {
    const html = htmlPaginaPubblica({ ...base, logo: png, logoForma: 'tondo', descrizione: 'Dal 1998', orari: 'Lun–Ven 09:00–13:00' })
    expect(html).toContain(`src="${png}"`)
    expect(html).toContain('marchio-tondo')
    expect(html).toContain('Dal 1998')
    expect(html).toContain('Lun–Ven 09:00–13:00')
    const sporco = htmlPaginaPubblica({ ...base, logo: 'javascript:alert(1)' })
    expect(sporco).not.toContain('javascript:')
    expect(testoOrari({
      1: [{ da: '09:00', a: '13:00' }],
      2: [{ da: '09:00', a: '13:00' }],
      3: [{ da: '09:00', a: '13:00' }],
      4: [{ da: '09:00', a: '13:00' }],
      5: [{ da: '09:00', a: '13:00' }],
      6: [{ da: '09:00', a: '12:00' }],
    }, 'it')).toBe('Lun–Ven 09:00–13:00 · Sab 09:00–12:00')
    expect(testoOrari(undefined, 'it')).toBe('')
  })

  it('l’email del salone è nella pagina solo con le prenotazioni spente', () => {
    expect(htmlPaginaPubblica({ ...base, prenotabile: false, email: 'info@pelosetti.it' })).toContain('"email":"info@pelosetti.it"')
    expect(htmlPaginaPubblica({ ...base, prenotabile: true, email: 'info@pelosetti.it' })).not.toContain('info@pelosetti.it')
  })

  it('con prenotabile false il JSON non invita a prenotare', () => {
    const html = htmlPaginaPubblica({ ...base, prenotabile: false })
    expect(html).toContain('"prenotabile":false')
  })

  it('il profilo dice se la lista d’attesa è accesa, e senza il campo resta spenta', () => {
    expect(htmlPaginaPubblica(base)).toContain('"attesa":false')
    expect(htmlPaginaPubblica({ ...base, attesa: false })).toContain('"attesa":false')
    expect(htmlPaginaPubblica({ ...base, attesa: true })).toContain('"attesa":true')
  })

  it('dopo l’invio non dà la richiesta per già accettata', () => {
    const js = readFileSync('hosting/s/pagina.js', 'utf8')
    expect(js).toContain('Grazie, richiesta inviata a {{nome}}. Non è ancora una prenotazione: la risposta arriverà a {{email}} (dai un’occhiata anche allo spam). Se il salone conferma il giorno e l’ora che hai chiesto, quella email vale come conferma. Se propone un altro orario, troverai i pulsanti per accettare o rifiutare e il tempo per rispondere: senza risposta, il posto verrà liberato.')
    expect(js).toContain("Thank you, your request has been sent to {{nome}}. This isn't a booking yet: the reply will arrive at {{email}} (please check your spam folder too). If the salon confirms the day and time you asked for, that email is your confirmation. If they suggest a different time, you'll find buttons to accept or decline and the deadline to reply: without a reply, the slot will be released.")
    expect(js).toContain('Gracias, tu solicitud se ha enviado a {{nome}}. Todavía no es una reserva: la respuesta llegará a {{email}} (revisa también la carpeta de spam). Si la peluquería confirma el día y la hora que pediste, ese correo es la confirmación. Si propone otro horario, encontrarás los botones para aceptar o rechazar y el plazo para responder: si no respondes, el hueco quedará libre.')
    expect(js).toContain('Questa è una richiesta, non ancora una prenotazione: il salone la valuterà e ti risponderà via email.')
    expect(js).toContain('This is a request, not a booking yet: the salon will review it and reply by email.')
    expect(js).toContain('Esto es una solicitud, todavía no una reserva: la peluquería la revisará y te responderá por correo.')
    expect(js).not.toContain("el('p', 'ok'")
    const inviata = readFileSync('hosting/salone/inviata.html', 'utf8')
    expect(inviata).toContain('inviata al salone')
    expect(inviata).toContain('sent to the salon')
    expect(inviata).toContain('enviado a la peluquería')
    expect(inviata).not.toContain('Il salone la conferma')
    expect(inviata).not.toContain('{{')
    const html = htmlPaginaPubblica(base)
    expect(html).toContain('.esito{color:var(--ink)}')
    expect(html).not.toContain('.ok{color:var(--ok)')
  })

  it('sfugge il nome', () => {
    const html = htmlPaginaPubblica({ ...base, nome: 'A & B <script>' })
    expect(html).toContain('<title>A &amp; B &lt;script&gt;</title>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('A &amp; B')
  })

  it('stampa il catalogo e il prezzo indicativo nella lingua della pagina', () => {
    const html = htmlPaginaPubblica({
      ...base,
      catalogo: [{
        id: 'bagno',
        nome: 'Bagno',
        kind: 'principale',
        minuti: { piccola: 30, media: 45, grande: 60 },
        prezzo: { piccola: 20, media: 28, grande: 38 },
      }],
    })
    expect(html).toContain('id="catalogo"')
    expect(html).toContain('Bagno')
    expect(html).toContain('I prezzi sono indicativi.')
    expect(htmlPaginaPubblica({ ...base, lang: 'en' })).toContain('Prices are a guide. They can change after we see the animal, if there are mats or problems that need more time.')
    expect(htmlPaginaPubblica({ ...base, lang: 'es' })).toContain('Los precios son orientativos. Pueden cambiar después de ver al animal, si hay nudos o problemas que pidan más tiempo.')
  })
})

describe('htmlPaginaAssente', () => {
  it('dice che l’indirizzo non porta a un salone, senza riquadro prenotazioni né script', () => {
    const html = htmlPaginaAssente('it')
    expect(html).toContain('Indirizzo non trovato')
    expect(html).toContain('chiedi al salone il link giusto')
    expect(html).not.toContain('Questa pagina non c’è')
    expect(html).not.toContain('id="prenota"')
    expect(html).not.toContain('/s/pagina.js')
    expect(html).toContain('noindex')
  })

  it('segue la lingua scelta', () => {
    expect(htmlPaginaAssente('en')).toContain('Address not found')
    expect(htmlPaginaAssente('es')).toContain('Dirección no encontrada')
  })
})
