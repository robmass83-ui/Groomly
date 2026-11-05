import { frase } from '../i18n/frase'
import type { StatisticheGiorno } from './statisticheGiorno'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function metricheXlsx(righe: readonly StatisticheGiorno[]): Promise<Blob> {
  const { Workbook } = await import('exceljs')
  const libro = new Workbook()
  const foglio = libro.addWorksheet(frase('metriche'))
  foglio.addRow([
    frase('metGiorno'), frase('metSaloni'), frase('metNuovi'), frase('metAttivi1'), frase('metAttivi7'), frase('metAttivi30'),
    frase('metAttivati'), frase('metAppuntamenti'), frase('metMedia'), frase('metAvvisamiPlus'), frase('metAvvisamiSalon'), frase('metEsclusiTitolo'),
  ])
  foglio.getRow(1).font = { bold: true }
  for (const riga of righe) {
    foglio.addRow([
      riga.giorno, riga.saloni, riga.nuovi, riga.attivi1, riga.attivi7, riga.attivi30,
      riga.attivati, riga.appuntamenti, riga.mediaAppuntamenti, riga.avvisami.plus, riga.avvisami.salon, riga.esclusi,
    ])
  }
  return new Blob([await libro.xlsx.writeBuffer()], { type: XLSX })
}
