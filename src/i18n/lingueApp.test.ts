import { afterEach, describe, expect, it } from 'vitest'
import { erroreApp } from '../data/errors'
import { seedPriceSheet } from '../data/seed/priceSheet'
import { SERVICE_SEED } from '../data/seed/services'
import { noteInLingua, notesFromRelease } from '../lib/appRelease'
import { costruisciRegistro } from '../lib/registroModello'
import { firmaMessaggio, testoMessaggio } from '../lib/messaggiManuali'
import type { GroomlyDati } from '../lib/backupBundle'
import { euro } from './format'
import { frase } from './frase'
import { LINGUE } from './lingua'
import { nomeVoceListino } from './listino'
import { frasiReport } from './report'
import { nomeServizioVisibile } from './servizioVisibile'
import { t } from './t'

const ALTRE = LINGUE.filter((lingua) => lingua !== 'it')
// Nomi di razza uguali in tutte le lingue.
const NOMI_PROPRI = /^(Yorkshire|Jack Russell|Chihuahua \/ Pinscher|Cavalier King|Beagle|Border Collie|Fonnese|Amstaff \/ Pitbull \/ Boxer|Shar Pei|Shiba Inu|Akita Inu|Labrador Retriever|Golden Retriever|Husky|Malamute|Chow Chow|Rottweiler|Cane Corso)$/

function testiDelListino(): string[] {
  const foglio = seedPriceSheet({ name: '', phone: '', address: '' })
  const { titolo, sottotitolo, descrizione } = foglio.intestazione
  return [
    titolo, sottotitolo, descrizione,
    ...foglio.razze.flatMap((razza) => [razza.nome, ...razza.voci.map((voce) => voce.nome)]),
    foglio.noteTaglia.grande,
    foglio.bagnoTosatura.titolo, foglio.bagnoTosatura.sottotitolo, ...foglio.bagnoTosatura.voci.map((voce) => voce.nome),
    foglio.extra.titolo, ...foglio.extra.voci.flatMap((voce) => [voce.nome, ...voce.sotto.map((sotto) => sotto.nome)]),
    foglio.compresi.titolo, ...foglio.compresi.voci.map((voce) => voce.testo),
    foglio.info.titolo, foglio.info.intro, ...foglio.info.punti, foglio.info.chiusura,
    foglio.avviso.titolo, foglio.avviso.intro, ...foglio.avviso.punti,
    foglio.saluto,
  ].filter((testo) => testo !== '' && !NOMI_PROPRI.test(testo))
}

afterEach(() => localStorage.removeItem('groomly.lingua'))

describe('listino iniziale', () => {
  it.each(ALTRE)('ogni testo iniziale ha la traduzione in %s', (lingua) => {
    expect(testiDelListino().filter((testo) => nomeVoceListino(lingua, testo) === testo)).toEqual([])
  })

  it('il testo cambiato dal salone è suo e non si tocca', () => {
    expect(nomeVoceListino('de', 'Grazie per la fiducia!!')).toBe('Grazie per la fiducia!!')
    expect(nomeVoceListino('de', 'Grazie per la fiducia!')).toBe('Danke für Ihr Vertrauen!')
    expect(nomeVoceListino('it', 'Grazie per la fiducia!')).toBe('Grazie per la fiducia!')
  })

  it.each(ALTRE)('ogni servizio iniziale ha il nome in %s', (lingua) => {
    const uguali = SERVICE_SEED.map((servizio) => servizio.name).filter((nome) => nome !== 'Stripping' && nomeServizioVisibile(lingua, nome) === nome)
    expect(uguali).toEqual([])
    expect(nomeServizioVisibile(lingua, 'Toelettatura')).not.toBe('Toelettatura')
  })
})

describe('messaggi al cliente', () => {
  const pieni = { nome: 'Anna', cane: 'Rex', servizio: 'Bagno', quando: 'domani' }

  it('in tutte le lingue non restano segnaposto e cade il pezzo vuoto', () => {
    for (const lingua of LINGUE) {
      for (const tipo of ['promemoria', 'conferma', 'richiamo', 'pronto', 'auguri'] as const) {
        expect(testoMessaggio(lingua, tipo, pieni)).not.toMatch(/\{\{|\[|\]/)
        const vuoto = testoMessaggio(lingua, tipo, { nome: '', cane: 'Rex', servizio: '', quando: '' })
        expect(vuoto).not.toMatch(/\{\{|\[|\]|\(\)/)
        expect(vuoto).not.toContain('Bagno')
      }
    }
  })

  it('il tedesco dà del Sie e il francese del vous', () => {
    expect(testoMessaggio('de', 'promemoria', pieni)).toContain('Sie')
    expect(testoMessaggio('fr', 'promemoria', pieni)).toContain('vous')
    expect(firmaMessaggio('fr')).toBe('Fait avec Groomly')
  })
})

describe('note di rilascio', () => {
  const testo = '- Agenda più veloce\n[en]\n- Faster diary\n[de]\n- Schnellerer Kalender'

  it('ognuno legge la sua sezione', () => {
    const note = notesFromRelease(testo)
    expect(noteInLingua(note, 'it')).toEqual(['Agenda più veloce'])
    expect(noteInLingua(note, 'en')).toEqual(['Faster diary'])
    expect(noteInLingua(note, 'de')).toEqual(['Schnellerer Kalender'])
  })

  it('senza la sua sezione legge una frase generica, mai l’italiano', () => {
    expect(noteInLingua(['Agenda più veloce'], 'fr')).toEqual(['Corrections et améliorations'])
    expect(noteInLingua([], 'fr')).toEqual([])
  })
})

describe('lingua fuori dalle schermate', () => {
  it('frase ed errori seguono la lingua scelta', () => {
    expect(frase('authSalvataggio')).toBe(t('it', 'authSalvataggio'))
    localStorage.setItem('groomly.lingua', 'fr')
    expect(frase('authSalvataggio')).toBe(t('fr', 'authSalvataggio'))
    expect(erroreApp('storage_write').message).toBe(t('fr', 'authSalvataggio'))
    expect(erroreApp('storage_write').code).toBe('storage_write')
  })

  it('il Registro Excel esce nella lingua dell’app', () => {
    localStorage.setItem('groomly.lingua', 'de')
    const dati = {
      dogs: { a: { name: 'Rex', size: 'grande', sex: 'F', temperament: 'mordace', status: 'deceduto', contact: { name: 'Anna', phone: '1' } } },
      appointments: {}, services: {}, settings: {}, fotoMancanti: [],
    } as unknown as GroomlyDati
    const riga = costruisciRegistro(dati, new Date('2026-11-05T10:00:00Z')).cani[0]
    expect(riga).toMatchObject({ taglia: 'Groß', sesso: 'Hündin', carattere: 'Bissig', stato: 'Verstorben' })
  })
})

describe('PDF', () => {
  // Helvetica di jsPDF scrive solo i caratteri di WinAnsi: uno fuori tabella esce come spazzatura.
  const WIN_ANSI = /^[ -~ -ÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]*$/

  it.each(LINGUE)('le frasi del riepilogo in %s stanno nel font', (lingua) => {
    const fuori = [...Object.values(frasiReport(lingua)), t(lingua, 'incGenerato'), euro(lingua, 1234.56)].filter((testo) => !WIN_ANSI.test(testo))
    expect(fuori).toEqual([])
  })
})
