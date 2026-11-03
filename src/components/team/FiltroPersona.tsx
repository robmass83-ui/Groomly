import type { CSSProperties } from 'react'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import { iniziali } from '../../lib/filtroPersona'
import { rosterLabel, type SalonMember } from '../../lib/salonRoster'
import { USER_TEXT } from '../../theme/text'

function chipStyle(attivo: boolean): CSSProperties {
  return {
    flex: 'none',
    height: 40,
    padding: '0 12px',
    border: 0,
    borderRadius: 8,
    background: attivo ? 'var(--pri-solid)' : 'var(--card)',
    color: attivo ? 'var(--on-pri)' : 'var(--tx)',
    boxShadow: attivo ? undefined : 'inset 0 0 0 1px var(--line)',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 650,
    whiteSpace: 'nowrap',
    ...USER_TEXT,
  }
}

/** Fila di chip «Tutti» + una persona per chip; scorre dentro di sé, la pagina no. */
export function FiltroPersona({ persone, valore, onCambia }: { persone: SalonMember[]; valore: string | null; onCambia: (uid: string | null) => void }) {
  const frasi = useFrasi()
  return (
    <div
      role="group"
      aria-label={frasi.filtroPersona}
      style={{ display: 'flex', gap: 6, minWidth: 0, overflowX: 'auto' }}
    >
      <button type="button" aria-pressed={valore === null} onClick={() => onCambia(null)} style={chipStyle(valore === null)}>
        {frasi.filtroTutti}
      </button>
      {persone.map((persona) => (
        <button key={persona.uid} type="button" aria-pressed={valore === persona.uid} onClick={() => onCambia(persona.uid)} style={chipStyle(valore === persona.uid)}>
          {rosterLabel(persona)}
        </button>
      ))}
    </div>
  )
}

/** Pastiglia con le iniziali della persona a cui è assegnata la visita. */
export function PastigliaPersona({ persona }: { persona: SalonMember | undefined }) {
  const { lingua } = useLingua()
  if (!persona) return null
  const nome = rosterLabel(persona)
  const sigla = iniziali(nome)
  if (sigla === '') return null
  return (
    <span
      role="img"
      aria-label={t(lingua, 'visitaDi', { nome })}
      style={{ flex: 'none', minWidth: 20, height: 18, padding: '0 4px', borderRadius: 9, background: 'var(--pri-solid)', color: 'var(--on-pri)', fontSize: 10, fontWeight: 700, lineHeight: '18px', textAlign: 'center', whiteSpace: 'nowrap' }}
    >
      {sigla}
    </span>
  )
}
