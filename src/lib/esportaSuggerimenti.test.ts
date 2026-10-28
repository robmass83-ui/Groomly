import { describe, expect, it } from 'vitest'
import { nomeFileSuggerimenti, pdfSuggerimenti, xlsxSuggerimenti } from './esportaSuggerimenti'

const INTESTAZIONI = ['Stato', 'Categoria', 'Suggerimento', 'Volte', 'Email', 'Toelettatura', 'Data']

describe('esporta suggerimenti', () => {
  it('dà al file la data locale', () => {
    expect(nomeFileSuggerimenti(new Date(2026, 9, 27, 15), 'pdf')).toBe('Groomly_Suggerimenti_2026-10-27.pdf')
    expect(nomeFileSuggerimenti(new Date(2026, 9, 27, 15), 'xlsx')).toBe('Groomly_Suggerimenti_2026-10-27.xlsx')
  })

  it('scrive una riga Excel per persona, con lo stesso testo', async () => {
    const blob = await xlsxSuggerimenti(INTESTAZIONI, [
      { stato: 'Interessanti', categoria: 'Agenda', testo: 'Orari più tardi', volte: 2, email: 'a@a.it', salone: 'Bauci', data: '27 ott' },
      { stato: 'Interessanti', categoria: 'Agenda', testo: 'Orari più tardi', volte: 2, email: 'b@b.it', salone: 'Pelo', data: '26 ott' },
    ])
    const excel = await import('exceljs') as typeof import('exceljs') & { default?: typeof import('exceljs') }
    const ExcelJS = excel.default ?? excel
    const book = new ExcelJS.Workbook()
    await book.xlsx.load(await blob.arrayBuffer())
    const sheet = book.getWorksheet('Suggerimenti')
    expect(sheet?.getRow(1).values).toEqual([undefined, ...INTESTAZIONI])
    expect(sheet?.getRow(2).values).toEqual([undefined, 'Interessanti', 'Agenda', 'Orari più tardi', 2, 'a@a.it', 'Bauci', '27 ott'])
    expect(sheet?.getRow(3).getCell(3).value).toBe('Orari più tardi')
    expect(sheet?.getRow(3).getCell(5).value).toBe('b@b.it')
  })

  it('mette nel PDF il testo intero e chi lo ha mandato', async () => {
    const blob = pdfSuggerimenti('Suggerimenti', [
      { stato: 'Interessanti', testo: 'Orari piu tardi', persone: ['a@a.it · Bauci · 27 ott'] },
      { stato: 'Da vedere', testo: 'Si blocca', persone: ['c@c.it · Bauci'] },
    ])
    const text = new TextDecoder('latin1').decode(await blob.arrayBuffer())
    expect(text.startsWith('%PDF-')).toBe(true)
    expect(text).toContain('Suggerimenti')
    expect(text).toContain('Interessanti')
    expect(text).toContain('Orari piu tardi')
    expect(text).toContain('a@a.it')
    expect(text).toContain('Si blocca')
    const interessanti = text.indexOf('Interessanti')
    const daVedere = text.indexOf('Da vedere')
    expect(interessanti).toBeGreaterThan(-1)
    expect(daVedere).toBeGreaterThan(interessanti)
  })
})
