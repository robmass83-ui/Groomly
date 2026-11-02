import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { invitoInSospeso } from '../data/local/invitoInSospeso'

// Una volta per apertura e per invito: se la pagina d'invito non riesce (rete), tornare alla Home
// non deve rimandarci in loop. Alla prossima apertura dell'app si riprova.
let rimandatoPer: string | null = null

/** Solo per i test. */
export function __resetRimandoInvito(): void {
  rimandatoPer = null
}

/** Chi è entrato (o si è appena registrato) con un invito in sospeso torna alla pagina dell'invito. */
export function RimandoInvito(): null {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const token = invitoInSospeso()
    if (!token || rimandatoPer === token) return
    rimandatoPer = token
    if (pathname.startsWith('/invito/')) return
    navigate(`/invito/${token}`, { replace: true })
  }, [pathname, navigate])

  return null
}
