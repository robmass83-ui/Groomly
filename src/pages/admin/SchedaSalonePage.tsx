import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAdminDati } from '../../components/admin/AdminDati'
import { SchedaSalone, type VistaScheda } from '../../components/admin/SchedaSalone'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { useToast } from '../../components/layout/Toast'
import { AttesaRiga } from '../../components/ui/Zampette'
import {
  callEstendiBeta,
  callRevocaBeta,
  callSchedaSaloneAdmin,
  callSegnaEarlyAdopter,
  storicoInvitoBeta,
} from '../../data/firebase/adminClient'
import { useFrasi } from '../../i18n/LinguaContext'
import { nomeSalone } from '../../lib/adminManager'
import { PERCORSO_BETA, PERCORSO_SALONI } from '../../lib/percorsoAdmin'
import { CORPO } from './comune'

function vistaDi(valore: string | null): VistaScheda {
  return valore === 'storico' || valore === 'feedback' ? valore : 'azioni'
}

export function SchedaSalonePage() {
  const frasi = useFrasi()
  const toast = useToast()
  const navigate = useNavigate()
  const { state } = useLocation()
  const { salonId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const dati = useAdminDati()
  const { azioni, esegui } = dati
  const vista = vistaDi(params.get('vista'))
  const riga = dati.righe.find((r) => r.row.salonId === salonId)
  const indietro = () => navigate((state as { da?: string } | null)?.da === 'beta' ? PERCORSO_BETA : PERCORSO_SALONI)

  if (!riga) {
    return (
      <>
        <TestataAdmin titolo={frasi.adminManager} onBack={indietro} />
        <div style={CORPO}>
          {dati.directory || dati.erroreDirectory ? <p style={{ margin: 0 }}>{frasi.uteNessuna}</p> : <AttesaRiga testo={frasi.uteCarica} />}
        </div>
      </>
    )
  }
  const { row } = riga
  const sottotitolo = [row.salonName.trim() !== '' ? row.ownerName : '', riga.info.citta ?? ''].filter(Boolean).join(' · ') || undefined
  return (
    <>
      <TestataAdmin titolo={nomeSalone(row)} sottotitolo={sottotitolo} onBack={indietro} />
      <div style={{ ...CORPO, maxWidth: 720 }}>
        <SchedaSalone
          key={row.salonId}
          row={row}
          livello={riga.livello}
          pianoAttuale={azioni.pianoDi(row)}
          beta={riga.beta}
          invito={dati.invitiPer.get(row.salonId)}
          info={riga.info}
          feedback={dati.feedback.filter((f) => f.salonId === row.salonId)}
          problema={azioni.problema(row.salonId)}
          vista={vista}
          onVista={(v) => setParams(v === 'azioni' ? {} : { vista: v }, { state, replace: true })}
          caricaStorico={() => storicoInvitoBeta(row.salonId)}
          caricaNumeri={() => callSchedaSaloneAdmin(row.salonId)}
          onGo={() => azioni.tornaGo(row)}
          onAttiva={(piano) => azioni.attiva(row, piano)}
          onRegala={() => azioni.regala(row)}
          onElimina={() => azioni.elimina(row)}
          onInvita={(piano) => dati.apriInvito([row.salonId], piano)}
          onEstendi={(giorni) => esegui(() => callEstendiBeta({ salonId: row.salonId, giorni }))}
          onRevoca={(testo) => esegui(async () => {
            const esito = await callRevocaBeta({ salonId: row.salonId, ...(testo ? { testo } : {}) })
            if (esito.emailStato === 'non_inviata') toast.show(frasi.bypassMailKo, 'plain')
          })}
          onRevocaInvito={() => esegui(() => callRevocaBeta({ salonId: row.salonId }))}
          onEarly={(valore) => esegui(() => callSegnaEarlyAdopter({ salonId: row.salonId, valore }))}
          adesso={dati.adesso}
        />
      </div>
    </>
  )
}
