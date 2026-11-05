import { useFrasi } from '../../i18n/LinguaContext'
import { ListaPagina } from './ListaPagina'

export function SaloniPage() {
  const frasi = useFrasi()
  return <ListaPagina modo="saloni" titolo={frasi.amTabSaloni} />
}
