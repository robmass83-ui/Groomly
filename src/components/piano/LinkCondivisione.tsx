import { useEffect, useRef, useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { useSettings } from '../../hooks/useSettings'
import { useServices } from '../../hooks/useServices'
import { usePiano } from '../../hooks/usePiano'
import { useFrasi } from '../../i18n/LinguaContext'
import { firebaseEnabled } from '../../data/firebase/enabled'
import { conBackupImpostato, backupImpostato } from '../../lib/backupImpostato'
import { avanzamentoSalone, passiCompletamento } from '../../lib/completaSalone'
import { DriveAuth } from '../../lib/driveAuth'
import { orariCompilati } from '../../lib/orari'
import { haAccesso } from '../../lib/piano'
import { funzioneVisibile } from '../../lib/funzioniPiano'
import { linkPrenotazione, puoAccenderePrenotazioni } from '../../lib/prenotazionePubblica'
import { MESSAGGIO_SLUG_PRESO, slugDaNome } from '../../lib/slug'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Toggle } from '../ui/Toggle'

export function LinkCondivisione() {
  const frasi = useFrasi()
  const piano = usePiano()
  const session = useSession()
  const { settings, save, ready } = useSettings()
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const uid = account?.uid ?? ''
  const { services } = useServices(uid)
  const [copiato, setCopiato] = useState(false)
  const [errore, setErrore] = useState('')
  const visibile = funzioneVisibile(piano.stato, piano.funzioni, 'prenotazioni')
  const collaboratore = account?.role === 'collaboratore'
  const nome = settings.business.salonName.trim()
  const link = linkPrenotazione(slugDaNome(nome))
  const passi = passiCompletamento({
    logo: Boolean(settings.priceSheet?.intestazione.logo),
    indirizzo: settings.business.address.trim().length > 0,
    orari: orariCompilati(settings.orari),
    listino: services.some((servizio) => servizio.active !== false),
    backup: backupImpostato(settings),
    email: session.emailVerified,
  })
  const decisione = puoAccenderePrenotazioni({
    accesso: haAccesso(piano.stato, 'prenotazioni') || visibile,
    completo: avanzamentoSalone(passi).completo,
    vat: settings.business.vatNumber,
    tax: settings.business.taxCode,
  })

  useEffect(() => {
    if (!uid || !ready) return
    let vivo = true
    void DriveAuth.leggi({ uid }).then((account) => {
      if (!vivo || !account.collegato) return
      const current = settingsRef.current
      const next = conBackupImpostato(current, true)
      if (next !== current) save(next)
    }).catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [uid, ready, save])

  if (!visibile || collaboratore || link === '') return null

  async function pubblica() {
    if (!firebaseEnabled() || account?.role !== 'titolare') return
    const { callPubblicaSalone } = await import('../../data/firebase/client')
    await callPubblicaSalone(nome)
  }

  async function copia() {
    setErrore('')
    try {
      await pubblica()
      await navigator.clipboard.writeText(link)
      setCopiato(true)
      window.setTimeout(() => setCopiato(false), 2000)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setErrore(message.includes(MESSAGGIO_SLUG_PRESO) ? message : frasi.authSalvataggio)
    }
  }

  async function condividi() {
    setErrore('')
    try {
      await pubblica()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setErrore(message.includes(MESSAGGIO_SLUG_PRESO) ? message : frasi.authSalvataggio)
      return
    }
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title: nome,
        text: `${frasi.prenotaBio}\n${link}`,
        url: link,
        dialogTitle: frasi.prenotaCondividi,
      })
    } catch (error) {
      const { isShareCancel } = await import('../../lib/shareFile')
      if (isShareCancel(error)) return
      try {
        await navigator.clipboard.writeText(link)
        setCopiato(true)
        window.setTimeout(() => setCopiato(false), 2000)
      } catch {
        setErrore(frasi.authSalvataggio)
      }
    }
  }

  return (
    <Card id="prenotazioni-online">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
        <span style={{ fontWeight: 700 }}>{frasi.prenotazioniOnline}</span>
        <p style={{ margin: 0, padding: '10px 12px', borderRadius: 10, background: 'var(--pri-s)', color: 'var(--pri-ink)', fontWeight: 700, lineHeight: 1.35, overflowWrap: 'anywhere', userSelect: 'text' }}>{link}</p>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.4 }}>{frasi.prenotaBio}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => { void copia() }} style={{ flex: 1 }}>{copiato ? frasi.prenotaCopiato : frasi.prenotaCopia}</Button>
          <Button onClick={() => { void condividi() }} style={{ flex: 1 }}>{frasi.prenotaCondividi}</Button>
        </div>
        {decisione.ok ? (
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 44, gap: 8 }}>
            <span style={{ flex: 1 }}>{frasi.prenotaInterruttore}</span>
            <Toggle
              checked={settings.prenotazioniOnline === true}
              label={frasi.prenotaInterruttore}
              onChange={(acceso) => {
                if (acceso) {
                  void pubblica().then(() => {
                    save({ ...settings, prenotazioniOnline: true })
                  }).catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : ''
                    setErrore(message.includes(MESSAGGIO_SLUG_PRESO) ? message : frasi.authSalvataggio)
                  })
                  return
                }
                save({ ...settings, prenotazioniOnline: false })
              }}
            />
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>
            {decisione.manca === 'fiscale' ? frasi.prenotaMancaFiscale : frasi.prenotaMancaProfilo}
          </p>
        )}
        {errore ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
      </div>
    </Card>
  )
}
