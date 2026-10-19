import { describe, expect, it, vi } from 'vitest'
import { BrevoRequestError, brevoTemplateBody, postBrevoTemplate } from './brevoMail'

describe('modello Brevo', () => {
  it('invia templateId, destinatario e parametri, senza html proprio', () => {
    const body = brevoTemplateBody(4, 'ada@salone.it', {
      link: 'https://groomlyapp.it/azione?mode=resetPassword&oobCode=abc&lang=it',
      email: 'ada@salone.it',
    })
    expect(body).toEqual({
      templateId: 4,
      to: [{ email: 'ada@salone.it' }],
      params: {
        link: 'https://groomlyapp.it/azione?mode=resetPassword&oobCode=abc&lang=it',
        email: 'ada@salone.it',
      },
    })
    expect(JSON.stringify(body)).not.toContain('firebaseapp.com')
    expect(JSON.stringify(body)).not.toContain('htmlContent')
  })

  it('mette la chiave solo nell’header api-key', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    await postBrevoTemplate('xkeysib-segreto', 3, 'ada@salone.it', { link: 'https://groomlyapp.it/azione?mode=verifyEmail&oobCode=abc&lang=it' }, fetchImpl)
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(new Headers(init.headers).get('api-key')).toBe('xkeysib-segreto')
    expect(String(init.body)).not.toContain('xkeysib-segreto')
    expect(String(init.body)).toContain('"templateId":3')
  })

  it('una risposta non 2xx diventa errore con lo status', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 400 }))
    await expect(postBrevoTemplate('k', 4, 'ada@salone.it', { link: 'https://groomlyapp.it/azione', email: 'ada@salone.it' }, fetchImpl))
      .rejects.toMatchObject({ name: 'BrevoRequestError', status: 400 })
  })

  it('la rete assente non ha status HTTP', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline')
    })
    await expect(postBrevoTemplate('k', 3, 'ada@salone.it', { link: 'https://groomlyapp.it/azione' }, fetchImpl))
      .rejects.toBeInstanceOf(BrevoRequestError)
  })
})
