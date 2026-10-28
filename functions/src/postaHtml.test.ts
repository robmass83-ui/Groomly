import { describe, expect, it } from 'vitest'
import { replyToDa } from './postaHtml'

describe('replyToDa', () => {
  it('con email e nome validi restituisce entrambi, email senza spazi', () => {
    expect(replyToDa('  sala@salone.it  ', '  Bauci  ')).toEqual({ email: 'sala@salone.it', name: 'Bauci' })
  })

  it('con email valida e nome vuoto usa Groomly', () => {
    expect(replyToDa('sala@salone.it', '')).toEqual({ email: 'sala@salone.it', name: 'Groomly' })
    expect(replyToDa('sala@salone.it', '   ')).toEqual({ email: 'sala@salone.it', name: 'Groomly' })
  })

  it('email non valida, stringa vuota o non stringa non danno un reply-to', () => {
    expect(replyToDa('non-una-mail', 'Bauci')).toBeUndefined()
    expect(replyToDa('', 'Bauci')).toBeUndefined()
    expect(replyToDa('   ', 'Bauci')).toBeUndefined()
    expect(replyToDa(null, 'Bauci')).toBeUndefined()
    expect(replyToDa(undefined, 'Bauci')).toBeUndefined()
    expect(replyToDa(12, 'Bauci')).toBeUndefined()
  })
})
