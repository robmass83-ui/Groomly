import { useNavigate } from 'react-router-dom'
import { useAdminDati } from '../../components/admin/AdminDati'
import { PanoramicaAdmin, type ApriTab } from '../../components/admin/PanoramicaAdmin'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { useFrasi } from '../../i18n/LinguaContext'
import { PERCORSO_ASSISTENZA, PERCORSO_BETA, PERCORSO_SALONI, percorsoSalone } from '../../lib/percorsoAdmin'
import { CORPO } from './comune'

export function PanoramicaPage() {
  const frasi = useFrasi()
  const navigate = useNavigate()
  const dati = useAdminDati()
  const apri: ApriTab = (prossimo, stato) => {
    if (prossimo === 'beta') navigate(stato ? `${PERCORSO_BETA}?stato=${stato}` : PERCORSO_BETA)
    else if (prossimo === 'saloni') navigate(PERCORSO_SALONI)
    else navigate(prossimo === 'feedback' ? `${PERCORSO_ASSISTENZA}?fonte=feedback` : PERCORSO_ASSISTENZA)
  }
  return (
    <>
      <TestataAdmin titolo={frasi.amTabPanoramica} />
      <div style={CORPO}>
        <PanoramicaAdmin
          contatori={dati.contatori}
          errore={dati.erroreContatori}
          onRiprova={dati.caricaContatori}
          daFare={dati.daFare}
          nomeDi={dati.nomeDi}
          apri={apri}
          onSalone={(id) => navigate(percorsoSalone(id))}
          onEstendi30={dati.apriEstendi30}
          riepilogoAccount={dati.riepilogoAccount}
        />
      </div>
    </>
  )
}
