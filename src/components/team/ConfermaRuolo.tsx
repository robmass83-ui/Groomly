import { useEffect, useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { USER_TEXT } from '../../theme/text'
import { useFrasi } from '../../i18n/LinguaContext'
import { rosterLabel, type SalonMember } from '../../lib/salonRoster'
import { messaggioCallable } from './messaggioCallable'

export function ConfermaRuolo({ membro, onChiudi }: { membro: SalonMember | null; onChiudi: () => void }) {
  const frasi = useFrasi()
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    setErrore('')
    setOccupato(false)
  }, [membro?.uid])

  const nuovo = membro?.role === 'socio' ? 'collaboratore' : 'socio'

  async function cambia() {
    if (!membro || occupato) return
    setErrore('')
    setOccupato(true)
    try {
      const mod = await import('../../data/firebase/client')
      await mod.callChangeMemberRole(membro.uid, nuovo)
    } catch (caught) {
      setErrore(messaggioCallable(caught, frasi.invitoInvio, frasi.impInvioRiprova))
      setOccupato(false)
      return
    }
    setOccupato(false)
    onChiudi()
  }

  const domanda = nuovo === 'socio' ? frasi.teamRendiSocioDomanda : frasi.teamRendiCollaboratoreDomanda
  const titolo = nuovo === 'socio' ? frasi.teamRendiSocio : frasi.teamRendiCollaboratore

  return (
    <Dialog open={membro !== null} title={titolo} onClose={occupato ? () => undefined : onChiudi}>
      <p style={{ margin: 0, ...USER_TEXT }}>{membro ? domanda.replace('{{nome}}', rosterLabel(membro)) : ''}</p>
      {errore ? <p role="alert" style={{ margin: 0, color: 'var(--bad)', ...USER_TEXT }}>{errore}</p> : null}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button type="button" size="sm" variant="secondary" disabled={occupato} onClick={onChiudi}>{frasi.invitoAnnulla}</Button>
        <Button type="button" size="sm" disabled={occupato} aria-busy={occupato || undefined} onClick={() => { void cambia() }}>{frasi.teamRuoloConferma}</Button>
      </div>
    </Dialog>
  )
}
