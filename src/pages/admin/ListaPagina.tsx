import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAdminDati } from '../../components/admin/AdminDati'
import { BarraSelezione, ListaSaloni, type FiltroInvito } from '../../components/admin/ListaSaloni'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { useFrasi } from '../../i18n/LinguaContext'
import { percorsoSalone } from '../../lib/percorsoAdmin'
import { CORPO } from './comune'

const FILTRI_INVITO: readonly FiltroInvito[] = ['tutti', 'invitato', 'accettato', 'rifiutato', 'scaduto', 'revocato']
const AZIONE = { border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, minHeight: 44, padding: '0 6px' } as const

/** Saloni e Beta mostrano la stessa lista: cambia il modo. */
export function ListaPagina({ modo, titolo }: { modo: 'saloni' | 'beta'; titolo: string }) {
  const frasi = useFrasi()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const dati = useAdminDati()
  const { selezione, setSelezione, righe } = dati
  const filtroInvito = FILTRI_INVITO.find((f) => f === params.get('stato')) ?? 'tutti'
  const selezionando = modo === 'saloni' ? selezione : null
  const azione = !dati.directory || modo !== 'saloni' ? null : selezione ? (
    <button type="button" onClick={() => setSelezione(new Set(righe.map((r) => r.row.salonId)))} style={AZIONE}>{frasi.amTutti}</button>
  ) : (
    <button type="button" onClick={() => setSelezione(new Set())} style={AZIONE}>{frasi.amSeleziona}</button>
  )
  return (
    <>
      <TestataAdmin
        titolo={selezionando ? frasi.amSelezionati.replace('{{n}}', String(selezionando.size)) : titolo}
        onBack={selezionando ? () => setSelezione(null) : undefined}
        azione={azione}
      />
      <div style={CORPO}>
        <ListaSaloni
          modo={modo}
          righe={righe}
          pronte={dati.directory !== null}
          errore={dati.erroreDirectory && dati.directory === null}
          inviti={dati.invitiPer}
          filtri={dati.filtri}
          onFiltri={dati.setFiltri}
          filtroInvito={filtroInvito}
          onFiltroInvito={(f) => setParams(f === 'tutti' ? {} : { stato: f })}
          conAttivita={dati.contatori?.perSalone != null}
          selezione={selezionando}
          onSelezione={setSelezione}
          onApri={(id) => {
            setSelezione(null)
            navigate(percorsoSalone(id), { state: { da: modo } })
          }}
          adesso={dati.adesso}
        />
        {selezionando ? (
          <BarraSelezione
            n={selezionando.size}
            onAnnulla={() => setSelezione(null)}
            onInvita={(piano) => dati.apriInvito([...selezionando], piano)}
            onRegala={dati.apriRegalaTutti}
          />
        ) : null}
      </div>
    </>
  )
}
