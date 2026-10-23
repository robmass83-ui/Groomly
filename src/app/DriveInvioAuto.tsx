import { useEffect, useRef } from 'react'
import { useToast } from '../components/layout/Toast'
import { useSession } from '../hooks/useSession'
import { messaggioInvio, provaInvioAutomatico } from '../lib/driveInvio'

export function DriveInvioAuto() {
  const { gate, entry } = useSession()
  const toast = useToast()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : null
  const started = useRef(false)
  useEffect(() => {
    if (!uid || started.current) return
    started.current = true
    void (async () => {
      try {
        const esito = await provaInvioAutomatico(uid, new Date())
        if (esito === 'inviato') toast.show('Backup inviato su Google Drive', 'plain')
      } catch (error) {
        toast.show(messaggioInvio(error), 'plain')
      }
    })()
  }, [uid, toast])
  return null
}
