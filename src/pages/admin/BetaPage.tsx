import { useFrasi } from '../../i18n/LinguaContext'
import { ListaPagina } from './ListaPagina'

export function BetaPage() {
  const frasi = useFrasi()
  return <ListaPagina modo="beta" titolo={frasi.amTabBeta} />
}
