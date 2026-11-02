import { useEffect, useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { USER_TEXT } from '../../theme/text'
import { useFrasi } from '../../i18n/LinguaContext'
import { rosterLabel, type SalonMember } from '../../lib/salonRoster'
import { messaggioCallable } from './messaggioCallable'

export function ConfermaRevoca({ membro, onChiudi, onTolto }: { membro: SalonMember | null; onChiudi: () => void; onTolto?: () => void }) {
  const frasi = useFrasi()
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    setErrore('')
    setOccupato(false)
  }, [membro?.uid])

  async function togli() {
    if (!membro || occupato) return
    setErrore('')
    setOccupato(true)
    try {
      const mod = await import('../../data/firebase/client')
      await mod.callRevokeMember(membro.uid)
    } catch (caught) {
      setErrore(messaggioCallable(caught, frasi.invitoInvio, frasi.impInvioRiprova))
      setOccupato(false)
      return
    }
    setOccupato(false)
    onTolto?.()
    onChiudi()
  }

  return (
    <Dialog open={membro !== null} title={frasi.teamTogli} onClose={onChiudi}>
      <p style={{ margin: 0, ...USER_TEXT }}>{membro ? frasi.teamTogliDomanda.replace('{{nome}}', rosterLabel(membro)) : ''}</p>
      {errore ? <p role="alert" style={{ margin: 0, color: 'var(--bad)', ...USER_TEXT }}>{errore}</p> : null}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button type="button" size="sm" variant="secondary" disabled={occupato} onClick={onChiudi}>{frasi.invitoAnnulla}</Button>
        <Button type="button" size="sm" variant="bad" disabled={occupato} aria-busy={occupato || undefined} onClick={() => { void togli() }}>{frasi.teamTogli}</Button>
      </div>
    </Dialog>
  )
}
