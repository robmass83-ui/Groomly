import { useAdminDati } from '../../components/admin/AdminDati'
import { PianiPagamenti } from '../../components/admin/PianiPagamenti'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { useFrasi } from '../../i18n/LinguaContext'
import { CORPO } from './comune'

export function PianiPage() {
  const frasi = useFrasi()
  const { config } = useAdminDati()
  return (
    <>
      <TestataAdmin titolo={frasi.amTabPiani} />
      <div style={{ ...CORPO, maxWidth: 720 }}>
        <PianiPagamenti config={config} />
      </div>
    </>
  )
}
