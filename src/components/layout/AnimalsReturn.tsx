import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFrasi } from '../../i18n/LinguaContext'
import './animalsReturn.css'

/** Spazio in fondo alla scheda perché il pulsante tondo non copra l'ultimo contenuto. */
export const ANIMALS_RETURN_SPAZIO = 'calc(72px + env(safe-area-inset-bottom, 0px))'

export function AnimalsReturn() {
  const frasi = useFrasi()
  return (
    <Link to="/animali" replace aria-label={frasi.schedaTornaAnimali} className="animals-return">
      <ArrowLeft size={22} strokeWidth={2} aria-hidden />
    </Link>
  )
}
