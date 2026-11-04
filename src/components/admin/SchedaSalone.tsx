import { Ban, Clock, Gift, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { EtichettaBeta } from '../abbonamento/EtichettaBeta'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { Card, Row } from '../ui/Card'
import { SectionTitle } from '../ui/SectionTitle'
import { Segmented } from '../ui/Segmented'
import { StatusPill } from '../ui/StatusPill'
import { Toggle } from '../ui/Toggle'
import { AttesaRiga } from '../ui/Zampette'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import {
  fineBetaDi,
  giorniDaAttivita,
  perchePiano,
  type FeedbackLetto,
  type InfoSalone,
  type SalonRow,
  type StatoBeta,
} from '../../lib/adminManager'
import type { InvitoBeta, MotivoRifiutoBeta } from '../../lib/betaInvito'
import type { LivelloElenco } from '../../lib/funzioniPiano'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'
import { AIUTO, BarraGiorniAdmin, MarchioLivello, NOME, type Frasi } from './comuni'
import { RigaFeedback } from './FeedbackAdmin'
import type { PianoLocale } from './useAzioniPiano'

export type VistaScheda = 'azioni' | 'storico' | 'feedback'
const GIORNO = 86_400_000

// Etichetta piccola del piano attivo: non deve rubare spazio alla scheda.
const ATTIVO_ORA: CSSProperties = {
  flex: 'none',
  padding: '2px 7px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  background: 'var(--tx)',
  color: 'var(--bg)',
}

const TONALE_PLUS: CSSProperties = { background: 'var(--plus-s, #F0E9FD)', color: 'var(--plus-ink, #5A2BC0)', border: 0 }
const TONALE_SALONE: CSSProperties = { background: 'var(--sal-s, #FBF1D6)', color: 'var(--sal-ink, #7A5600)', border: 0 }
const TONALE_REVOCA: CSSProperties = { background: 'var(--warn-s)', color: 'var(--warn)', border: 0 }

function nomeLivello(frasi: Frasi, livello: LivelloElenco): string {
  if (livello === 'base') return frasi.utePianoGo
  if (livello === 'pro') return frasi.utePro
  if (livello === 'vip') return `${frasi.uteSalone} · ${frasi.uteVip}`
  return frasi.uteSalone
}

function nomeMotivo(frasi: Frasi, motivo: MotivoRifiutoBeta | null, altro: string | null): string {
  if (motivo === 'non-serve') return frasi.amMotivoServe
  if (motivo === 'complicato') return frasi.amMotivoComplicato
  if (motivo === 'non-pagherei') return frasi.amMotivoPagherei
  return altro && altro.trim() !== '' ? altro : frasi.amMotivoAltro
}

type VoceStorico = { quando: string; testo: string; colore: string }

export function vociStorico(frasi: Frasi, inviti: readonly InvitoBeta[], fineBeta: string | null, data: (iso: string) => string): VoceStorico[] {
  const voci: VoceStorico[] = []
  inviti.forEach((invito, indice) => {
    const nome = invito.piano === 'pro' ? 'Plus' : 'Salon'
    voci.push({ quando: invito.invitatoIl, testo: frasi.amStInvito.replace('{{piano}}', nome).replace('{{n}}', String(invito.giorni)), colore: 'var(--pri)' })
    if (invito.stato === 'accettato' && invito.rispostoIl) {
      voci.push({ quando: invito.rispostoIl, testo: frasi.amStAccettato, colore: 'var(--ok)' })
      if (indice === 0 && fineBeta) voci.push({ quando: invito.rispostoIl, testo: frasi.amStBetaFino.replace('{{data}}', data(fineBeta)), colore: '#7B3FE4' })
    }
    if (invito.stato === 'rifiutato' && invito.rispostoIl) {
      voci.push({ quando: invito.rispostoIl, testo: frasi.amStRifiutato.replace('{{motivo}}', nomeMotivo(frasi, invito.motivoRifiuto, invito.altroRifiuto)), colore: 'var(--bad)' })
    }
    if (invito.stato === 'scaduto') voci.push({ quando: invito.scadeInvitoIl, testo: frasi.amStScaduto, colore: 'var(--tx3)' })
    if (invito.stato === 'revocato' && invito.revocatoIl) voci.push({ quando: invito.revocatoIl, testo: frasi.amStRevocato, colore: 'var(--warn)' })
  })
  return voci.sort((a, b) => b.quando.localeCompare(a.quando))
}

export function SchedaSalone({
  row,
  livello,
  pianoAttuale,
  beta,
  invito,
  info,
  feedback,
  problema,
  vista,
  onVista,
  caricaStorico,
  onGo,
  onAttiva,
  onRegala,
  onElimina,
  onInvita,
  onEstendi,
  onRevoca,
  onRevocaInvito,
  onEarly,
  adesso,
}: {
  row: SalonRow
  livello: LivelloElenco
  pianoAttuale: PianoLocale
  beta: StatoBeta
  invito: InvitoBeta | undefined
  info: InfoSalone
  feedback: readonly FeedbackLetto[]
  problema: string
  vista: VistaScheda
  onVista: (vista: VistaScheda) => void
  caricaStorico: () => Promise<InvitoBeta[]>
  onGo: () => void
  onAttiva: (piano: 'pro' | 'salone') => void
  onRegala: () => void
  onElimina: () => void
  onInvita: (piano: 'pro' | 'salone') => void
  onEstendi: (giorni: number) => Promise<boolean>
  onRevoca: (testo: string) => Promise<boolean>
  onRevocaInvito: () => Promise<boolean>
  onEarly: (valore: boolean) => Promise<boolean>
  adesso: Date
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const data = (iso: string) => dataCorta(lingua, new Date(iso))
  const [dialogo, setDialogo] = useState<'estendi' | 'revoca' | 'revoca-invito' | null>(null)
  const [piu, setPiu] = useState<'15' | '30' | '60' | 'altro'>('30')
  const [piuAltro, setPiuAltro] = useState('')
  const [testoRevoca, setTestoRevoca] = useState('')
  const [occupato, setOccupato] = useState(false)
  const [early, setEarly] = useState<boolean | null>(null)
  const [storico, setStorico] = useState<InvitoBeta[] | null>(null)
  const earlyAcceso = early ?? row.traccia.earlyAdopter === true
  const carica = useRef(caricaStorico)
  carica.current = caricaStorico

  useEffect(() => {
    if (vista !== 'storico' || storico !== null) return
    let vivo = true
    void carica.current().then((lista) => { if (vivo) setStorico(lista) }).catch(() => { if (vivo) setStorico([]) })
    return () => { vivo = false }
  }, [vista, storico])

  const causa = perchePiano(row, livello)
  const fine = beta === 'in-beta' ? fineBetaDi(row) : causa.tipo === 'prova' ? causa.fino : null
  const inizio = beta === 'in-beta' && row.traccia.betaDal ? Date.parse(row.traccia.betaDal) : fine ? Date.parse(fine) - 30 * GIORNO : NaN
  const fatto = fine && Number.isFinite(inizio) ? (adesso.getTime() - inizio) / Math.max(1, Date.parse(fine) - inizio) : 0
  const giorniFine = fine ? Math.max(0, Math.ceil((Date.parse(fine) - adesso.getTime()) / GIORNO)) : 0
  const pianoBeta: 'plus' | 'salone' = (row.traccia.betaPiano ?? row.piano) === 'salone' ? 'salone' : 'plus'
  const colore = pianoBeta === 'plus' || livello === 'pro' ? '#7B3FE4' : '#DCA50E'
  const attivoDa = giorniDaAttivita(info, adesso)

  function testoCausa(): string {
    if (causa.tipo === 'vip') return frasi.amCausaVip
    if (causa.tipo === 'beta') return causa.dal ? frasi.amCausaBeta.replace('{{data}}', data(causa.dal)) : frasi.amCausaBetaSenzaData
    if (causa.tipo === 'prova') return causa.fino ? frasi.amCausaProva.replace('{{data}}', data(causa.fino)) : frasi.prova30
    if (causa.tipo === 'play') return frasi.amCausaPlay
    if (causa.tipo === 'manuale') return frasi.amCausaManuale
    return frasi.amCausaGo
  }

  const estensione = piu === 'altro' ? Number(piuAltro) : Number(piu)
  const estensioneValida = Number.isInteger(estensione) && estensione >= 1 && estensione <= 365
  const baseFine = fineBetaDi(row)
  const nuovaFine = estensioneValida && baseFine ? new Date(Date.parse(baseFine) + estensione * GIORNO) : null

  async function conferma(azione: () => Promise<boolean>) {
    if (occupato) return
    setOccupato(true)
    const ok = await azione()
    setOccupato(false)
    if (ok) {
      setDialogo(null)
      setTestoRevoca('')
    }
  }

  async function cambiaEarly(valore: boolean) {
    setEarly(valore)
    const ok = await onEarly(valore)
    if (!ok) setEarly(null)
  }

  const voci: { piano: PianoLocale; marchio: LivelloElenco; nome: string; aiuto: string; bordo: string }[] = [
    { piano: 'base', marchio: 'base', nome: frasi.utePianoGo, aiuto: frasi.utePianoGoAiuto, bordo: 'var(--tx3)' },
    { piano: 'pro', marchio: 'pro', nome: frasi.utePro, aiuto: frasi.utePianoPlusAiuto, bordo: '#7B3FE4' },
    {
      piano: 'salone',
      marchio: livello === 'vip' ? 'vip' : 'salone',
      nome: livello === 'vip' ? `${frasi.uteSalone} · ${frasi.uteVip}` : frasi.uteSalone,
      aiuto: frasi.utePianoSaloneAiuto,
      bordo: '#DCA50E',
    },
  ]
  const scadeProva = row.stato === 'prova' && row.scadeIl ? frasi.uteScadeIl.replace('{{data}}', data(row.scadeIl)) : ''

  return (
    <>
      <Card style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <MarchioLivello livello={livello} />
          <span style={{ fontWeight: 800, ...USER_TEXT }}>
            {beta === 'in-beta' ? frasi.amInBetaRiga.replace('{{piano}}', pianoBeta === 'plus' ? 'Plus' : 'Salon') : nomeLivello(frasi, livello)}
          </span>
          {beta === 'in-beta' ? <EtichettaBeta piano={pianoBeta} /> : null}
        </div>
        <span style={AIUTO}><strong>{frasi.amPerche}</strong> {testoCausa()}</span>
        {fine ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarraGiorniAdmin fatto={fatto} colore={colore} />
            <span style={{ fontSize: 12, fontWeight: 800 }}>{frasi.amGg.replace('{{n}}', String(giorniFine))}</span>
            <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{frasi.amAlData.replace('{{data}}', data(fine))}</span>
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {attivoDa !== null ? <StatusPill tone="ok">{attivoDa === 0 ? frasi.amAttivoOggi : frasi.amAttivoFa.replace('{{n}}', String(attivoDa))}</StatusPill> : null}
          {row.traccia.earlyAdopter ? <StatusPill tone="prim">{frasi.amEarly}</StatusPill> : null}
          <StatusPill tone="neutral">{frasi.amFeedbackN.replace('{{n}}', String(feedback.length))}</StatusPill>
        </div>
      </Card>

      <Segmented
        fill
        label={frasi.amAzioni}
        value={vista}
        onChange={onVista}
        options={[
          { value: 'azioni', label: frasi.amAzioni },
          { value: 'storico', label: frasi.amStorico },
          { value: 'feedback', label: frasi.amFeedbackTab.replace('{{n}}', String(feedback.length)) },
        ]}
      />

      {vista === 'storico' ? (
        storico === null ? <AttesaRiga testo={frasi.uteCarica} /> : (() => {
          const elenco = vociStorico(frasi, [...(invito ? [invito] : []), ...storico], fineBetaDi(row), data)
          if (elenco.length === 0) return <p style={{ margin: 0, color: 'var(--tx3)' }}>{frasi.amNessunoStorico}</p>
          return (
            <Card style={{ padding: '10px 12px' }}>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {elenco.map((voce, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: voce.colore, marginTop: 4, flex: 'none' }} />
                    <span style={{ fontSize: 12.5, ...USER_TEXT }}>
                      <span style={{ display: 'block', fontWeight: 700 }}>{voce.testo}</span>
                      <span style={{ color: 'var(--tx3)' }}>{data(voce.quando)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          )
        })()
      ) : vista === 'feedback' ? (
        feedback.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{frasi.amNessunFeedback}</p> : (
          <Card>
            {feedback.map((f, i) => <RigaFeedback key={f.id} feedback={f} nome="" primo={i === 0} />)}
          </Card>
        )
      ) : (
        <>
          {livello !== 'vip' ? (
            <>
              <SectionTitle color="var(--tx3)">{frasi.amBeta}</SectionTitle>
              {beta === 'in-beta' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Button variant="tonal" style={TONALE_PLUS} onClick={() => { setPiu('30'); setPiuAltro(''); setDialogo('estendi') }}>
                      <Clock size={16} aria-hidden />{frasi.amEstendi}
                    </Button>
                    <Button variant="tonal" style={TONALE_REVOCA} onClick={() => { setTestoRevoca(''); setDialogo('revoca') }}>
                      <Ban size={16} aria-hidden />{frasi.amRevoca}
                    </Button>
                  </div>
                </>
              ) : beta === 'invitato' ? (
                <Button variant="tonal" style={{ ...TONALE_REVOCA, width: '100%' }} onClick={() => setDialogo('revoca-invito')}>
                  <Ban size={16} aria-hidden />{frasi.amRevocaInvito}
                </Button>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Button variant="tonal" style={TONALE_PLUS} onClick={() => onInvita('pro')}>{frasi.amInvitaPlus}</Button>
                  <Button variant="tonal" style={TONALE_SALONE} onClick={() => onInvita('salone')}>{frasi.amInvitaSalone}</Button>
                </div>
              )}
              {row.traccia.exBeta || beta === 'in-beta' ? (
                <Card>
                  <Row style={{ borderTop: 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, ...USER_TEXT }}>{frasi.amEarly}</div>
                      <div style={AIUTO}>{frasi.amEarlyAiuto}</div>
                    </div>
                    <Toggle checked={earlyAcceso} label={frasi.amEarly} onChange={(valore) => { void cambiaEarly(valore) }} />
                  </Row>
                </Card>
              ) : null}
            </>
          ) : null}

          <SectionTitle color="var(--tx3)">{frasi.uteServizio}</SectionTitle>
          {problema !== '' ? <p style={{ margin: 0, color: 'var(--bad)', ...USER_TEXT }}>{problema}</p> : null}
          {voci.map((voce) => {
            const attivo = voce.piano === pianoAttuale
            const etichetta = voce.piano === 'base' ? frasi.uteTornaGo : frasi.uteAttiva.replace('{{piano}}', frasi[voce.piano === 'pro' ? 'utePro' : 'uteSalone'])
            return (
              <Card key={voce.piano}>
                <div
                  aria-current={attivo ? 'true' : undefined}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`,
                    borderRadius: 'inherit',
                    boxShadow: attivo ? `inset 0 0 0 2px ${voce.bordo}` : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 52, display: 'flex', justifyContent: 'center', flex: 'none' }}><MarchioLivello livello={voce.marchio} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={NOME}>{voce.nome}</span>
                      <span style={AIUTO}>{attivo && voce.piano === 'pro' && scadeProva !== '' ? `${frasi.prova30} · ${scadeProva}` : voce.aiuto}</span>
                    </span>
                    {attivo ? <span style={ATTIVO_ORA}>{frasi.uteAttivoOra}</span> : null}
                  </div>
                  {attivo ? null : (
                    <Button
                      variant={voce.piano === 'base' ? 'secondary' : 'tonal'}
                      aria-label={frasi.perPersona.replace('{{etichetta}}', etichetta).replace('{{nome}}', row.ownerName)}
                      style={{ width: '100%', ...(voce.piano === 'pro' ? TONALE_PLUS : voce.piano === 'salone' ? TONALE_SALONE : {}) }}
                      onClick={() => {
                        if (voce.piano === 'base') onGo()
                        else onAttiva(voce.piano)
                      }}
                    >
                      {etichetta}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
          <Button
            variant="secondary"
            aria-label={frasi.perPersona.replace('{{etichetta}}', frasi.prova30).replace('{{nome}}', row.ownerName)}
            style={{ width: '100%' }}
            onClick={onRegala}
          >
            <Gift size={16} aria-hidden />{frasi.uteRegalaProva}
          </Button>
          <div style={{ height: 3 }} />
          <Button variant="bad" style={{ width: '100%' }} onClick={onElimina}>
            <Trash2 size={16} aria-hidden />{frasi.uteElimina}
          </Button>
          <span style={{ ...AIUTO, textAlign: 'center' }}>{frasi.uteEliminaAiuto}</span>
        </>
      )}

      <Dialog open={dialogo === 'estendi'} title={frasi.amEstendiTitolo} onClose={() => setDialogo(null)}>
        <Segmented
          fill
          label={frasi.amEstendiTitolo}
          value={piu}
          onChange={setPiu}
          options={[
            { value: '15', label: '+15' },
            { value: '30', label: '+30' },
            { value: '60', label: frasi.amPiuGiorni.replace('{{n}}', '60') },
            { value: 'altro', label: frasi.amAltro },
          ]}
        />
        {piu === 'altro' ? (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
            {frasi.amGiorniAltro}
            <input type="number" inputMode="numeric" min={1} max={365} value={piuAltro} onChange={(e) => setPiuAltro(e.target.value)} style={{ font: 'inherit', padding: 10, border: '1px solid var(--line)', borderRadius: 10, background: 'transparent', color: 'inherit' }} />
          </label>
        ) : null}
        {nuovaFine ? <p style={{ margin: 0, fontWeight: 700 }}>{frasi.amNuovaFine.replace('{{data}}', dataCorta(lingua, nuovaFine))}</p> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setDialogo(null)}>{frasi.uteAnnulla}</Button>
          <Button style={{ flex: 1 }} disabled={!estensioneValida || occupato} onClick={() => { void conferma(() => onEstendi(estensione)) }}>{frasi.uteConferma}</Button>
        </div>
      </Dialog>
      <Dialog open={dialogo === 'revoca'} title={frasi.amRevocaTitolo} onClose={() => setDialogo(null)}>
        <p style={{ margin: 0, ...USER_TEXT }}>{frasi.amRevocaTesto.replace('{{salone}}', row.salonName.trim() !== '' ? row.salonName : row.ownerName)}</p>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
          {frasi.amMessaggio}
          <textarea value={testoRevoca} maxLength={400} rows={3} onChange={(e) => setTestoRevoca(e.target.value)} style={{ font: 'inherit', fontWeight: 400, padding: 10, border: '1px solid var(--line)', borderRadius: 10, background: 'transparent', color: 'inherit', resize: 'vertical' }} />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setDialogo(null)}>{frasi.uteAnnulla}</Button>
          <Button variant="bad" style={{ flex: 1 }} disabled={occupato} onClick={() => { void conferma(() => onRevoca(testoRevoca.trim())) }}>{frasi.uteConferma}</Button>
        </div>
      </Dialog>
      <Dialog open={dialogo === 'revoca-invito'} title={frasi.amRevocaInvitoTitolo} onClose={() => setDialogo(null)}>
        <p style={{ margin: 0, ...USER_TEXT }}>{frasi.amRevocaInvitoTesto.replace('{{salone}}', row.salonName.trim() !== '' ? row.salonName : row.ownerName)}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setDialogo(null)}>{frasi.uteAnnulla}</Button>
          <Button variant="bad" style={{ flex: 1 }} disabled={occupato} onClick={() => { void conferma(onRevocaInvito) }}>{frasi.uteConferma}</Button>
        </div>
      </Dialog>
    </>
  )
}
