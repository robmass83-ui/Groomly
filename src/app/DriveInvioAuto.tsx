import { useEffect, useRef } from 'react'
import { useToast } from '../components/layout/Toast'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import { messaggioInvio, provaInvioAutomatico, programmaInvio } from '../lib/driveInvio'

export function DriveInvioAuto() {
  const { gate, entry } = useSession()
  const toast = useToast()
  const frasi = useFrasi()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : null
  const started = useRef(false)
  useEffect(() => {
    if (!uid || started.current) return
    started.current = true
    void (async () => {
      try {
        await programmaInvio(uid)
        const esito = await provaInvioAutomatico(uid, new Date())
        if (esito === 'inviato') toast.show(frasi.impBackupInviato, 'plain')
      } catch (error) {
        toast.show(messaggioInvio(error), 'plain')
      }
    })()
  }, [uid, toast])
  return null
}
