import { ChevronRight, Gift, Megaphone, ScrollText, Send, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../layout/Sheet'
import { Card } from '../ui/Card'
import { useFrasi } from '../../i18n/LinguaContext'
import { PERCORSO_COMUNICAZIONI, PERCORSO_REGISTRO, PERCORSO_SALONI } from '../../lib/percorsoAdmin'
import { useAdminDati } from './AdminDati'
import { AIUTO, NOME, RIGA } from './comuni'

type Azione = { nome: string; aiuto: string; icona: LucideIcon; sfondo: string; colore: string; fai: () => void }

/** Il foglio del tasto +: le azioni che si fanno più spesso, a un tocco da qualsiasi pagina. */
export function AzioniRapide({ onChiudi, onCerca }: { onChiudi: () => void; onCerca: () => void }) {
  const frasi = useFrasi()
  const navigate = useNavigate()
  const { setSelezione } = useAdminDati()
  const vai = (percorso: string) => {
    onChiudi()
    navigate(percorso)
  }
  const azioni: Azione[] = [
    {
      nome: frasi.consAzioneInvita,
      aiuto: frasi.consAzioneInvitaAiuto,
      icona: Send,
      sfondo: 'var(--plus-s)',
      colore: 'var(--plus-ink)',
      fai: () => {
        setSelezione(new Set())
        vai(PERCORSO_SALONI)
      },
    },
    { nome: frasi.consAzioneAvviso, aiuto: frasi.consAzioneAvvisoAiuto, icona: Megaphone, sfondo: 'var(--pri-s)', colore: 'var(--pri-ink)', fai: () => vai(PERCORSO_COMUNICAZIONI) },
    {
      nome: frasi.consAzioneRegala,
      aiuto: frasi.consAzioneRegalaAiuto,
      icona: Gift,
      sfondo: 'var(--ok-s)',
      colore: 'var(--ok)',
      fai: () => {
        onChiudi()
        onCerca()
      },
    },
    { nome: frasi.consAzioneRegistro, aiuto: frasi.consAzioneRegistroAiuto, icona: ScrollText, sfondo: 'var(--surf)', colore: 'var(--tx2)', fai: () => vai(PERCORSO_REGISTRO) },
  ]
  return (
    <Sheet open title={frasi.consCosaFare} onClose={onChiudi} closeButton>
      <Card>
        {azioni.map(({ nome, aiuto, icona: Icona, sfondo, colore, fai }, indice) => (
          <button key={nome} type="button" onClick={fai} style={{ ...RIGA, gap: 12, borderTop: indice === 0 ? 'none' : RIGA.borderTop }}>
            <span aria-hidden style={{ width: 44, height: 44, borderRadius: 14, background: sfondo, color: colore, display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Icona size={20} strokeWidth={2} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={NOME}>{nome}</span>
              <span style={AIUTO}>{aiuto}</span>
            </span>
            <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
          </button>
        ))}
      </Card>
    </Sheet>
  )
}
