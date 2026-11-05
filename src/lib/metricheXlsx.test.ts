// @vitest-environment happy-dom
import { Workbook } from 'exceljs'
import { describe, expect, it } from 'vitest'
import { metricheXlsx } from './metricheXlsx'
import type { StatisticheGiorno } from './statisticheGiorno'

const RIGA: StatisticheGiorno = {
  giorno: '2026-11-04', saloni: 3, nuovi: 1, attivi1: 1, attivi7: 2, attivi30: 3, attivati: 2,
  appuntamenti: 4, mediaAppuntamenti: 4, coorti: [], avvisami: { plus: 1, salon: 0 }, esclusi: 2, calcolatoIl: 'x',
}

describe('metricheXlsx', () => {
  it('una riga per giorno, con intestazione', async () => {
    const blob = await metricheXlsx([RIGA, { ...RIGA, giorno: '2026-11-05', saloni: 4 }])
    const libro = new Workbook()
    await libro.xlsx.load(await blob.arrayBuffer())
    const foglio = libro.worksheets[0]
    expect(foglio?.rowCount).toBe(3)
    expect(foglio?.getRow(3).getCell(1).value).toBe('2026-11-05')
    expect(foglio?.getRow(3).getCell(2).value).toBe(4)
  })
})
