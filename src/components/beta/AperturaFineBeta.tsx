import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { chiaveBeta, useBeta } from './BetaProvider'

// La domanda di fine beta si apre da sola una volta (scelta di Roberto): il giorno prima della fine
// o al primo avvio dopo. Solo il titolare e solo dalla Home; un'estensione cambia la data e la riapre.
export function AperturaFineBeta() {
  const beta = useBeta()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const fine = beta.fine?.toISOString() ?? ''
  const pronta = beta.pronto && beta.titolare && beta.domandaFine && fine !== '' && pathname === '/'

  useEffect(() => {
    if (!pronta) return
    const chiave = chiaveBeta(beta.salonId, `fineVista.${fine}`)
    try {
      if (localStorage.getItem(chiave) !== null) return
      localStorage.setItem(chiave, String(Date.now()))
    } catch {
      // Senza storage non si apre da sola: resta l'avviso.
      return
    }
    navigate('/impostazioni/beta/fine')
  }, [pronta, beta.salonId, fine, navigate])

  return null
}
