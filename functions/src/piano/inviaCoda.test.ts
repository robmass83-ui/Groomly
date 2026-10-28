import { describe, expect, it, vi } from 'vitest'
import { inviaCoda, righeDelGiro, righeDelMinuto } from './inviaCoda'

const base = {
  id: '1',
  tipo: 'promemoria' as const,
  dogId: 'd',
  appointmentId: 'a',
  evento: 'e1',
  parteIl: '2020-01-01T00:00:00.000Z',
  stato: 'in_coda' as const,
  motivo: '',
  email: 'ada@cliente.it',
  nomeCane: 'Rex',
}

describe('inviaCoda', () => {
  it('senza chiave non spedisce e segna non_inviata solo se la posta manca, non se manca l’email', async () => {
    const esito = await inviaCoda({
      apiKey: '',
      righe: [{ ...base, email: '' , motivo: 'manca_email' }, { ...base, id: '2', evento: 'e2' }],
      emailOggi: 0,
    })
    expect(esito.inviate).toBe(0)
    expect(esito.riprova).toEqual(['2'])
    expect(esito.attese).toEqual(['1'])
  })

  it('con la chiave il posto libero apre la prenotazione e in fondo c’è il silenzio', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      salonId: 'salone-1',
      replyTo: { email: 'sala@salone.it', name: 'I Pelosetti' },
      righe: [{
        ...base,
        tipo: 'attesa',
        url: 'https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00',
      }],
      emailOggi: 0,
      fetchImpl,
    })
    expect(esito.inviate).toBe(1)
    expect(esito.token[0]?.token).toMatch(/^[A-Za-z0-9_-]{16,128}$/)
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string; replyTo?: { email: string } }
    const html = body.htmlContent.replaceAll('&amp;', '&')
    expect(html).toContain('https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00')
    expect(html).toContain('Non voglio più ricevere queste email')
    expect(html).toContain('/azione?mode=silenzio')
    expect(html).toContain('salon=salone-1')
    expect(html).toContain(esito.token[0].token)
    expect(body.replyTo?.email).toBe('sala@salone.it')
  })

  it('senza replyTo la posta parte senza rispondi-a', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      salonId: 'salone-1',
      righe: [base],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { replyTo?: unknown; htmlContent: string }
    expect(body.replyTo).toBeUndefined()
    expect(body.htmlContent).toContain('Non voglio più ricevere queste email')
  })

  it('a 300 email oggi non chiama la rete', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      righe: [base],
      emailOggi: 300,
      fetchImpl,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(esito.inviate).toBe(0)
    expect(esito.riprova).toEqual([])
    expect(esito.attese).toEqual([])
  })

  it('pagina assente resta in attesa e la rete non parte', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      righe: [{ ...base, motivo: 'pagina_assente' }],
      emailOggi: 0,
      fetchImpl,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(esito.attese).toEqual(['1'])
    expect(esito.inviate).toBe(0)
  })

  it('una riga manuale non parte in questo giro', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      righe: [{ ...base, parteIl: null }],
      emailOggi: 0,
      fetchImpl,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(esito.inviate).toBe(0)
    expect(esito.riprova).toEqual([])
  })

  it('subito spedisce la riga scelta anche se parteIl è vuoto', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaCoda({
      apiKey: 'x',
      subito: true,
      salonId: 'salone-1',
      righe: [{ ...base, parteIl: null }],
      emailOggi: 0,
      fetchImpl,
    })
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(esito.inviate).toBe(1)
  })

  it('il promemoria saluta chi accompagna il cane e mette il giorno', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const inizio = '2026-11-04T09:00:00.000Z'
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      replyTo: { email: 'sala@salone.it', name: 'Canespa' },
      righe: [{ ...base, nomeCliente: 'Giulia', nomeCane: 'Rex', inizio }],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string; replyTo?: { email: string } }
    expect(body.htmlContent).toContain('Ciao Giulia')
    expect(body.htmlContent).toContain('Rex, Mercoledì 4 novembre alle 10:00')
    expect(body.replyTo?.email).toBe('sala@salone.it')
  })

  it('una data illeggibile non ferma il promemoria successivo', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      righe: [
        { ...base, inizio: 'non-e-una-data' },
        { ...base, id: '2', evento: 'e2', inizio: '2026-11-04T09:00:00.000Z' },
      ],
      emailOggi: 0,
      fetchImpl,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const prima = JSON.parse(String((fetchImpl.mock.calls[0][1] as RequestInit).body)) as { htmlContent: string }
    expect(prima.htmlContent).not.toContain('alle ')
  })

  it('una riga vecchia senza nome e senza inizio parte lo stesso', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      replyTo: { email: 'sala@salone.it', name: 'Canespa' },
      righe: [base],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string }
    expect(body.htmlContent).toContain('Ciao,')
    expect(body.htmlContent).not.toContain('nel promemoria')
  })

  it('senza replyTo non invita a rispondere e usa il nome del profilo', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      salone: 'Canespa',
      righe: [{ ...base, nomeCliente: 'Giulia', nomeCane: 'Rex' }],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string; replyTo?: unknown }
    expect(body.replyTo).toBeUndefined()
    expect(body.htmlContent).not.toContain('rispondi a questa email')
    expect(body.htmlContent).toContain('Canespa ti ricorda')
  })

  it('se il rispondi-a si chiama Groomly usa il nome del profilo', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await inviaCoda({
      apiKey: 'x',
      lingua: 'it',
      salone: 'Canespa',
      replyTo: { email: 'sala@salone.it', name: 'Groomly' },
      righe: [{ ...base, nomeCliente: 'Giulia', nomeCane: 'Rex' }],
      emailOggi: 0,
      fetchImpl,
    })
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string; replyTo?: { email: string } }
    expect(body.htmlContent).toContain('Canespa ti ricorda')
    expect(body.htmlContent).not.toContain('Groomly ti ricorda')
    expect(body.replyTo?.email).toBe('sala@salone.it')
  })

  it('il minuto copia il nome del cliente dal cane e l’inizio della visita', () => {
    const start = new Date('2026-11-04T09:00:00.000Z')
    const nate = righeDelMinuto({
      adesso: new Date('2026-10-28T09:00:00.000Z'),
      servizi: { promemoria: { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' } },
      esistenti: [],
      visite: [{ id: 'a', dogId: 'd', start, status: 'programmato', nomeCane: 'Rex', email: 'a@b.it' }],
      cani: [{ id: 'd', nome: 'Rex', nomeCliente: 'Giulia', email: 'a@b.it', attivo: true }],
      attesa: [],
      slug: '',
      linkRecensioni: '',
      proposte: [],
    })
    const riga = nate.righe.find((item) => item.tipo === 'promemoria')
    expect(riga?.nomeCliente).toBe('Giulia')
    expect(riga?.inizio).toBe(start.toISOString())
  })

  it('un servizio spento non entra nel giro e una non inviata si ripropone', () => {
    const pronte = righeDelGiro(
      [base, { ...base, id: 'p', tipo: 'pronto', evento: 'p' }, { ...base, id: 'n', evento: 'n', stato: 'non_inviata' }],
      ['promemoria'],
    )
    expect(pronte.map((riga) => riga.id)).toEqual(['1', 'n'])
    expect(pronte[1]?.stato).toBe('in_coda')
  })

  it('crea il promemoria automatico, salta il pronto spento e il posto libero porta al giorno', () => {
    const nate = righeDelMinuto({
      adesso: new Date('2026-10-28T09:00:00.000Z'),
      servizi: {
        promemoria: { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' },
        pronto: { modo: 'spento' },
        attesa: { modo: 'automatico' },
      },
      esistenti: [{ ...base, id: 'vecchia', tipo: 'pronto', evento: 'pronto:x', parteIl: '2020-01-01T00:00:00.000Z' }],
      visite: [
        { id: 'a', dogId: 'd', start: new Date('2026-10-29T09:00:00.000Z'), status: 'programmato', nomeCane: 'Fido', email: 'a@b.it' },
        { id: 'buco', dogId: 'x', start: new Date('2026-10-28T09:00:00.000Z'), status: 'disdetto', nomeCane: 'X', email: '', minuti: 60 },
      ],
      cani: [{ id: 'd', nome: 'Fido', email: 'a@b.it', attivo: true }],
      attesa: [{ id: 'w', dogId: 'd', durataMin: 30, preferenza: 'qualsiasi', arrivato: '2026-10-01T00:00:00.000Z' }],
      slug: 'i-pelosetti',
      linkRecensioni: '',
      proposte: [],
    })
    expect(nate.accesi).toEqual(['promemoria', 'attesa'])
    expect(nate.daSpedire.some((riga) => riga.tipo === 'pronto')).toBe(false)
    expect(nate.righe.some((riga) => riga.tipo === 'promemoria' && riga.stato === 'in_coda')).toBe(true)
    const posto = nate.righe.find((riga) => riga.tipo === 'attesa')
    expect(posto?.url).toBe('https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00')
  })
})
