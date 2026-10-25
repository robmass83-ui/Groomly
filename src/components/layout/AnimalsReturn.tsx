import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFrasi } from '../../i18n/LinguaContext'
import './animalsReturn.css'

export function AnimalsReturn() {
  const frasi = useFrasi()
  return (
    <Link to="/animali" replace aria-label={frasi.schedaTornaAnimali} className="animals-return">
      <ArrowLeft size={22} strokeWidth={2} aria-hidden />
      {frasi.caniTitolo}
    </Link>
  )
}
