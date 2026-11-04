import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEBITO_CATENE, FRASI_UGUALI, SEGNAPOSTO_AMMESSI } from './debitoLingue'
import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import { fileSorgente } from './frasiFisse'
import { it as italiano } from './it'
import { LINGUE, LOCALE_INTL, NOMI_LINGUA } from './lingua'

const CATALOGHI: Record<string, Record<string, string>> = { it: italiano, en, es, fr, de }
const SEGNAPOSTO = /\{\{\w+\}\}/g
// Scritta così perché questo file non si segnali da solo.
const DA_TRADURRE = ['// LINGUE', 'da tradurre'].join(': ')
const CATENA = /\b(?:lingua|lang|codice)\w* === '(?:en|es)'/
const CATENE_COMPLETE = new Set(['src/i18n/format.ts'])

function testo(file: string): string {
  return readFileSync(join(process.cwd(), file), 'utf8')
}

function segnaposto(frase: string): string[] {
  return (frase.match(SEGNAPOSTO) ?? []).sort()
}

const sorgenti = [...fileSorgente('src'), ...fileSorgente('functions/src')].map((file) => file.replace(/\\/g, '/')).sort()

describe('cinque lingue', () => {
  it('un solo elenco di lingue, con nome e locale per ognuna', () => {
    expect(LINGUE).toEqual(['it', 'en', 'es', 'fr', 'de'])
    expect(Object.keys(CATALOGHI)).toEqual([...LINGUE])
    for (const lingua of LINGUE) {
      expect(NOMI_LINGUA[lingua]).not.toBe('')
      expect(LOCALE_INTL[lingua]).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
    }
  })

  it('tutte le lingue hanno le stesse chiavi e gli stessi segnaposto, con frasi non vuote', () => {
    const chiavi = Object.keys(italiano).sort()
    for (const lingua of LINGUE) {
      const catalogo = CATALOGHI[lingua]
      expect(Object.keys(catalogo).sort(), lingua).toEqual(chiavi)
      const storte = chiavi.filter((chiave) => catalogo[chiave].length === 0
        || segnaposto(catalogo[chiave]).join() !== segnaposto(CATALOGHI.it[chiave]).join())
      expect(storte, lingua).toEqual([])
    }
  })

  // Con i file provvisori di T1 tutto è uguale all'inglese: il controllo parte da solo coi file veri.
  it.each(['fr', 'de'])('%s è uguale a en o it solo per le frasi in elenco', (lingua) => {
    if (testo(`src/i18n/${lingua}.ts`).includes(DA_TRADURRE)) return
    const uguali = Object.keys(italiano).filter((chiave) => {
      const frase = CATALOGHI[lingua][chiave]
      return (frase === en[chiave as keyof typeof en] || frase === italiano[chiave as keyof typeof italiano]) && !FRASI_UGUALI.has(frase)
    })
    expect(uguali).toEqual([])
  })

  it('nessuno riscrive a mano l’elenco delle lingue', () => {
    const unione = /'it'\s*\|\s*'en'\s*\|\s*'es'/
    expect(sorgenti.filter((file) => unione.test(testo(file)))).toEqual([])
  })

  it('catene per lingua solo nei file ancora da fare, e l’elenco si svuota', () => {
    const conCatene = sorgenti.filter((file) => !CATENE_COMPLETE.has(file) && CATENA.test(testo(file)))
    expect(conCatene).toEqual([...DEBITO_CATENE].sort())
  })

  it.skipIf(SEGNAPOSTO_AMMESSI)('a fine ondata 2 non resta nessun segnaposto', () => {
    expect(sorgenti.filter((file) => testo(file).includes(DA_TRADURRE))).toEqual([])
  })
})
