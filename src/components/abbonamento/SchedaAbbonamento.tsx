import type { CSSProperties } from 'react'
import { ChevronRight, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePiano } from '../../hooks/usePiano'
import { useFrasi } from '../../i18n/LinguaContext'
import { statoScheda } from '../../lib/abbonamento'
import { BollinoPiano, MarchioGo } from './MarchioPiano'

// Testo verificato almeno 4.5:1 sul colore più chiaro di ogni sfumatura.
const COLORI = {
  plus: { sfondo: 'linear-gradient(135deg, #7B3FE4, #4F2BB8)', seconda: '#EDE4FF' },
  salone: { sfondo: 'linear-gradient(135deg, #8A6200, #5E4300)', seconda: '#FFEFC2' },
  vip: { sfondo: 'linear-gradient(135deg, #2A2A2A, #0E0E0E)', seconda: '#F6D77B' },
} as const

const riga1: CSSProperties = { fontWeight: 700, fontSize: 14, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const riga2: CSSProperties = { fontWeight: 600, fontSize: 12, lineHeight: 1.2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const colonna: CSSProperties = { display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }

// Scorciatoia Abbonamento delle Impostazioni: Go invita a passare a Plus, chi paga vede il suo piano.
export function SchedaAbbonamento({ stile, stileBollino, titolare }: { stile: CSSProperties; stileBollino: CSSProperties; titolare: boolean }) {
  const frasi = useFrasi()
  const piano = usePiano()
  const scheda = statoScheda(piano, titolare)
  const base: CSSProperties = { ...stile, padding: 0 }
  // Il contenuto sta in un riquadro che taglia il riflesso; il bollino nell'angolo resta fuori, come «NUOVO».
  const dentro: CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderRadius: 'inherit', overflow: 'hidden' }

  if (scheda.tipo === 'attesa') {
    return (
      <Link to="/impostazioni/abbonamento" aria-label={frasi.abbTitolo} data-riflesso="no" style={base}>
        <span style={dentro}>
          <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none', background: 'var(--pri-s)', color: 'var(--pri)' }}><Crown size={17} strokeWidth={2} /></span>
          <span>{frasi.abbTitolo}</span>
        </span>
      </Link>
    )
  }

  if (scheda.tipo === 'go') {
    return (
      <Link to="/impostazioni/abbonamento" aria-label={`${frasi.abbTitolo}, ${frasi.abbGoGratis}, ${frasi.abbPassaPlus}`} data-riflesso="si" style={base}>
        {scheda.provaDisponibile ? <span style={{ ...stileBollino, color: 'var(--on-pri)', background: 'var(--pri-solid)', zIndex: 1 }}>{frasi.abbTrentaGiorni}</span> : null}
        <span className="scheda-riflesso" style={{ ...dentro, paddingTop: scheda.provaDisponibile ? 10 : 0 }}>
          <span style={{ width: 40, display: 'flex', justifyContent: 'center', flex: 'none' }}><MarchioGo /></span>
          <span style={colonna}>
            <span style={riga1}>{frasi.abbGoGratis}</span>
            <span style={{ ...riga2, display: 'flex', alignItems: 'center', gap: 2, color: 'var(--plus-cta)', fontWeight: 800 }}>
              {frasi.abbPassaPlus}<ChevronRight size={12} strokeWidth={2.6} aria-hidden style={{ flex: 'none' }} />
            </span>
          </span>
        </span>
      </Link>
    )
  }

  const colore = scheda.tipo === 'prova' ? 'plus' : scheda.tipo
  const prima = scheda.tipo === 'prova' ? frasi.abbProvaPlus : frasi.abbIlTuoPiano
  const seconda = scheda.tipo === 'prova'
    ? (scheda.giorni === 1 ? frasi.abbAncoraGiorno : frasi.abbAncoraGiorni.replace('{{n}}', String(scheda.giorni)))
    : colore === 'plus' ? frasi.abbPlus : colore === 'salone' ? frasi.abbSalone : frasi.abbVip
  return (
    <Link
      to="/impostazioni/abbonamento"
      aria-label={`${frasi.abbTitolo}, ${prima}, ${seconda}`}
      data-riflesso="no"
      style={{ ...base, background: COLORI[colore].sfondo, borderColor: 'transparent', color: '#fff' }}
    >
      <span style={dentro}>
        <span style={{ width: 52, display: 'flex', justifyContent: 'center', flex: 'none' }}><BollinoPiano piano={colore} /></span>
        <span style={colonna}>
          <span style={riga1}>{prima}</span>
          <span style={{ ...riga2, color: COLORI[colore].seconda }}>{seconda}</span>
        </span>
      </span>
    </Link>
  )
}
