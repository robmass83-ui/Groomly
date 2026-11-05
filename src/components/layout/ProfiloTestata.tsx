import { UserRound } from 'lucide-react'
import { createContext } from 'react'
import { NavLink } from 'react-router-dom'
import { useFrasi } from '../../i18n/LinguaContext'
import './profiloTestata.css'

// Lo offre ShellFrame: l'icona sta solo sulle pagine con la barra sotto.
export const ProfiloContext = createContext<{ avviso: boolean } | null>(null)

export function ProfiloTestata({ avviso }: { avviso: boolean }) {
  const frasi = useFrasi()
  const nome = avviso ? `${frasi.navImpostazioni}, ${frasi.navDati}` : frasi.navImpostazioni
  return (
    <NavLink to="/impostazioni" className="profilo-testata" aria-label={nome}>
      <span className="profilo-testata__tondo">
        <UserRound size={20} strokeWidth={2} aria-hidden />
        {avviso ? <span data-testid="tax-dot" className="profilo-testata__dot" /> : null}
      </span>
    </NavLink>
  )
}
