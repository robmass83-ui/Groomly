import { UserRound } from 'lucide-react'
import { createContext } from 'react'
import { NavLink } from 'react-router-dom'
import type { AvvisiDaLeggere } from '../../hooks/useAvvisiDaLeggere'
import { useFrasi } from '../../i18n/LinguaContext'
import './profiloTestata.css'

export interface DaFareProfilo {
  fiscale: boolean
  avvisi: AvvisiDaLeggere
}

// Lo offre ShellFrame: l'icona sta solo sulle pagine con la barra sotto.
// Il pallino e il riquadro Da fare delle Impostazioni leggono da qui: ogni motivo del pallino ha la sua riga.
export const ProfiloContext = createContext<DaFareProfilo | null>(null)

export function ProfiloTestata({ fiscale, avvisi }: DaFareProfilo) {
  const frasi = useFrasi()
  const motivi = [
    ...(fiscale ? [frasi.navDati] : []),
    ...(avvisi.n > 0 ? [frasi.hubAvvisiDaLeggere.replace('{{n}}', String(avvisi.n))] : []),
  ]
  return (
    <NavLink to="/impostazioni" className="profilo-testata" aria-label={[frasi.navImpostazioni, ...motivi].join(', ')}>
      <span className="profilo-testata__tondo">
        <UserRound size={20} strokeWidth={2} aria-hidden />
        {motivi.length > 0 ? <span data-testid="profilo-dot" className="profilo-testata__dot" /> : null}
      </span>
    </NavLink>
  )
}
