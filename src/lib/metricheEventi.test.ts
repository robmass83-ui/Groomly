import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const PUNTI: [string, string][] = [
  ['cane_creato', 'src/hooks/useDogs.ts'],
  ['appuntamento_creato', 'src/hooks/useAppointments.ts'],
  ['listino_condiviso', 'src/pages/PriceSheetExportPage.tsx'],
  ['report_esportato', 'src/components/earnings/ExportSheet.tsx'],
  ['vetrina_piano_vista', 'src/components/abbonamento/Vetrina.tsx'],
  ['avvisami_toccato', 'src/components/abbonamento/Vetrina.tsx'],
  ['avvisami_toccato', 'src/hooks/usePiano.tsx'],
  ['paywall_aperta', 'src/hooks/usePiano.tsx'],
  ['beta_accettata', 'src/pages/BetaInvitoPage.tsx'],
  ['beta_rifiutata', 'src/pages/BetaInvitoPage.tsx'],
  ['backup_eseguito', 'src/pages/SettingsPage.tsx'],
  ['backup_eseguito', 'src/lib/driveInvio.ts'],
]

describe('eventi collegati', () => {
  it.each(PUNTI)('%s parte da %s', (nome, file) => {
    expect(readFileSync(file, 'utf8')).toMatch(new RegExp(`traccia\\(\\{ nome: '${nome}'`))
  })
})
