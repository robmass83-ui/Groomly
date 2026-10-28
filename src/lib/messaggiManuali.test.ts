import { describe, expect, it } from 'vitest'
import { firmaMessaggio, linkMessaggio, testoMessaggio } from './messaggiManuali'

const GIULIA = 'Giulia'
const REX = 'Rex'
const BAGNO = 'bagno'
const QUANDO_IT = 'martedì 4 novembre alle 10:30'
const QUANDO_EN = 'Tuesday 4 November at 10:30'
const QUANDO_ES = 'martes 4 de noviembre a las 10:30'

const valoriPieni = (quando: string) => ({
  nome: GIULIA,
  cane: REX,
  servizio: BAGNO,
  quando,
})

describe('messaggi manuali', () => {
  it('normalizza il cellulare e firma nella lingua dei clienti', () => {
    const testo = testoMessaggio('en', 'promemoria', { nome: 'Giulia', cane: 'Luna', servizio: 'Bath', quando: 'Tuesday' })
    expect(linkMessaggio('333 1234567', 'Ciao Luna')).toBe('https://wa.me/393331234567?text=Ciao%20Luna')
    expect(linkMessaggio('021234567', 'Ciao')).toBeNull()
    expect(testo).not.toContain('Made with Groomly')
    expect(testo).not.toContain('Fatto con')
    expect(firmaMessaggio('it')).toBe('Fatto con Groomly')
    expect(firmaMessaggio('es')).toBe('Hecho con Groomly')
  })

  it('il promemoria italiano saluta e non firma', () => {
    const testo = testoMessaggio('it', 'promemoria', {
      nome: 'Giulia', cane: 'Rex', servizio: 'bagno', quando: 'martedì 4 novembre alle 10:30',
    })
    expect(testo).toBe('Ciao Giulia, ti ricordiamo l’appuntamento di Rex per bagno, martedì 4 novembre alle 10:30. Se hai un imprevisto, avvisaci qui. Ti aspettiamo, a presto!')
    expect(testo).not.toContain('Fatto con Groomly')
  })

  it('senza nome, servizio o orario la frase resta intera', () => {
    expect(testoMessaggio('it', 'promemoria', { nome: '', cane: 'Rex', servizio: '', quando: '' }))
      .toBe('Ciao, ti ricordiamo l’appuntamento di Rex. Se hai un imprevisto, avvisaci qui. Ti aspettiamo, a presto!')
    expect(testoMessaggio('en', 'conferma', { nome: '', cane: 'Rex', servizio: '', quando: '' }))
      .toBe('Hi, could you confirm Rex\'s appointment? Just reply here. Thank you!')
    expect(testoMessaggio('es', 'richiamo', { nome: 'Ana', cane: 'Rex', servizio: '', quando: 'martes 4 de noviembre a las 10:30' }))
      .toBe('Hola Ana, ya ha pasado un tiempo: es un buen momento para volver a traer a Rex, martes 4 de noviembre a las 10:30. Escríbenos por aquí para reservar. ¡Hasta pronto!')
  })

  it('conferma italiano con tutti i campi', () => {
    expect(testoMessaggio('it', 'conferma', valoriPieni(QUANDO_IT))).toBe(
      'Ciao Giulia, ci confermi l’appuntamento di Rex (bagno) martedì 4 novembre alle 10:30? Basta una risposta qui. Grazie!',
    )
  })

  it('pronto italiano con tutti i campi', () => {
    expect(testoMessaggio('it', 'pronto', valoriPieni(QUANDO_IT))).toBe(
      'Ciao Giulia, Rex è pronto e ti aspetta. Puoi passare a prenderlo, a tra poco!',
    )
  })

  it('richiamo italiano con tutti i campi', () => {
    expect(testoMessaggio('it', 'richiamo', valoriPieni(QUANDO_IT))).toBe(
      'Ciao Giulia, è passato un po’ di tempo: è il momento giusto per riportare Rex per bagno, martedì 4 novembre alle 10:30. Scrivici qui per fissare. A presto!',
    )
  })

  it('auguri italiano con tutti i campi', () => {
    expect(testoMessaggio('it', 'auguri', valoriPieni(QUANDO_IT))).toBe(
      'Ciao Giulia, tanti auguri a Rex da tutti noi! Speriamo di vedervi presto.',
    )
  })

  it('conferma inglese con tutti i campi', () => {
    expect(testoMessaggio('en', 'conferma', valoriPieni(QUANDO_EN))).toBe(
      'Hi Giulia, could you confirm Rex\'s appointment (bagno) Tuesday 4 November at 10:30? Just reply here. Thank you!',
    )
  })

  it('pronto inglese con tutti i campi', () => {
    expect(testoMessaggio('en', 'pronto', valoriPieni(QUANDO_EN))).toBe(
      'Hi Giulia, Rex is all done and waiting for you. You can come and pick them up, see you soon!',
    )
  })

  it('richiamo inglese con tutti i campi', () => {
    expect(testoMessaggio('en', 'richiamo', valoriPieni(QUANDO_EN))).toBe(
      'Hi Giulia, it\'s been a little while: it\'s a good time to bring Rex back for bagno, Tuesday 4 November at 10:30. Message us here to book. See you soon!',
    )
  })

  it('auguri inglese con tutti i campi', () => {
    expect(testoMessaggio('en', 'auguri', valoriPieni(QUANDO_EN))).toBe(
      'Hi Giulia, happy birthday to Rex from all of us! We hope to see you both soon.',
    )
  })

  it('conferma spagnolo con tutti i campi', () => {
    expect(testoMessaggio('es', 'conferma', valoriPieni(QUANDO_ES))).toBe(
      'Hola Giulia, ¿nos confirmas la cita de Rex (bagno) martes 4 de noviembre a las 10:30? Basta con responder aquí. ¡Gracias!',
    )
  })

  it('pronto spagnolo con tutti i campi', () => {
    expect(testoMessaggio('es', 'pronto', valoriPieni(QUANDO_ES))).toBe(
      'Hola Giulia, hemos terminado con Rex y ya te está esperando. Puedes pasar a recogerlo, ¡hasta ahora!',
    )
  })

  it('richiamo spagnolo con tutti i campi', () => {
    expect(testoMessaggio('es', 'richiamo', valoriPieni(QUANDO_ES))).toBe(
      'Hola Giulia, ya ha pasado un tiempo: es un buen momento para volver a traer a Rex para bagno, martes 4 de noviembre a las 10:30. Escríbenos por aquí para reservar. ¡Hasta pronto!',
    )
  })

  it('auguri spagnolo con tutti i campi', () => {
    expect(testoMessaggio('es', 'auguri', valoriPieni(QUANDO_ES))).toBe(
      'Hola Giulia, ¡feliz cumpleaños a Rex de parte de todos nosotros! Esperamos veros pronto.',
    )
  })

  it('promemoria inglese con tutti i campi', () => {
    expect(testoMessaggio('en', 'promemoria', valoriPieni(QUANDO_EN))).toBe(
      'Hi Giulia, just a reminder of Rex\'s appointment for bagno, Tuesday 4 November at 10:30. If anything comes up, let us know here. Looking forward to seeing you!',
    )
  })

  it('promemoria spagnolo con tutti i campi', () => {
    expect(testoMessaggio('es', 'promemoria', valoriPieni(QUANDO_ES))).toBe(
      'Hola Giulia, te recordamos la cita de Rex para bagno, martes 4 de noviembre a las 10:30. Si te surge algún imprevisto, avísanos por aquí. ¡Te esperamos, hasta pronto!',
    )
  })
})
