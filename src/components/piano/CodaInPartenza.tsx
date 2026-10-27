import { Bell } from 'lucide-react'
import { useFrasi } from '../../i18n/LinguaContext'
import { oraRoma } from '../../lib/disponibilita'
import type { RigaCoda } from '../../lib/codaEmail'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import { Button } from '../ui/Button'
import { Card, Row } from '../ui/Card'
import { Chip } from '../ui/Chip'

type Tono = 'neutral' | 'ok' | 'warn' | 'bad' | 'sen' | 'tea' | 'pri'
type Frasi = ReturnType<typeof useFrasi>

function iniziale(nome: string): string {
  return nome.trim().charAt(0).toLocaleUpperCase('it-IT')
}

function oraPartenza(parteIl: string | null): string | null {
  if (parteIl === null) return null
  const data = new Date(parteIl)
  if (Number.isNaN(data.getTime())) return null
  return oraRoma(data)
}

function sceltaTipo(tipo: RigaCoda['tipo'], frasi: Frasi): { testo: string; tone: Tono } {
  switch (tipo) {
    case 'promemoria':
      return { testo: frasi.codaPromemoria, tone: 'pri' }
    case 'pronto':
      return { testo: frasi.codaPronto, tone: 'tea' }
    case 'auguri':
      return { testo: frasi.codaAuguri, tone: 'sen' }
    case 'recensione':
      return { testo: frasi.codaRecensione, tone: 'warn' }
    case 'attesa':
      return { testo: frasi.codaPosto, tone: 'ok' }
  }
}

function sceltaChip(riga: RigaCoda, frasi: Frasi): { testo: string; tone: Tono } {
  if (riga.motivo === 'manca_email') return { testo: frasi.codaMancaEmail, tone: 'bad' }
  if (riga.motivo === 'pagina_assente') return { testo: frasi.codaPagina, tone: 'bad' }
  if (riga.stato === 'inviata') return { testo: frasi.codaInviata, tone: 'ok' }
  if (riga.stato === 'fermata') return { testo: frasi.codaFermata, tone: 'neutral' }
  if (riga.stato === 'non_inviata') return { testo: frasi.codaRiprova, tone: 'warn' }
  return sceltaTipo(riga.tipo, frasi)
}

function inviaBloccato(riga: RigaCoda, inInvio: boolean): boolean {
  if (inInvio) return true
  if (riga.motivo === 'manca_email' || riga.email.trim() === '') return true
  if (riga.motivo === 'pagina_assente') return true
  return riga.stato === 'inviata' || riga.stato === 'fermata' || riga.stato === 'chiusa'
}

function RigaInPartenza({
  riga,
  prima,
  inInvio,
  onFerma,
  onInvia,
  onEmail,
}: {
  riga: RigaCoda
  prima: boolean
  inInvio: boolean
  onFerma: (id: string) => void
  onInvia: (id: string) => void
  onEmail: (dogId: string) => void
}) {
  const frasi = useFrasi()
  const chip = sceltaChip(riga, frasi)
  const ora = oraPartenza(riga.parteIl)
  const ferma = riga.stato === 'in_coda' || riga.stato === 'non_inviata'
  return (
    <Row style={{ alignItems: 'stretch', ...(prima ? { borderTop: 'none' } : {}) }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              width: SIZES.avatar.md,
              height: SIZES.avatar.md,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surf2)',
              color: 'var(--tx)',
              fontWeight: 700,
              fontSize: TYPE.base,
            }}
          >
            {iniziale(riga.nomeCane)}
          </span>
          <span style={{ fontWeight: 700, minWidth: 0, flex: '1 1 auto' }}>{riga.nomeCane}</span>
          <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Chip tone={chip.tone}>{chip.testo}</Chip>
          </span>
        </div>
        {ora ? <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta, paddingLeft: SIZES.avatar.md + 8 }}>{ora}</span> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="lg" variant="secondary" disabled={!ferma} onClick={() => onFerma(riga.id)} style={{ flex: '1 1 0' }}>
              {frasi.codaFerma}
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={inviaBloccato(riga, inInvio)}
              onClick={() => onInvia(riga.id)}
              style={{ flex: '1 1 0' }}
            >
              {inInvio ? frasi.codaInvio : frasi.codaInvia}
            </Button>
          </div>
          {riga.motivo === 'manca_email' ? (
            <Button size="lg" variant="secondary" onClick={() => onEmail(riga.dogId)} style={{ width: '100%' }}>
              {frasi.codaAggiungiEmail}
            </Button>
          ) : null}
        </div>
      </div>
    </Row>
  )
}

export function CodaInPartenza({
  righe,
  onFerma,
  onInvia,
  onEmail,
  invioId,
}: {
  righe: readonly RigaCoda[]
  onFerma: (id: string) => void
  onInvia: (id: string) => void
  onEmail: (dogId: string) => void
  invioId?: string | null
}) {
  const frasi = useFrasi()
  if (righe.length === 0) {
    return (
      <Card>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, color: 'var(--tx)', fontSize: TYPE.base }}>
          <Bell aria-hidden size={18} strokeWidth={2} />
          {frasi.codaNiente}
        </p>
      </Card>
    )
  }
  return (
    <Card>
      <p role="status" style={{ margin: 0, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, color: 'var(--tx2)', fontSize: TYPE.meta, fontWeight: 600 }}>
        {frasi.codaConto.replace('{{n}}', String(righe.length))}
      </p>
      {righe.map((riga, index) => (
        <RigaInPartenza
          key={riga.id}
          riga={riga}
          prima={false}
          inInvio={invioId === riga.id}
          onFerma={onFerma}
          onInvia={onInvia}
          onEmail={onEmail}
        />
      ))}
    </Card>
  )
}
