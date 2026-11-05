import { ChevronRight, FlaskConical } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useToast } from '../layout/Toast'
import { Button } from '../ui/Button'
import { Card, Row } from '../ui/Card'
import { SectionTitle } from '../ui/SectionTitle'
import { StatusPill } from '../ui/StatusPill'
import { Toggle } from '../ui/Toggle'
import { AttesaRiga } from '../ui/Zampette'
import { callImpostaTour } from '../../data/firebase/client'
import type { ConfigTour } from '../../lib/tourBenvenuto'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import type { Chiave } from '../../i18n/t'
import { vociAvvisami, type ContatoriAdmin, type VoceDaFare } from '../../lib/adminManager'
import type { StatoInvitoBeta } from '../../lib/betaInvito'
import type { FasciaPrezzo } from '../../lib/betaFeedback'
import type { LivelloElenco } from '../../lib/funzioniPiano'
import { eFeature, type FeatureKey } from '../../lib/piano'
import { USER_TEXT } from '../../theme/text'
import { AIUTO, COLORI_LIVELLO, NOME, RIGA, type Frasi } from './comuni'

export type ApriTab = (tab: 'beta' | 'feedback' | 'suggerimenti' | 'saloni', stato?: string) => void

const TITOLO_FUNZIONE: Record<FeatureKey, Chiave> = {
  export: 'pwExportTitolo',
  backupAuto: 'pwBackupAutoTitolo',
  drive: 'pwDriveTitolo',
  messaggiCategoria: 'pwMessaggiCategoriaTitolo',
  copieCloud: 'pwCopieCloudTitolo',
  promemoriaAuto: 'pwPromemoriaAutoTitolo',
  richiamo: 'pwRichiamoTitolo',
  pronto: 'pwProntoTitolo',
  compleanno: 'pwCompleannoTitolo',
  prenotazioni: 'pwPrenotazioniTitolo',
  listaAttesa: 'pwListaAttesaTitolo',
  recensioni: 'pwRecensioniTitolo',
  fedelta: 'pwFedeltaTitolo',
  team: 'pwTeamTitolo',
  postiExtra: 'pwPostiExtraTitolo',
}

/** Nome leggibile di una funzione (Avvisami e feedback): i titoli del paywall, più le due vetrine. */
export function nomeFunzione(frasi: Frasi, chiave: string): string {
  if (chiave === 'piano-plus') return frasi.amVetrinaPlus
  if (chiave === 'piano-salone') return frasi.amVetrinaSalone
  return eFeature(chiave) ? String(frasi[TITOLO_FUNZIONE[chiave]]) : chiave
}

export function nomeFascia(frasi: Frasi, fascia: FasciaPrezzo): string {
  return { 'meno-5': frasi.amFascia1, '5-10': frasi.amFascia2, '10-20': frasi.amFascia3, 'piu-20': frasi.amFascia4 }[fascia]
}

const STATI_PILLOLA: { stato: StatoInvitoBeta; tono: 'prim' | 'ok' | 'bad' | 'neutral' | 'warn'; chiave: Chiave }[] = [
  { stato: 'invitato', tono: 'prim', chiave: 'amInvitati' },
  { stato: 'accettato', tono: 'ok', chiave: 'amInBeta' },
  { stato: 'rifiutato', tono: 'bad', chiave: 'amRifiutati' },
  { stato: 'scaduto', tono: 'neutral', chiave: 'amScaduti' },
  { stato: 'revocato', tono: 'warn', chiave: 'amRevocati' },
]

function Numero({ valore, etichetta, colore, onClick }: { valore: number; etichetta: string; colore?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${etichetta}: ${valore}`}
      style={{ flex: 1, minWidth: 0, minHeight: 56, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 4 }}
    >
      <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: colore ?? '#fff', fontVariantNumeric: 'tabular-nums' }}>{valore}</span>
      <span style={{ fontSize: 11, color: '#C9D6EE', ...USER_TEXT }}>{etichetta}</span>
    </button>
  )
}

export function PanoramicaAdmin({
  tour,
  contatori,
  errore,
  onRiprova,
  daFare,
  nomeDi,
  apri,
  onSalone,
  onEstendi30,
  riepilogoAccount,
}: {
  /** Da config/globale: l'admin non ha il salone da cui `usePiano` la legge. Finché manca, niente interruttore. */
  tour?: ConfigTour
  contatori: ContatoriAdmin | null
  errore: boolean
  onRiprova: () => void
  daFare: readonly VoceDaFare[]
  nomeDi: (salonId: string) => string
  apri: ApriTab
  onSalone: (salonId: string) => void
  onEstendi30: (salonId: string) => void
  riepilogoAccount: string
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()

  function rigaDaFare(voce: VoceDaFare): { titolo: string; aiuto?: string; azione: () => void; extra?: ReactNode } {
    if (voce.tipo === 'invito-scade') {
      return {
        titolo: frasi.amNonHaRisposto.replace('{{salone}}', nomeDi(voce.salonId)),
        aiuto: frasi.amInvitoScadeTra.replace('{{n}}', String(voce.giorni)),
        azione: () => onSalone(voce.salonId),
      }
    }
    if (voce.tipo === 'beta-finisce') {
      return {
        titolo: frasi.amBetaFinisce.replace('{{salone}}', nomeDi(voce.salonId)).replace('{{data}}', dataCorta(lingua, new Date(voce.data))),
        azione: () => onSalone(voce.salonId),
        extra: (
          <Button variant="tonal" size="sm" style={{ flex: 'none', background: 'var(--plus-s, #F0E9FD)', color: 'var(--plus-ink, #5A2BC0)', border: 0 }} onClick={() => onEstendi30(voce.salonId)}>
            {frasi.amPiu30}
          </Button>
        ),
      }
    }
    if (voce.tipo === 'feedback') {
      const paga = voce.pagheresti === 'no' ? frasi.amNonPagherebbe : frasi.amPagherebbeBreve.replace('{{fascia}}', voce.quanto ? nomeFascia(frasi, voce.quanto) : (voce.pagheresti === 'si' ? frasi.amSi : frasi.amForse).toLowerCase())
      return {
        titolo: frasi.amNuovoFeedback.replace('{{salone}}', nomeDi(voce.salonId)),
        aiuto: `${voce.voto} ★ · ${paga}`,
        azione: () => apri('feedback'),
      }
    }
    return { titolo: voce.n === 1 ? frasi.amSuggerimentoDaVedere : frasi.amSuggerimentiDaVedere.replace('{{n}}', String(voce.n)), azione: () => apri('suggerimenti') }
  }

  return (
    <>
      {errore ? (
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <span style={{ flex: 1, ...USER_TEXT }}>{frasi.amNumeriKo}</span>
            <Button variant="secondary" size="sm" onClick={onRiprova}>{frasi.amRiprova}</Button>
          </Row>
        </Card>
      ) : !contatori ? <AttesaRiga testo={frasi.uteCarica} /> : (
        <div className="am-scuro" style={{ borderRadius: 14, padding: '10px 8px 8px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '0 6px 6px' }}>
            <FlaskConical size={14} aria-hidden />
            {frasi.amBeta}
          </div>
          <div style={{ display: 'flex' }}>
            <Numero valore={contatori.inviti.invitato} etichetta={frasi.amInvitati} onClick={() => apri('beta', 'invitato')} />
            <Numero valore={contatori.inBeta ?? contatori.inviti.accettato} etichetta={frasi.amInBeta} onClick={() => apri('beta', 'accettato')} />
            <Numero valore={contatori.feedback.totali} etichetta={frasi.amTabFeedback} onClick={() => apri('feedback')} />
            <Numero valore={contatori.feedback.pagheresti.si} etichetta={frasi.amPagherebbero} colore="#4FCB8F" onClick={() => apri('feedback')} />
          </div>
        </div>
      )}

      <SectionTitle tone="warn" count={daFare.length}>{frasi.amDaFare}</SectionTitle>
      <Card>
        {daFare.length === 0 ? (
          <Row style={{ borderTop: 'none' }}><span style={{ color: 'var(--tx3)', ...USER_TEXT }}>{frasi.amNienteDaFare}</span></Row>
        ) : daFare.map((voce, index) => {
          const r = rigaDaFare(voce)
          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: index === 0 ? 'none' : '1px solid var(--line)', paddingRight: r.extra ? 8 : 0 }}>
              <button type="button" onClick={r.azione} style={{ ...RIGA, borderTop: 'none', flex: 1 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={NOME}>{r.titolo}</span>
                  {r.aiuto ? <span style={AIUTO}>{r.aiuto}</span> : null}
                </span>
                {r.extra ? null : <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />}
              </button>
              {r.extra}
            </div>
          )
        })}
      </Card>

      {contatori ? <BloccoSaloni contatori={contatori} riepilogoAccount={riepilogoAccount} /> : null}
      {contatori ? <BloccoAvvisami avvisami={contatori.avvisami} /> : null}

      {contatori ? (
        <>
          <SectionTitle>{frasi.amInvitiStato}</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 6 }}>
            {STATI_PILLOLA.map(({ stato, tono, chiave }) => (
              <button
                key={stato}
                type="button"
                onClick={() => apri('beta', stato)}
                style={{ border: 0, background: 'transparent', padding: 0, minHeight: 44, display: 'inline-flex', alignItems: 'center', font: 'inherit', cursor: 'pointer' }}
              >
                <StatusPill tone={tono}>{`${String(frasi[chiave])} ${contatori.inviti[stato]}`}</StatusPill>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <SectionTitle>{frasi.uteImpostazioniUtenti}</SectionTitle>
      {tour ? <CardTour tour={tour} /> : null}
    </>
  )
}

function BloccoSaloni({ contatori, riepilogoAccount }: { contatori: ContatoriAdmin; riepilogoAccount: string }) {
  const frasi = useFrasi()
  const { saloni, perPiano, perFonte } = contatori
  const totaleBarra = (Object.values(perPiano) as number[]).reduce((a, b) => a + b, 0)
  const pct = (n: number) => (saloni.totali > 0 ? Math.round((n / saloni.totali) * 100) : 0)
  const nomi: Record<LivelloElenco, string> = { base: 'Go', pro: 'Plus', salone: 'Salon', vip: 'VIP' }
  const fonti = [
    [frasi.amFonteBeta, perFonte.beta],
    [frasi.amFonteProva, perFonte.prova],
    [frasi.amFonteManuale, perFonte.manuale],
    [frasi.amFonteOmaggio, perFonte.omaggio],
    [frasi.amFontePlay, perFonte.play],
  ] as const
  return (
    <Card style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{saloni.totali}</span>
        <span style={{ fontWeight: 700 }}>{frasi.amNSaloni.replace('{{n}}', '').trim()}</span>
      </div>
      {riepilogoAccount ? <span style={AIUTO}>{riepilogoAccount}</span> : null}
      <div style={{ display: 'flex', gap: 12 }}>
        {([[frasi.amAttivi7, saloni.attivi7], [frasi.amAttivi30, saloni.attivi30]] as const).map(([etichetta, n]) => (
          <div key={etichetta} style={{ flex: 1, minWidth: 0 }}>
            <span style={AIUTO}>{etichetta}</span>
            <span style={{ fontWeight: 800 }}>{n}</span> <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{pct(n)}%</span>
          </div>
        ))}
      </div>
      {totaleBarra > 0 ? (
        <div aria-hidden style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--surf3)' }}>
          {(['base', 'pro', 'salone', 'vip'] as const).map((l) => (
            <span key={l} style={{ width: `${(perPiano[l] / totaleBarra) * 100}%`, background: COLORI_LIVELLO[l] }} />
          ))}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', fontSize: 12, color: 'var(--tx2)' }}>
        {(['base', 'pro', 'salone', 'vip'] as const).map((l) => (
          <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: COLORI_LIVELLO[l] }} />
            {`${nomi[l]} ${perPiano[l]}`}
          </span>
        ))}
      </div>
      <span style={AIUTO}>{`${frasi.amFonti}: ${fonti.map(([n, v]) => `${n} ${v}`).join(' · ')}`}</span>
    </Card>
  )
}

function BloccoAvvisami({ avvisami }: { avvisami: Record<string, number> }) {
  const frasi = useFrasi()
  const voci = vociAvvisami(avvisami)
  const tutte = vociAvvisami(avvisami, Number.POSITIVE_INFINITY)
  const totale = tutte.reduce((a, v) => a + v.n, 0)
  const plus = tutte.filter((v) => v.piano === 'plus').reduce((a, v) => a + v.n, 0)
  const massimo = voci[0]?.n ?? 1
  return (
    <Card style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontWeight: 800, flex: 1 }}>{`${frasi.amAvvisami} · ${totale}`}</span>
        <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{frasi.amAvvisamiPiani.replace('{{plus}}', String(plus)).replace('{{salone}}', String(totale - plus))}</span>
      </div>
      {voci.length === 0 ? <span style={AIUTO}>{frasi.amNessunAvvisami}</span> : voci.map((v) => (
        <div key={v.chiave} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr) 24px', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={USER_TEXT}>{nomeFunzione(frasi, v.chiave)}</span>
          <span aria-hidden style={{ height: 8, borderRadius: 999, background: 'var(--surf3)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${(v.n / massimo) * 100}%`, background: v.piano === 'plus' ? COLORI_LIVELLO.pro : COLORI_LIVELLO.salone, borderRadius: 999 }} />
          </span>
          <span style={{ fontWeight: 700, textAlign: 'right' }}>{v.n}</span>
        </div>
      ))}
    </Card>
  )
}

// Tour di benvenuto: la logica ottimistica di «Utenti Groomly», invariata.
function CardTour({ tour }: { tour: ConfigTour }) {
  const frasi = useFrasi()
  const toast = useToast()
  const [tourOttimistico, setTourOttimistico] = useState<boolean | null>(null)
  const tourAcceso = tourOttimistico ?? tour.acceso
  // Mentre la callable è in volo il tocco si ignora (ogni accensione riscrive `dal`)
  const [tourInVolo, setTourInVolo] = useState(false)
  useEffect(() => { setTourOttimistico(null) }, [tour.acceso])

  async function cambiaTour(next: boolean) {
    if (tourInVolo) return
    setTourInVolo(true)
    setTourOttimistico(next)
    try {
      await callImpostaTour(next)
    } catch {
      setTourOttimistico(null)
      toast.show(frasi.authSalvataggio, 'plain')
    } finally {
      setTourInVolo(false)
    }
  }

  return (
    <Card>
      <Row style={{ borderTop: 'none' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, ...USER_TEXT }}>{frasi.uteTourTitolo}</div>
          <div style={{ fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }}>{frasi.uteTourAiuto}</div>
        </div>
        <Toggle checked={tourAcceso} disabled={tourInVolo} label={frasi.uteTourTitolo} onChange={(next) => { void cambiaTour(next) }} />
      </Row>
    </Card>
  )
}
