import { useParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'

export function DogPage() {
  const { id } = useParams()
  return (
    <PhoneShell>
      <Header title={id ? 'Scheda' : 'Nuovo cane'} backTo="/animali" />
    </PhoneShell>
  )
}
