import { useAdminDati } from '../../components/admin/AdminDati'
import { CardTour } from '../../components/admin/PanoramicaAdmin'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { useFrasi } from '../../i18n/LinguaContext'
import { CORPO } from './comune'

export function SistemaPage() {
  const frasi = useFrasi()
  const { config } = useAdminDati()
  return (
    <>
      <TestataAdmin titolo={frasi.consSistema} />
      <div style={{ ...CORPO, maxWidth: 720 }}>
        {config?.tour ? <CardTour tour={config.tour} /> : null}
      </div>
    </>
  )
}
