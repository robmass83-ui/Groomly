import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { useFrasi } from '../../i18n/LinguaContext'

export function RegistroPage() {
  const frasi = useFrasi()
  return <TestataAdmin titolo={frasi.consRegistro} />
}
