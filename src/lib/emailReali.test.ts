import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const REALI = ['laura.masala@tiscali.it', 'robmass83@gmail.com', 'masala.roberto@hotmail.it']
// salonPath protegge gli account di I Pelosetti dall'eliminazione e dagli inviti: da togliere quando arriva un campo sul server.
const AMMESSI = new Set(['src/lib/salonPath.ts'])

describe('email di persone vere nel codice pubblico', () => {
  it('nel codice dell’app, delle functions e delle pagine compaiono solo dove servono', () => {
    const trovati = execFileSync('git', ['grep', '-l', '-i', '-F', ...REALI.flatMap((email) => ['-e', email]), '--', 'src', 'functions/src', 'hosting'], { encoding: 'utf8' })
      .split('\n')
      .map((riga) => riga.trim())
      .filter((riga) => riga !== '' && !/\.test\.tsx?$/.test(riga) && !riga.includes('testutil'))
    expect(trovati.filter((file) => !AMMESSI.has(file))).toEqual([])
  })
})
