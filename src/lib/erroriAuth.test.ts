import { describe, expect, it } from 'vitest'
import { AppError } from '../data/errors'
import { it as italiano } from '../i18n/it'
import { en } from '../i18n/en'
import { messaggioAuth } from './erroriAuth'

const firebase = (code: string) => ({ code: `auth/${code}`, message: `Firebase: Error (auth/${code}).` })

describe('messaggioAuth', () => {
  it('password sbagliata, con entrambi i codici di Firebase', () => {
    expect(messaggioAuth('it', firebase('wrong-password'))).toBe('Password sbagliata')
    expect(messaggioAuth('it', firebase('invalid-credential'))).toBe('Password sbagliata')
    expect(messaggioAuth('en', firebase('wrong-password'))).toBe(en.authPasswordSbagliata)
  })

  it('un testo per ogni codice noto', () => {
    expect(messaggioAuth('it', firebase('too-many-requests'))).toBe(italiano.authTroppiTentativi)
    expect(messaggioAuth('it', firebase('email-already-in-use'))).toBe(italiano.authEmailUsata)
    expect(messaggioAuth('it', firebase('invalid-email'))).toBe(italiano.authEmailNonValida)
    expect(messaggioAuth('it', firebase('requires-recent-login'))).toBe(italiano.authRientra)
    expect(messaggioAuth('it', firebase('weak-password'))).toBe(italiano.authPasswordDebole)
    expect(messaggioAuth('it', firebase('network-request-failed'))).toBe(italiano.authRete)
    expect(messaggioAuth('it', firebase('user-not-found'))).toBe(italiano.authUtenteAssente)
  })

  it('gli errori dell’app senza Firebase seguono lo stesso senso', () => {
    expect(messaggioAuth('it', new AppError('Email o password non corretti', 'auth_invalid'))).toBe('Password sbagliata')
    expect(messaggioAuth('it', new AppError('Connessione assente', 'auth_offline'))).toBe(italiano.authRete)
  })

  it('codice sconosciuto o errore qualsiasi: frase generica, mai il testo grezzo', () => {
    expect(messaggioAuth('it', firebase('qualcosa-di-nuovo'))).toBe(italiano.operazioneKo)
    expect(messaggioAuth('it', new Error('Firebase: boom'))).toBe(italiano.operazioneKo)
    expect(messaggioAuth('it', 'testo')).toBe(italiano.operazioneKo)
    expect(messaggioAuth('it', null)).toBe(italiano.operazioneKo)
    for (const code of ['wrong-password', 'zzz', 'too-many-requests']) {
      expect(messaggioAuth('it', firebase(code))).not.toContain('Firebase')
    }
  })
})
