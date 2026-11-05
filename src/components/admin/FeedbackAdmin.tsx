import { Capacitor } from '@capacitor/core'
import { Mail, Star } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { SearchBar } from '../ui/SearchBar'
import { SectionTitle } from '../ui/SectionTitle'
import { Segmented } from '../ui/Segmented'
import { StatusPill } from '../ui/StatusPill'
import { AttesaRiga } from '../ui/Zampette'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { funzioniDelPiano, riepilogoFeedback, type FeedbackLetto } from '../../lib/adminManager'
import { GIUDIZI_FUNZIONE, type GiudizioFunzione } from '../../lib/betaFeedback'
import { nomeFileFeedback, pdfSuggerimenti, xlsxTabella } from '../../lib/esportaSuggerimenti'
import { vistaFunzione, type FeatureKey } from '../../lib/piano'
import { downloadAnchor, isShareCancel, shareFiles } from '../../lib/shareFile'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'
import { AIUTO, NOME, RIGA, type Frasi } from './comuni'
import { nomeFascia, nomeFunzione } from './PanoramicaAdmin'

type FiltroPiano = 'tutti' | 'pro' | 'salone'
type Formato = 'pdf' | 'xlsx'

const TUTTE_LE_FUNZIONI: FeatureKey[] = [
  'prenotazioni', 'listaAttesa', 'promemoriaAuto', 'messaggiCategoria', 'pronto', 'fedelta', 'recensioni', 'richiamo',
  'compleanno', 'export', 'backupAuto', 'drive', 'copieCloud', 'team', 'postiExtra',
].filter((f) => vistaFunzione(f as FeatureKey) !== 'nascosta') as FeatureKey[]

const COLORE_GIUDIZIO: Record<GiudizioFunzione, string> = { utile: 'var(--ok)', 'poco-utile': 'var(--warn)', 'non-usata': 'var(--surf3)' }

function nomeRisposta(frasi: Frasi, f: FeedbackLetto): string {
  const base = f.pagheresti === 'si' ? frasi.amSi : f.pagheresti === 'forse' ? frasi.amForse : frasi.amNo
  return f.quanto ? `${base.toLowerCase()} · ${nomeFascia(frasi, f.quanto)}` : base.toLowerCase()
}

function Stelle({ voto, dimensione = 13 }: { voto: number; dimensione?: number }) {
  return (
    <span role="img" aria-label={`${voto} ★`} style={{ display: 'inline-flex', gap: 1, color: '#E3A008' }}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={dimensione} strokeWidth={2} fill={n <= voto ? 'currentColor' : 'none'} aria-hidden />)}
    </span>
  )
}

/** Riga di un feedback: salone e data, stelle, piano, pagheresti, citazioni. */
export function RigaFeedback({ feedback: f, nome, primo, onApri }: { feedback: FeedbackLetto; nome: string; primo: boolean; onApri?: () => void }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const contenuto = (
    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        {nome !== '' ? <span style={{ ...NOME, flex: 1 }}>{nome}</span> : <span style={{ flex: 1 }} />}
        <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{dataCorta(lingua, new Date(f.creatoIl))}</span>
        {f.ricontatto ? <Mail size={14} aria-label={frasi.amRicontatto} color="var(--pri)" /> : null}
      </span>
      <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Stelle voto={f.voto} />
        <span style={{ fontSize: 12, fontWeight: 700, color: f.piano === 'pro' ? '#7B3FE4' : '#B07F00' }}>{f.piano === 'pro' ? 'Plus' : 'Salon'}</span>
        <StatusPill tone={f.pagheresti === 'si' ? 'ok' : f.pagheresti === 'forse' ? 'warn' : 'bad'}>{frasi.amPagherebbePill.replace('{{risposta}}', nomeRisposta(frasi, f))}</StatusPill>
      </span>
      {f.nonVa.trim() !== '' ? <span style={{ borderLeft: '3px solid var(--line2)', paddingLeft: 8, fontSize: 13, color: 'var(--tx2)', ...USER_TEXT }}>{f.nonVa}</span> : null}
      {f.manca.trim() !== '' ? <span style={{ borderLeft: '3px solid var(--pri)', paddingLeft: 8, fontSize: 13, color: 'var(--tx2)', ...USER_TEXT }}>{frasi.amManca.replace('{{testo}}', f.manca)}</span> : null}
    </span>
  )
  const stile = { ...RIGA, borderTop: primo ? 'none' : RIGA.borderTop, alignItems: 'flex-start' as const, cursor: onApri ? 'pointer' : 'default' }
  return onApri
    ? <button type="button" onClick={onApri} style={stile}>{contenuto}</button>
    : <div style={stile}>{contenuto}</div>
}

export function FeedbackAdmin({
  feedback,
  pronti,
  errore,
  nomeDi,
}: {
  feedback: readonly FeedbackLetto[]
  pronti: boolean
  errore: boolean
  nomeDi: (salonId: string) => string
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const [piano, setPiano] = useState<FiltroPiano>('tutti')
  const [cerca, setCerca] = useState('')
  const [esporta, setEsporta] = useState(false)
  const [formato, setFormato] = useState<Formato>('xlsx')
  const [occupato, setOccupato] = useState(false)
  const [esportaKo, setEsportaKo] = useState(false)

  if (errore) return <p style={{ margin: 0 }}>{frasi.amFeedbackKo}</p>
  if (!pronti) return <AttesaRiga testo={frasi.uteCarica} />

  const perPiano = (p: FiltroPiano) => feedback.filter((f) => p === 'tutti' || f.piano === p)
  const testo = cerca.trim().toLowerCase()
  const visibili = perPiano(piano).filter((f) => testo === '' || nomeDi(f.salonId).toLowerCase().includes(testo))
  const r = riepilogoFeedback(visibili)
  const funzioni = funzioniDelPiano(piano, r.funzioni, TUTTE_LE_FUNZIONI)
  const totPaga = r.pagheresti.si + r.pagheresti.forse + r.pagheresti.no
  const fasce = (Object.entries(r.quanto) as [keyof typeof r.quanto, number][]).filter(([, n]) => n > 0)

  async function esportaFile() {
    if (occupato || visibili.length === 0) return
    setOccupato(true)
    setEsportaKo(false)
    try {
      const data = (iso: string) => dataCorta(lingua, new Date(iso))
      const risposta = (f: FeedbackLetto) => (f.pagheresti === 'si' ? frasi.amSi : f.pagheresti === 'forse' ? frasi.amForse : frasi.amNo)
      const blob = formato === 'pdf'
        ? pdfSuggerimenti(frasi.amFeedbackFile, visibili.map((f) => ({
          stato: `${nomeDi(f.salonId)} · ${data(f.creatoIl)} · ${f.voto} ★ · ${f.piano === 'pro' ? 'Plus' : 'Salon'}`,
          testo: frasi.amPagherebbePill.replace('{{risposta}}', nomeRisposta(frasi, f)),
          persone: [
            f.nonVa.trim() !== '' ? `${frasi.amColNonVa}: ${f.nonVa}` : '',
            f.manca.trim() !== '' ? `${frasi.amColManca}: ${f.manca}` : '',
            ...(Object.entries(f.funzioni) as [FeatureKey, GiudizioFunzione][]).map(([k, g]) => `${nomeFunzione(frasi, k)}: ${giudizio(frasi, g)}`),
          ].filter((riga) => riga !== ''),
        })))
        : await xlsxTabella(
          frasi.amFeedbackFile,
          [frasi.amColData, frasi.amColSalone, frasi.amColPiano, frasi.amColVoto, frasi.amColPagheresti, frasi.amColQuanto, frasi.amColRicontatto, frasi.amColFineBeta, frasi.amColNonVa, frasi.amColManca, ...TUTTE_LE_FUNZIONI.map((k) => nomeFunzione(frasi, k)), frasi.amColVersione],
          visibili.map((f) => [
            data(f.creatoIl), nomeDi(f.salonId), f.piano === 'pro' ? 'Plus' : 'Salon', f.voto, risposta(f), f.quanto ? nomeFascia(frasi, f.quanto) : '',
            f.ricontatto ? frasi.amSi : frasi.amNo, f.fineBeta ? frasi.amSi : frasi.amNo, f.nonVa, f.manca,
            ...TUTTE_LE_FUNZIONI.map((k) => (f.funzioni[k] ? giudizio(frasi, f.funzioni[k]) : '')), f.versioneApp,
          ]),
        )
      const nome = nomeFileFeedback(new Date(), formato)
      if (Capacitor.isNativePlatform()) await shareFiles([{ blob, name: nome }], frasi.amFeedbackFile)
      else downloadAnchor(blob, nome)
      setEsporta(false)
    } catch (caught) {
      if (!isShareCancel(caught)) setEsportaKo(true)
    } finally {
      setOccupato(false)
    }
  }

  return (
    <>
      <Segmented
        fill
        label={frasi.amPiano}
        value={piano}
        onChange={setPiano}
        options={[
          { value: 'tutti', label: frasi.amTuttiN.replace('{{n}}', String(feedback.length)) },
          { value: 'pro', label: frasi.amPlusN.replace('{{n}}', String(perPiano('pro').length)) },
          { value: 'salone', label: frasi.amSaloneN.replace('{{n}}', String(perPiano('salone').length)) },
        ]}
      />
      <SearchBar mode="input" placeholder={frasi.amCercaSalone} value={cerca} onChange={setCerca} />
      {visibili.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{frasi.amNessunFeedback}</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
            <Card style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={AIUTO}>{frasi.amVotoMedio}</span>
              <span aria-label={`${frasi.amVotoMedio}: ${r.media ?? 0}`} style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{(r.media ?? 0).toLocaleString(lingua)}</span>
              <Stelle voto={Math.round(r.media ?? 0)} dimensione={12} />
              {([5, 4, 3, 2, 1] as const).map((v) => (
                <span key={v} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--tx3)' }}>
                  <span style={{ width: 8 }}>{v}</span>
                  <span aria-hidden style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--surf3)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${(r.voti[v] / Math.max(1, r.totale)) * 100}%`, background: '#E3A008' }} />
                  </span>
                  <span style={{ width: 14, textAlign: 'right' }}>{r.voti[v]}</span>
                </span>
              ))}
            </Card>
            <Card style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={AIUTO}>{frasi.amPagheresti}</span>
              <span aria-hidden style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--surf3)' }}>
                <span style={{ width: `${(r.pagheresti.si / Math.max(1, totPaga)) * 100}%`, background: 'var(--ok)' }} />
                <span style={{ width: `${(r.pagheresti.forse / Math.max(1, totPaga)) * 100}%`, background: 'var(--warn)' }} />
                <span style={{ width: `${(r.pagheresti.no / Math.max(1, totPaga)) * 100}%`, background: 'var(--bad)' }} />
              </span>
              <span style={{ fontSize: 12, ...USER_TEXT }}>{`${frasi.amSi} ${r.pagheresti.si} · ${frasi.amForse} ${r.pagheresti.forse} · ${frasi.amNo} ${r.pagheresti.no}`}</span>
              {fasce.length > 0 ? (
                <span style={{ fontSize: 12, color: 'var(--tx3)', ...USER_TEXT }}>
                  {`${frasi.amQuantoMese}: ${fasce.map(([fascia, n]) => `${nomeFascia(frasi, fascia)} (${n})`).join(' · ')}`}
                </span>
              ) : null}
            </Card>
          </div>

          <SectionTitle>{frasi.amFunzioni}</SectionTitle>
          <Card style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ ...AIUTO, fontSize: 12 }}>{frasi.amFunzioniUso}</span>
            {funzioni.map((k) => {
              const conta = r.funzioni[k] ?? { utile: 0, 'poco-utile': 0, 'non-usata': 0 }
              const tot = conta.utile + conta['poco-utile'] + conta['non-usata']
              return (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                    <span style={{ flex: 1, ...USER_TEXT }}>{nomeFunzione(frasi, k)}</span>
                    <span style={{ fontWeight: 700, color: 'var(--ok)' }}>{frasi.amUtileN.replace('{{n}}', String(conta.utile))}</span>
                  </span>
                  <span aria-hidden style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--surf2)' }}>
                    {GIUDIZI_FUNZIONE.map((g) => <span key={g} style={{ width: `${tot ? (conta[g] / tot) * 100 : 0}%`, background: COLORE_GIUDIZIO[g] }} />)}
                  </span>
                </div>
              )
            })}
          </Card>

          <Button variant="secondary" style={{ width: '100%' }} onClick={() => { setEsportaKo(false); setEsporta(true) }}>{frasi.amEsporta}</Button>
        </>
      )}
      <Dialog open={esporta} title={frasi.amEsporta} onClose={() => setEsporta(false)}>
        <Segmented
          fill
          label={frasi.sugFormato}
          value={formato}
          onChange={setFormato}
          options={[{ value: 'pdf', label: frasi.sugPdf }, { value: 'xlsx', label: frasi.sugExcel }]}
        />
        <p style={{ margin: 0 }}>{frasi.amFeedbackFileN.replace('{{n}}', String(visibili.length))}</p>
        {esportaKo ? <p style={{ margin: 0 }}>{frasi.sugEsportaKo}</p> : null}
        <div style={{ display: 'flex', gap: 8, paddingTop: SIZES.row.padY }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setEsporta(false)}>{frasi.uteAnnulla}</Button>
          <Button style={{ flex: 1 }} disabled={occupato || visibili.length === 0} onClick={() => { void esportaFile() }}>{frasi.sugEsporta}</Button>
        </div>
      </Dialog>
    </>
  )
}

function giudizio(frasi: Frasi, g: GiudizioFunzione): string {
  const [utile, poco, no] = frasi.amFunzioniUso.split(' · ')
  return g === 'utile' ? utile : g === 'poco-utile' ? poco : no
}
