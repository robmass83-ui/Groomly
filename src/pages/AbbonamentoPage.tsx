import type { CSSProperties } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import iconaGo from '../assets/brand/groomly-icon.svg'
import iconaPlus from '../assets/brand/groomly-plus-icon-tonda.svg'
import iconaSalone from '../assets/brand/groomly-salon-icon-tonda.svg'
import { BloccoGo, BloccoPlus, BloccoSalone } from '../components/abbonamento/BlocchiPiano'
import { TestataPiano, Vetrina } from '../components/abbonamento/Vetrina'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { usePiano } from '../hooks/usePiano'
import { useFrasi } from '../i18n/LinguaContext'
import type { Chiave } from '../i18n/t'
import { COLORE_PIANO, PREZZI, ePianoVetrina, pianoAttivo, type PianoVetrina } from '../lib/abbonamento'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const SCHEDE: { piano: PianoVetrina; nome: Chiave; frase: Chiave; icona: string }[] = [
  { piano: 'go', nome: 'abbGo', frase: 'abbGoFrase', icona: iconaGo },
  { piano: 'plus', nome: 'abbPlus', frase: 'abbPlusFrase', icona: iconaPlus },
  { piano: 'salone', nome: 'abbSalone', frase: 'abbSaloneFrase', icona: iconaSalone },
]

const scheda: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  background: 'var(--card)',
  border: `${SIZES.card.border}px solid var(--line)`,
  borderRadius: 18,
  boxShadow: 'var(--sh-2)',
  overflow: 'hidden',
  color: 'inherit',
  textDecoration: 'none',
}

const pagina: CSSProperties = { padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap, paddingBottom: 128 }

export function AbbonamentoPage() {
  const frasi = useFrasi()
  const { livelloNome } = usePiano()
  return (
    <ShellFrame>
      <Header title={frasi.abbTitolo} backTo="/impostazioni" />
      <div style={{ ...pagina, gap: 12 }}>
        {SCHEDE.map(({ piano, nome, frase, icona }) => {
          const attivo = pianoAttivo(livelloNome, piano)
          return (
            <Link key={piano} to={`/impostazioni/abbonamento/${piano}`} style={scheda}>
              <span aria-hidden style={{ width: 8, flex: 'none', background: COLORE_PIANO[piano] }} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                <img alt="" src={icona} style={{ width: 48, height: 48, borderRadius: 24, flex: 'none', transform: piano === 'go' ? undefined : 'scale(1.2)' }} />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{frasi[nome]}</span>
                  <small style={{ color: 'var(--tx2)', fontSize: TYPE.meta }}>{frasi[frase]}</small>
                </span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: TYPE.meta, fontWeight: 800, color: attivo ? 'var(--ok)' : COLORE_PIANO[piano] }}>
                  {attivo ? frasi.abbAttivo : piano === 'go' ? frasi.abbGratis : (
                    <>
                      {PREZZI[piano]}
                      <small style={{ display: 'block', fontWeight: 500, color: 'var(--tx2)' }}>{frasi.abbAlMese.replace('{{prezzo}}', '').trim()}</small>
                    </>
                  )}
                </span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
              </span>
            </Link>
          )
        })}
      </div>
    </ShellFrame>
  )
}

export function PianoAbbonamentoPage() {
  const frasi = useFrasi()
  const { piano } = useParams()
  const { livelloNome } = usePiano()
  if (!ePianoVetrina(piano)) return <Navigate to="/impostazioni/abbonamento" replace />
  if (piano === 'go') {
    return (
      <ShellFrame>
        <Header title={frasi.abbGo} backTo="/impostazioni/abbonamento" />
        <div style={pagina}>
          <BloccoGo />
        </div>
      </ShellFrame>
    )
  }
  if (!pianoAttivo(livelloNome, piano)) {
    return (
      <PhoneShell showFab={false}>
        <Vetrina piano={piano} />
      </PhoneShell>
    )
  }
  return (
    <ShellFrame>
      <TestataPiano piano={piano}>
        <span style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,.95)', color: COLORE_PIANO[piano], fontWeight: 800 }}>{frasi.abbAttivo}</span>
      </TestataPiano>
      <div style={pagina}>
        <BloccoPlus />
        {piano === 'salone' ? <BloccoSalone /> : null}
      </div>
    </ShellFrame>
  )
}
