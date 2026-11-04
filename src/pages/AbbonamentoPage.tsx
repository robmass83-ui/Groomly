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
import { PersoneCollegate } from '../components/team/PersoneCollegate'
import { useSession } from '../hooks/useSession'
import { usePiano } from '../hooks/usePiano'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import type { Chiave } from '../i18n/t'
import { haAccesso } from '../lib/piano'
import { COLORE_PIANO, LINK_PLAY_ABBONAMENTI, PREZZI, avvisoPiano, ePianoVetrina, pianoAttivo, pianoInCorso, type PianoVetrina } from '../lib/abbonamento'
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
  const { lingua } = useLingua()
  const { livelloNome, stato, pronto } = usePiano()
  const session = useSession()
  const ruolo = session.gate.kind === 'in' ? session.gate.account.role : undefined
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const titolareDelSalone = !!account && ruolo !== 'socio' && ruolo !== 'collaboratore' && (account.salonId ?? account.uid) === account.uid
  // Solo a sessione pronta: prima il ruolo non è noto e l'avviso lampeggerebbe a soci e collaboratori.
  const avviso = session.gate.kind === 'in' ? avvisoPiano(stato, ruolo !== 'socio' && ruolo !== 'collaboratore') : null
  return (
    <ShellFrame>
      <Header title={frasi.abbTitolo} backTo="/impostazioni" />
      <div style={{ ...pagina, gap: 12 }}>
        {avviso ? (
          <p style={{ margin: 0, fontSize: TYPE.meta, fontWeight: 700, color: 'var(--tx)' }}>
            {avviso.tipo === 'grazia' ? (
              <>
                {frasi.abbGrazia}{' · '}
                <a href={LINK_PLAY_ABBONAMENTI} target="_blank" rel="noreferrer" style={{ color: 'var(--pri)' }}>{frasi.abbGraziaLink}</a>
              </>
            ) : frasi.abbDisdetto.replace('{{data}}', avviso.fine.toLocaleDateString(lingua))}
          </p>
        ) : null}
        {SCHEDE.map(({ piano, nome, frase, icona }) => {
          const attivo = pianoInCorso(livelloNome) === piano
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
        {account && titolareDelSalone && pronto !== false && !haAccesso(stato, 'team') ? <PersoneCollegate salonId={account.uid} /> : null}
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
