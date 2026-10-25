import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { frasiNelFile } from './frasiFisse'

/** File già sul vocabolario. Ogni zona delle schermate aggiunge i propri. */
export const puliti = [
  'src/components/layout/BottomNav.tsx',
  'src/pages/LoginPage.tsx',
  'src/pages/InvitePage.tsx',
  'src/components/piano/PianoCard.tsx',
  'src/components/piano/PaywallSheet.tsx',
  'src/components/piano/AvvisoProposta.tsx',
  'src/components/piano/RiquadroAttesa.tsx',
  'src/components/piano/RiquadroRichieste.tsx',
  'src/components/piano/TesseraFedelta.tsx',
  'src/components/piano/RigaRecensione.tsx',
  'src/components/piano/CopieCloudRiga.tsx',
  'src/components/piano/RiquadroAvvisi.tsx',
  'src/components/piano/SchedeStatistiche.tsx',
  'src/components/piano/OrariEditor.tsx',
  'src/pages/PianoPagine.tsx',
  'src/pages/StatistichePage.tsx',
  'src/pages/HomePage.tsx',
  'src/pages/DogsPage.tsx',
  'src/pages/NextAppointment.tsx',
  'src/components/domain/AppointmentRow.tsx',
  'src/components/domain/MonthlyBanner.tsx',
  'src/components/domain/PersonalAppointment.tsx',
  'src/components/domain/NoteAltro.tsx',
  'src/components/earnings/EarningsTile.tsx',
  'src/components/appointment/CloseVisitDialog.tsx',
  'src/components/ui/SearchBar.tsx',
  'src/pages/DogPage.tsx',
  'src/pages/DogFields.tsx',
  'src/pages/ServiceSheet.tsx',
  'src/pages/CalendarPage.tsx',
  'src/pages/MonthlyPage.tsx',
  'src/pages/AppointmentPage.tsx',
  'src/pages/AppointmentForm.tsx',
  'src/pages/PersonalAppointmentPage.tsx',
  'src/pages/ClosurePage.tsx',
  'src/components/calendar/WeekRows.tsx',
]

describe('frasi fisse', () => {
  it('i file già tradotti non tengono una frase italiana fissa', () => {
    const resti = puliti.flatMap((file) => frasiNelFile(join(process.cwd(), file)).map((frase) => `${file}: ${frase}`))
    expect(resti).toEqual([])
  })
})
