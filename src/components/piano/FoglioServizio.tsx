import { Check, type LucideIcon } from 'lucide-react'
import { useFrasi } from '../../i18n/LinguaContext'
import { puoCambiareModo, sceltaIniziale, type ChiaveServizioEmail, type ModoServizio, type SceltaServizio } from '../../lib/serviziEmail'
import { SIZES } from '../../theme/sizes'
import { Chip } from '../ui/Chip'
import { Input } from '../ui/Input'

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

function RadioRiga({ nome, acceso, onClick }: { nome: string; acceso: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={acceso}
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

function Interruttore({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  const pad = (SIZES.switch.h - SIZES.switch.knob) / 2
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: Math.max(48, SIZES.switch.w),
        minHeight: 48,
        height: 48,
        borderRadius: 999,
        border: 0,
        background: 'transparent',
        padding: 0,
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
      }}
    >
      <span
        aria-hidden
        style={{
          width: SIZES.switch.w,
          height: SIZES.switch.h,
          borderRadius: 999,
          background: checked ? 'var(--ok)' : 'var(--line2)',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: pad,
            left: checked ? SIZES.switch.w - SIZES.switch.knob - pad : pad,
            width: SIZES.switch.knob,
            height: SIZES.switch.knob,
            borderRadius: 999,
            background: 'var(--on-pri)',
          }}
        />
      </span>
    </button>
  )
}

function conModo(chiave: ChiaveServizioEmail, scelta: SceltaServizio, modo: 'manuale' | 'automatico'): SceltaServizio {
  if (scelta.modo === 'spento') return { ...sceltaIniziale(chiave), modo }
  return { ...sceltaIniziale(chiave), ...scelta, modo }
}

export function FoglioServizio({
  chiave,
  scelta,
  ruolo,
  onChange,
  link = '',
  onLink,
  cani = [],
  onTogli,
}: {
  chiave: ChiaveServizioEmail
  scelta: SceltaServizio
  ruolo: string
  onChange: (scelta: SceltaServizio) => void
  link?: string
  onLink?: (valore: string) => void
  cani?: { id: string; nome: string }[]
  onTogli?: (id: string) => void
}) {
  const frasi = useFrasi()
  const puo = puoCambiareModo(ruolo)
  const cambia = (prossima: SceltaServizio) => {
    if (puo) onChange(prossima)
  }

  if (chiave === 'fedelta') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 48 }}>
        <span style={{ flex: 1, fontWeight: 650 }}>{frasi.tesseraFedelta}</span>
        <Interruttore
          checked={scelta.modo !== 'spento'}
          label={frasi.tesseraFedelta}
          onChange={(acceso) => cambia(acceso ? { modo: 'manuale' } : { modo: 'spento' })}
        />
      </div>
    )
  }

  const automatico = scelta.modo === 'automatico'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div role="radiogroup" aria-label={frasi.servizioModo} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <RadioRiga nome={frasi.servizioManuale} acceso={scelta.modo === 'manuale'} onClick={() => cambia(conModo(chiave, scelta, 'manuale'))} />
        <RadioRiga nome={frasi.servizioAutomatico} acceso={automatico} onClick={() => cambia(conModo(chiave, scelta, 'automatico'))} />
      </div>
      {automatico && chiave === 'promemoria' ? (
        <div role="radiogroup" aria-label={frasi.servizioAnticipo} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([1, 2, 3] as const).map((giorni) => (
            <RadioRiga
              key={giorni}
              nome={giorni === 1 ? frasi.anticipoUnGiorno : giorni === 2 ? frasi.anticipoDueGiorni : frasi.anticipoTreGiorni}
              acceso={scelta.anticipoGiorni === giorni}
              onClick={() => cambia({ ...sceltaIniziale(chiave), ...scelta, modo: 'automatico', anticipoGiorni: giorni })}
            />
          ))}
        </div>
      ) : null}
      {automatico && (chiave === 'promemoria' || chiave === 'auguri') ? (
        <Input
          label={frasi.servizioOra}
          type="time"
          value={scelta.ora ?? ''}
          onChange={(event) => cambia({ ...sceltaIniziale(chiave), ...scelta, ora: event.target.value })}
          style={{ height: 48 }}
        />
      ) : null}
      {automatico && chiave === 'recensione' ? (
        <Input label={frasi.linkRecensioni} value={link} onChange={(event) => onLink?.(event.target.value)} style={{ height: 48 }} />
      ) : null}
      {automatico && chiave === 'attesa' ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cani.map((cane) => (
            <li key={cane.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 48 }}>
              <span style={{ flex: 1, fontWeight: 650 }}>{cane.nome}</span>
              <button
                type="button"
                aria-label={frasi.schedaTogliNome.replace('{{nome}}', cane.nome)}
                onClick={() => onTogli?.(cane.id)}
                style={{
                  minHeight: 48,
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                  background: 'var(--surf)',
                  color: 'var(--tx)',
                  font: 'inherit',
                  fontWeight: 650,
                  padding: '0 12px',
                }}
              >
                {frasi.schedaTogli}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
