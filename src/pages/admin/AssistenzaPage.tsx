import { Capacitor } from '@capacitor/core'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAdminDati } from '../../components/admin/AdminDati'
import { AIUTO, NOME, RIGA } from '../../components/admin/comuni'
import { useEtichettaCategoria } from '../../components/admin/etichettaCategoria'
import { FeedbackAdmin } from '../../components/admin/FeedbackAdmin'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { Dialog } from '../../components/layout/Dialog'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SearchBar } from '../../components/ui/SearchBar'
import { Segmented } from '../../components/ui/Segmented'
import { StatusPill } from '../../components/ui/StatusPill'
import { AttesaRiga } from '../../components/ui/Zampette'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { filtraRichieste, STATI_ASSISTENZA, type FonteAssistenza, type StatoAssistenza } from '../../lib/assistenza'
import { nomeFileSuggerimenti, pdfSuggerimenti, xlsxSuggerimenti } from '../../lib/esportaSuggerimenti'
import { PERCORSO_ASSISTENZA } from '../../lib/percorsoAdmin'
import { downloadAnchor, isShareCancel, shareFiles } from '../../lib/shareFile'
import { USER_TEXT } from '../../theme/text'
import { CORPO } from './comune'

type FiltroStato = StatoAssistenza | 'tutte'
type FiltroFonte = 'tutte' | 'suggerimenti' | 'feedback'
type Formato = 'pdf' | 'xlsx'

const TONO: Record<StatoAssistenza, 'bad' | 'warn' | 'ok'> = { nuovo: 'bad', 'in-corso': 'warn', risolto: 'ok' }

export function useNomeStato(): Record<StatoAssistenza, string> {
  const frasi = useFrasi()
  return { nuovo: frasi.consStatoNuovo, 'in-corso': frasi.consStatoInCorso, risolto: frasi.consStatoRisolto }
}

function fonteDi(valore: string | null): FiltroFonte {
  return valore === 'suggerimenti' || valore === 'feedback' ? valore : 'tutte'
}

const FONTE: Record<FiltroFonte, FonteAssistenza | null> = { tutte: null, suggerimenti: 'suggerimento', feedback: 'feedback' }

export function AssistenzaPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const nomeStato = useNomeStato()
  const etichettaCategoria = useEtichettaCategoria()
  const [params, setParams] = useSearchParams()
  const { richieste, richiestePronte, erroreAssistenza, nomeDi, feedback, feedbackPronti, erroreFeedback } = useAdminDati()
  const [cerca, setCerca] = useState('')
  const [esporta, setEsporta] = useState(false)
  const [formato, setFormato] = useState<Formato>('pdf')
  const [occupato, setOccupato] = useState(false)
  const [esportaKo, setEsportaKo] = useState(false)

  const fonte = fonteDi(params.get('fonte'))
  const categoria = params.get('cat') ?? ''
  const stato: FiltroStato = [...STATI_ASSISTENZA, 'tutte' as const].find((s) => s === params.get('stato')) ?? 'nuovo'
  const base = { fonte: FONTE[fonte], categoria, cerca }
  const visibili = filtraRichieste(richieste, { ...base, stato }, nomeDi)
  const conta = (s: FiltroStato) => filtraRichieste(richieste, { ...base, stato: s }, nomeDi).length
  const categorie = [...new Set(richieste.filter((r) => r.categoria !== '').map((r) => r.categoria))]

  function cambia(chiave: string, valore: string) {
    const prossimi = new URLSearchParams(params)
    if (valore === '') prossimi.delete(chiave)
    else prossimi.set(chiave, valore)
    if (chiave === 'fonte') prossimi.delete('cat')
    setParams(prossimi, { replace: true })
  }

  const data = (quando: string) => (quando ? dataCorta(lingua, new Date(quando)) : '')
  const nomeCategoria = (id: string) => (id === '' ? frasi.consFonteFeedback : etichettaCategoria(id))

  async function esportaFile() {
    if (occupato || visibili.length === 0) return
    setOccupato(true)
    setEsportaKo(false)
    try {
      const blob = formato === 'pdf'
        ? pdfSuggerimenti(frasi.consAssistenza, visibili.map((r) => ({
          stato: `${nomeStato[r.stato]} · ${nomeCategoria(r.categoria)}`,
          testo: r.testo,
          persone: [[r.email, nomeDi(r.salonId), data(r.quando)].filter((p) => p !== '').join(' · ')],
        })))
        : await xlsxSuggerimenti(
          [frasi.sugStato, frasi.sugCategoria, frasi.sugSuggerimento, frasi.sugVolte, frasi.sugEmail, frasi.sugToelettatura, frasi.sugData],
          visibili.map((r) => ({ stato: nomeStato[r.stato], categoria: nomeCategoria(r.categoria), testo: r.testo, volte: 1, email: r.email, salone: nomeDi(r.salonId), data: data(r.quando) })),
        )
      const nome = nomeFileSuggerimenti(new Date(), formato)
      if (Capacitor.isNativePlatform()) await shareFiles([{ blob, name: nome }], frasi.consAssistenza)
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
      <TestataAdmin
        titolo={frasi.consAssistenza}
        azione={<Button variant="secondary" size="sm" onClick={() => { setEsportaKo(false); setEsporta(true) }}>{frasi.sugEsporta}</Button>}
      />
      <div style={{ ...CORPO, maxWidth: 900 }}>
        <Segmented
          fill
          label={frasi.consStato}
          value={stato}
          onChange={(valore) => cambia('stato', valore === 'nuovo' ? '' : valore)}
          options={[
            ...STATI_ASSISTENZA.map((s) => ({ value: s as FiltroStato, label: `${nomeStato[s]} ${conta(s)}` })),
            { value: 'tutte' as const, label: frasi.consTutte },
          ]}
        />
        <Segmented
          fill
          label={frasi.consFonte}
          value={fonte}
          onChange={(valore) => cambia('fonte', valore === 'tutte' ? '' : valore)}
          options={[
            { value: 'tutte', label: frasi.consTutte },
            { value: 'suggerimenti', label: frasi.consFonteSuggerimenti },
            { value: 'feedback', label: frasi.consFonteFeedback },
          ]}
        />
        {fonte !== 'feedback' && categorie.length > 0 ? (
          <select aria-label={frasi.sugCategoria} value={categoria} onChange={(e) => cambia('cat', e.target.value)} style={{ font: 'inherit', minHeight: 40, padding: '0 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--tx)' }}>
            <option value="">{frasi.consTutte}</option>
            {categorie.map((c) => <option key={c} value={c}>{etichettaCategoria(c)}</option>)}
          </select>
        ) : null}
        <SearchBar mode="input" placeholder={frasi.amCercaSalone} value={cerca} onChange={setCerca} />
        {erroreAssistenza ? <p style={{ margin: 0 }}>{frasi.consAssistenzaKo}</p> : !richiestePronte ? <AttesaRiga testo={frasi.uteCarica} /> : visibili.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{frasi.consNessunaRichiesta}</p> : (
          <Card>
            {visibili.map((r, indice) => (
              <Link key={r.chiave} to={`${PERCORSO_ASSISTENZA}/${encodeURIComponent(r.chiave)}`} style={{ ...RIGA, borderTop: indice === 0 ? 'none' : RIGA.borderTop, alignItems: 'flex-start', textDecoration: 'none' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...NOME, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.testo || nomeCategoria(r.categoria)}</span>
                  <span style={AIUTO}>{[nomeDi(r.salonId), nomeCategoria(r.categoria), data(r.quando)].filter((p) => p !== '').join(' · ')}</span>
                </span>
                <StatusPill tone={TONO[r.stato]}>{nomeStato[r.stato]}</StatusPill>
                <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
              </Link>
            ))}
          </Card>
        )}
        {fonte === 'feedback' ? <FeedbackAdmin feedback={feedback} pronti={feedbackPronti} errore={erroreFeedback} nomeDi={nomeDi} /> : null}
      </div>
      <Dialog open={esporta} title={frasi.sugEsporta} onClose={() => setEsporta(false)}>
        <Segmented
          fill
          label={frasi.sugFormato}
          value={formato}
          onChange={setFormato}
          options={[{ value: 'pdf', label: frasi.sugPdf }, { value: 'xlsx', label: frasi.sugExcel }]}
        />
        <p style={{ margin: 0, ...USER_TEXT }}>{frasi.consRichiesteFile.replace('{{n}}', String(visibili.length))}</p>
        {esportaKo ? <p style={{ margin: 0 }}>{frasi.sugEsportaKo}</p> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setEsporta(false)}>{frasi.uteAnnulla}</Button>
          <Button style={{ flex: 1 }} disabled={occupato || visibili.length === 0} onClick={() => { void esportaFile() }}>{frasi.sugEsporta}</Button>
        </div>
      </Dialog>
    </>
  )
}
