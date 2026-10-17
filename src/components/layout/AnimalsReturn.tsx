import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import './animalsReturn.css'

export function AnimalsReturn() {
  return (
    <Link to="/animali" replace aria-label="Torna agli animali" className="animals-return">
      <ArrowLeft size={22} strokeWidth={2} aria-hidden />
      Animali
    </Link>
  )
}
