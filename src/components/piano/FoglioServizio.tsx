import { Check, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'
import { puoCambiareModo, sceltaIniziale, sceltaOperativa, type ChiaveServizioEmail, type ModoServizio, type SceltaServizio } from '../../lib/serviziEmail'
import { Chip } from '../ui/Chip'
import { Input } from '../ui/Input'
import { Toggle } from '../ui/Toggle'

export type StatoRiga = 'sviluppo' | ModoServizio

const TONO = {
  sviluppo: 'warn',
  spento: 'neutral',
  manuale: 'pri',
  automatico: 'ok',
} as const

function testoStato(stato: StatoRiga, frasi: ReturnType<typeof useFrasi>): string {
  if (stato === 'sviluppo') return frasi.inSviluppo
  if (stato === 'manuale') return frasi.servizioManuale
  if (stato === 'automatico') return frasi.servizioAutomatico
  return frasi.servizioSpento
}

export function RigaServizio({
  titolo,
  stato,
  ruolo,
  onApri,
  icona: Icona,
}: {
  titolo: string
  stato: StatoRiga
  ruolo: string
  onApri: () => void
  icona?: LucideIcon
}) {
  const frasi = useFrasi()
  const testo = testoStato(stato, frasi)
  const contenuto = (
    <>
      {Icona ? <Icona size={14} strokeWidth={2} aria-hidden /> : null}
      <span style={{ flex: 1, fontWeight: 650 }}>{titolo}</span>
      <Chip tone={TONO[stato]}>{testo}</Chip>
    </>
  )
  const riga = { flex: 1, minHeight: 48, display: 'flex', alignItems: 'center', gap: 8 } as const
  if (stato === 'sviluppo' || !puoCambiareModo(ruolo)) {
    return <div style={riga}>{contenuto}</div>
  }
  return (
    <button
      type="button"
      onClick={onApri}
      style={{ ...riga, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', padding: 0 }}
    >
      {contenuto}
    </button>
  )
}

const sceltaPronto = {
  minHeight: 48,
  width: '100%',
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: 'var(--surf)',
  color: 'var(--tx)',
  font: 'inherit',
  fontWeight: 650,
  padding: '0 12px',
  textAlign: 'left',
} as const

function RadioRiga({ nome, acceso, onClick, disabled = false }: { nome: string; acceso: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={acceso}
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        borderRadius: 12,
        border: acceso ? '2px solid var(--pri)' : '1px solid var(--line)',
        background: acceso ? 'var(--pri-s)' : 'var(--surf)',
        color: 'var(--tx)',
        font: 'inherit',
        fontWeight: 650,
        padding: '0 12px',
        textAlign: 'left',
      }}
    >
      <span style={{ flex: 1 }}>{nome}</span>
      {acceso ? <Check size={16} strokeWidth={2} aria-hidden /> : null}
    </button>
  )
}

function nomeServizio(chiave: ChiaveServizioEmail, frasi: ReturnType<typeof useFrasi>): string {
  if (chiave === 'promemoria') return frasi.strumPromemoria
  if (chiave === 'pronto') return frasi.strumPronto
  if (chiave === 'auguri') return frasi.strumAuguri
  if (chiave === 'recensione') return frasi.recensione
  if (chiave === 'attesa') return frasi.listaAttesa
  return frasi.tesseraFedelta
}

function conModo(chiave: ChiaveServizioEmail, scelta: SceltaServizio, modo: 'manuale' | 'automatico'): SceltaServizio {
  if (scelta.modo === 'spento') return { ...sceltaIniziale(chiave), modo }
  return { ...sceltaIniziale(chiave), ...scelta, modo }
}

function accendi(chiave: ChiaveServizioEmail, scelta: SceltaServizio): SceltaServizio {
  const iniziale = sceltaIniziale(chiave)
  const modo = iniziale.modo === 'automatico' ? 'automatico' : 'manuale'
  return { ...iniziale, ...scelta, modo }
}

export function FoglioServizio({
  chiave,
  scelta,
  ruolo,
  onChange,
  link = '',
  onLink,
  icona: Icona,
  info,
}: {
  chiave: ChiaveServizioEmail
  scelta: SceltaServizio
  ruolo: string
  onChange: (scelta: SceltaServizio) => void
  link?: string
  onLink?: (valore: string) => void
  icona?: LucideIcon
  info?: ReactNode
}) {
  const frasi = useFrasi()
  const puo = puoCambiareModo(ruolo)
  const cambia = (prossima: SceltaServizio) => {
    if (puo) onChange(prossima)
  }
  const nome = nomeServizio(chiave, frasi)

  if (chiave === 'pronto') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" onClick={() => cambia(conModo(chiave, scelta, 'manuale'))} style={sceltaPronto}>
          {frasi.prontoManualeScelta}
        </button>
        <button type="button" onClick={() => cambia(conModo(chiave, scelta, 'automatico'))} style={sceltaPronto}>
          {frasi.prontoAutomaticoScelta}
        </button>
      </div>
    )
  }

  const vista = scelta.modo === 'spento' ? scelta : sceltaOperativa(chiave, scelta)
  const acceso = vista.modo !== 'spento'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 48 }}>
        {Icona ? <Icona size={14} strokeWidth={2} aria-hidden /> : null}
        <span style={{ flex: 1, fontWeight: 650 }}>{nome}</span>
        {info}
        <Toggle
          checked={acceso}
          disabled={!puo}
          label={nome}
          onChange={(on) => cambia(on ? accendi(chiave, scelta) : { ...scelta, modo: 'spento' })}
        />
      </div>
      {acceso && chiave === 'promemoria' ? (
        <div role="radiogroup" aria-label={frasi.servizioAnticipo} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([1, 2, 3] as const).map((giorni) => (
            <RadioRiga
              key={giorni}
              nome={giorni === 1 ? frasi.anticipoUnGiorno : giorni === 2 ? frasi.anticipoDueGiorni : frasi.anticipoTreGiorni}
              acceso={vista.anticipoGiorni === giorni}
              disabled={!puo}
              onClick={() => cambia({ ...sceltaIniziale(chiave), ...scelta, modo: 'automatico', anticipoGiorni: giorni })}
            />
          ))}
        </div>
      ) : null}
      {acceso && chiave === 'promemoria' ? (
        <Input
          label={frasi.servizioOra}
          type="time"
          value={vista.ora ?? ''}
          disabled={!puo}
          onChange={(event) => cambia({ ...sceltaIniziale(chiave), ...scelta, modo: 'automatico', ora: event.target.value })}
          style={{ height: 48 }}
        />
      ) : null}
      {acceso && chiave === 'recensione' ? (
        <>
          <p style={{ margin: 0, color: 'var(--tx2)' }}>{frasi.recensioneFineGiornata}</p>
          <Input label={frasi.linkRecensioni} value={link} disabled={!puo} onChange={(event) => { if (puo) onLink?.(event.target.value) }} style={{ height: 48 }} />
        </>
      ) : null}
    </div>
  )
}
