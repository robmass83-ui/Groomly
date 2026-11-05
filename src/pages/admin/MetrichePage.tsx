import { useEffect, useState, type CSSProperties } from 'react'
import { AIUTO } from '../../components/admin/comuni'
import { GraficoMetriche } from '../../components/admin/GraficoMetriche'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { useToast } from '../../components/layout/Toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { AttesaRiga } from '../../components/ui/Zampette'
import { elencoStatistiche } from '../../data/firebase/adminClient'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import { metricheXlsx } from '../../lib/metricheXlsx'
import { downloadAnchor } from '../../lib/shareFile'
import type { Coorte, StatisticheGiorno } from '../../lib/statisticheGiorno'
import { CORPO } from './comune'

type Periodo = 30 | 90
type Misura = 'attivi1' | 'nuovi' | 'appuntamenti'

const CONSOLE_FIREBASE = 'https://console.firebase.google.com/project/groomly-3128b'
const LINK = [['Crashlytics', `${CONSOLE_FIREBASE}/crashlytics`], ['Analytics', `${CONSOLE_FIREBASE}/analytics`]] as const
const GIORNO_MS = 86_400_000
const GRIGLIA: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }
const SCHEDA: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--card)' }
const CELLA: CSSProperties = { padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

function NumeroCard({ titolo, valore, prima }: { titolo: string; valore: number; prima?: number }) {
  const differenza = prima === undefined ? 0 : Math.round((valore - prima) * 10) / 10
  return (
    <div style={SCHEDA}>
      <span style={AIUTO}>{titolo}</span>
      <strong style={{ fontSize: 22 }}>{valore}</strong>
      {differenza !== 0 ? <span style={AIUTO}>{differenza > 0 ? `+${differenza}` : differenza}</span> : null}
    </div>
  )
}

// Una coorte ha un numero vero solo quando i suoi saloni hanno avuto il tempo di tornare.
function percentuale(coorte: Coorte, rimasti: number, giorni: number, ultimo: string): string {
  const pronta = Date.parse(coorte.settimana) + (giorni + 7) * GIORNO_MS <= Date.parse(ultimo)
  return pronta && coorte.saloni > 0 ? `${Math.round((rimasti / coorte.saloni) * 100)}%` : '—'
}

export function MetrichePage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const toast = useToast()
  const [periodo, setPeriodo] = useState<Periodo>(30)
  const [misura, setMisura] = useState<Misura>('attivi1')
  const [righe, setRighe] = useState<StatisticheGiorno[] | null>(null)
  const [errore, setErrore] = useState(false)

  useEffect(() => {
    let vivo = true
    setErrore(false)
    elencoStatistiche(periodo)
      .then((lista) => { if (vivo) setRighe(lista) })
      .catch(() => { if (vivo) setErrore(true) })
    return () => { vivo = false }
  }, [periodo])

  async function esporta() {
    if (!righe) return
    try {
      downloadAnchor(await metricheXlsx(righe), 'groomly-metriche.xlsx')
    } catch {
      toast.show(frasi.lisExportKo, 'plain')
    }
  }

  const ultimo = righe?.[righe.length - 1]
  const inizio = ultimo ? new Date(Date.parse(ultimo.giorno) - periodo * GIORNO_MS).toISOString().slice(0, 10) : ''
  const prima = righe?.find(({ giorno }) => giorno >= inizio && giorno !== ultimo?.giorno)
  const nelPeriodo = righe?.filter(({ giorno }) => giorno > inizio) ?? []
  const misure: [Misura, string][] = [['attivi1', frasi.metAttivi1], ['nuovi', frasi.metNuovi], ['appuntamenti', frasi.metAppuntamenti]]
  const scelta = misure.find(([chiave]) => chiave === misura)?.[1] ?? ''

  return (
    <>
      <TestataAdmin titolo={frasi.metriche} />
      <div style={CORPO}>
        <div style={{ display: 'flex', gap: 8 }}>
          {([30, 90] as const).map((giorni) => (
            <Button key={giorni} size="sm" variant={giorni === periodo ? 'primary' : 'secondary'} onClick={() => setPeriodo(giorni)}>
              {t(lingua, 'metGiorni', { n: giorni })}
            </Button>
          ))}
        </div>
        {errore ? <p style={{ margin: 0 }}>{frasi.metErrore}</p> : righe === null ? <AttesaRiga testo={frasi.uteCarica} /> : !ultimo ? <p style={{ margin: 0 }}>{frasi.metVuoto}</p> : (
          <>
            <div style={GRIGLIA}>
              <NumeroCard titolo={frasi.metSaloni} valore={ultimo.saloni} prima={prima?.saloni} />
              <NumeroCard titolo={frasi.metAttivi7} valore={ultimo.attivi7} prima={prima?.attivi7} />
              <NumeroCard titolo={frasi.metAttivi30} valore={ultimo.attivi30} prima={prima?.attivi30} />
              <NumeroCard titolo={frasi.metAttivati} valore={ultimo.attivati} prima={prima?.attivati} />
              <NumeroCard titolo={frasi.metAppuntamenti} valore={ultimo.appuntamenti} prima={prima?.appuntamenti} />
              <NumeroCard titolo={frasi.metMedia} valore={ultimo.mediaAppuntamenti} prima={prima?.mediaAppuntamenti} />
              <NumeroCard titolo={frasi.metAvvisamiPlus} valore={ultimo.avvisami.plus} prima={prima?.avvisami.plus} />
              <NumeroCard titolo={frasi.metAvvisamiSalon} valore={ultimo.avvisami.salon} prima={prima?.avvisami.salon} />
            </div>
            <Card>
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {misure.map(([chiave, nome]) => (
                    <Button key={chiave} size="sm" variant={chiave === misura ? 'primary' : 'secondary'} onClick={() => setMisura(chiave)}>{nome}</Button>
                  ))}
                </div>
                <GraficoMetriche etichetta={scelta} colonne={nelPeriodo.map((riga) => ({ giorno: riga.giorno, valore: riga[misura] }))} />
              </div>
            </Card>
            <Card>
              <div style={{ padding: 12, overflowX: 'auto' }}>
                <strong>{frasi.metCoorti}</strong>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ ...CELLA, textAlign: 'left' }}>{frasi.metSettimana}</th>
                      <th scope="col" style={CELLA}>{frasi.metSaloni}</th>
                      <th scope="col" style={CELLA}>{frasi.metDopo7}</th>
                      <th scope="col" style={CELLA}>{frasi.metDopo30}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimo.coorti.map((coorte) => (
                      <tr key={coorte.settimana} style={{ borderTop: '1px solid var(--line)' }}>
                        <td style={{ ...CELLA, textAlign: 'left' }}>{coorte.settimana}</td>
                        <td style={CELLA}>{coorte.saloni}</td>
                        <td style={CELLA}>{percentuale(coorte, coorte.rimasti7, 7, ultimo.giorno)}</td>
                        <td style={CELLA}>{percentuale(coorte, coorte.rimasti30, 30, ultimo.giorno)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ ...AIUTO, margin: '8px 0 0' }}>{frasi.metStima}</p>
              </div>
            </Card>
            <p style={{ ...AIUTO, margin: 0 }}>{t(lingua, 'metEsclusi', { n: ultimo.esclusi })}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <Button size="sm" variant="secondary" onClick={() => { void esporta() }}>{frasi.metEsporta}</Button>
              {LINK.map(([nome, indirizzo]) => <a key={nome} href={indirizzo} target="_blank" rel="noreferrer">{nome}</a>)}
            </div>
          </>
        )}
      </div>
    </>
  )
}
