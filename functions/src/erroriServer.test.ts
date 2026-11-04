import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CODICI_SERVER, codiceDaMessaggio, codiceErroreServer, fraseErrore } from '../../src/i18n/errori'
import { LINGUE } from '../../src/i18n/lingua'
import { erroreDaMessaggio, erroreServer } from './erroriServer'

function sorgenti(dir: string, out: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const path = join(dir, nome)
    if (statSync(path).isDirectory()) sorgenti(path, out)
    else if (nome.endsWith('.ts') && !nome.includes('.test.') && !nome.includes('testutil')) out.push(path)
  }
  return out
}

// Le decisioni condivise col client: il server ne gira il `message` così com'è.
const FILE_CONDIVISI = ['salonAccess', 'prenotazione', 'disponibilita', 'funzioniPiano', 'slug'].map((nome) => `src/lib/${nome}.ts`)
const FRASE_DECISIONE = /(?:denied\(|message: |MESSAGGIO_\w+ = )(['"])((?:(?!\1).)+)\1/g

describe('errori del server', () => {
  it('l’errore porta il codice e tiene il messaggio italiano per le APK vecchie', () => {
    const errore = erroreServer('failed-precondition', 'accesso_negato')
    expect(errore.message).toBe('Accesso negato')
    expect(errore.details).toEqual({ codice: 'accesso_negato' })
    expect(erroreServer('invalid-argument', 'annuncio_giorni_minimi', { n: 15 }).message).toBe('Almeno 15 giorni dopo oggi')
    expect(erroreServer('invalid-argument', 'annuncio_giorni_minimi', { n: 15 }).details).toEqual({ codice: 'annuncio_giorni_minimi', valori: { n: 15 } })
  })

  it('una frase delle decisioni condivise ritrova il suo codice', () => {
    const errore = erroreDaMessaggio('failed-precondition', 'Posti esauriti')
    expect(errore.message).toBe('Posti esauriti')
    expect(errore.details).toEqual({ codice: 'posti_esauriti' })
  })

  it('il client legge codice e valori da details', () => {
    expect(codiceErroreServer(erroreServer('invalid-argument', 'scrivi_parola', { parola: 'ACCENDI' }))).toEqual({ codice: 'scrivi_parola', valori: { parola: 'ACCENDI' } })
    expect(codiceErroreServer(new Error('rete'))).toBeNull()
    expect(codiceErroreServer({ details: { codice: 3 } })).toBeNull()
  })

  it('solo erroriServer crea un HttpsError: nessun errore italiano senza codice', () => {
    const fuori = sorgenti('functions/src')
      .map((file) => file.replace(/\\/g, '/'))
      .filter((file) => file !== 'functions/src/erroriServer.ts' && readFileSync(file, 'utf8').includes('new HttpsError('))
    expect(fuori).toEqual([])
  })

  it('ogni frase delle decisioni condivise ha un codice', () => {
    const senza = FILE_CONDIVISI.flatMap((file) => [...readFileSync(file, 'utf8').matchAll(FRASE_DECISIONE)]
      .map((voce) => voce[2])
      .filter((frase) => codiceDaMessaggio(frase) === null)
      .map((frase) => `${file}: ${frase}`))
    expect(senza).toEqual([])
  })

  it('ogni codice ha una frase in tutte le lingue, con gli stessi segnaposto', () => {
    const segnaposto = (frase: string) => (frase.match(/\{\{\w+\}\}/g) ?? []).sort().join()
    for (const codice of CODICI_SERVER) {
      const italiano = fraseErrore('it', codice)
      expect(italiano, codice).not.toBe(fraseErrore('it', 'sconosciuto'))
      for (const lingua of LINGUE) expect(segnaposto(fraseErrore(lingua, codice)), `${codice} ${lingua}`).toBe(segnaposto(italiano))
    }
  })
})
