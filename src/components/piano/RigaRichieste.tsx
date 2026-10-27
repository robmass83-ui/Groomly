import { ChevronRight } from 'lucide-react'
import type { RichiestaNuova } from '../../data/firebase/client'
import { dataCorta, giornoCorto } from '../../i18n/format'
import type { Lingua } from '../../i18n/lingua'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { chiaveGiornoRoma, oraRoma } from '../../lib/disponibilita'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'
import { Card } from '../ui/Card'

/** Il giorno `AAAA-MM-GG` di Roma riletto come data di calendario locale, buona per i formati di `i18n/format`. */
export function dataDiCalendario(chiave: string): Date {
  const [anno, mese, giorno] = chiave.split('-').map(Number)
  return new Date(anno ?? 1970, (mese ?? 1) - 1, giorno ?? 1)
}

/** «mer 28 ott». */
export function giornoRomaCorto(lingua: Lingua, chiave: string): string {
  const data = dataDiCalendario(chiave)
  return `${giornoCorto(lingua, data.getDay()).toLowerCase()} ${dataCorta(lingua, data)}`
}

export function chiPrimoNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? ''
}

/** `pronte` è falso finché cani e agenda non sono arrivati: la card non compare e il riquadro non si apre. */
export function RigaRichieste({ richieste, onApri, pronte = true }: { richieste: readonly RichiestaNuova[]; onApri: (id: string) => void; pronte?: boolean }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  if (!pronte || richieste.length === 0) return null
  const etichette = { cane: frasi.schedaCane, gatto: frasi.schedaGatto, altro: frasi.schedaAltro } as const
  return (
    <Card>
      {richieste.map((richiesta, indice) => {
        const inizio = new Date(richiesta.start)
        const valida = !Number.isNaN(inizio.getTime())
        const cane = richiesta.cane.trim() || frasi.richiestaMancaCane
        const seconda = [
          valida ? giornoRomaCorto(lingua, chiaveGiornoRoma(inizio)) : '',
          valida ? oraRoma(inizio) : '',
          etichette[richiesta.specie],
        ].filter((parte) => parte !== '').join(' · ')
        return (
          <button
            key={richiesta.id}
            type="button"
            onClick={() => onApri(richiesta.id)}
            style={{
              width: '100%',
              minHeight: 48,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`,
              border: 0,
              borderTop: indice === 0 ? 'none' : `${SIZES.card.border}px solid var(--line)`,
              background: 'transparent',
              color: 'var(--tx)',
              font: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25, ...USER_TEXT }}>
                {frasi.richiestaRiga.replace('{{chi}}', chiPrimoNome(richiesta.nome)).replace('{{cane}}', cane)}
              </span>
              <span style={{ fontSize: 12, lineHeight: 1.25, color: 'var(--tx2)' }}>{seconda}</span>
            </span>
            <ChevronRight size={16} strokeWidth={2} color="var(--tx3)" aria-hidden />
          </button>
        )
      })}
    </Card>
  )
}
