import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { fiscalNoticeVisible } from '../../lib/profile'
import { haAccesso } from '../../lib/piano'
import { pubblicabile } from '../../lib/catalogoPrenotazione'
import { linkPrenotazione, puoAccenderePrenotazioni, SPECIE_PRENOTABILI, specieAccettate, type SpeciePrenotabile } from '../../lib/prenotazionePubblica'
import { MESSAGGIO_SLUG_PRESO, slugAttuale } from '../../lib/slug'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Toggle } from '../ui/Toggle'

/** L’interruttore delle prenotazioni online: cosa manca per accenderle, e accendere pubblica prima il link del salone. */
export function usePrenotazioniOnline() {
  const frasi = useFrasi()
  const piano = usePiano()
  const session = useSession()
  const { settings, save } = useSettings()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const uid = account?.uid ?? ''
  const { services } = useServices(uid)
  const [errore, setErrore] = useState('')
  const visibile = haAccesso(piano.stato, 'prenotazioni')
  const nome = settings.business.salonName.trim()
  const passi = passiCompletamento({
    logo: Boolean(settings.priceSheet?.intestazione.logo),
    indirizzo: settings.business.address.trim().length > 0,
    orari: orariCompilati(settings.orari),
    listino: services.some((servizio) => servizio.active !== false),
    backup: backupImpostato(settings),
    email: session.emailVerified,
    fiscale: !fiscalNoticeVisible(settings.business.vatNumber, settings.business.taxCode),
  })
  const haPrincipale = services.some((servizio) => servizio.kind === 'principale' && servizio.active !== false && pubblicabile({
    id: servizio.id,
    nome: servizio.name,
    kind: servizio.kind,
    minuti: servizio.durationMin,
    prezzo: servizio.price,
  }))
  const decisione = puoAccenderePrenotazioni({
    accesso: haAccesso(piano.stato, 'prenotazioni') || visibile,
    completo: avanzamentoSalone(passi.filter((passo) => passo.id !== 'fiscale')).completo,
    vat: settings.business.vatNumber,
    tax: settings.business.taxCode,
    haPrincipale,
  })

  /** Registra il link e restituisce quello assegnato dal server, vuoto se non c’è nulla da registrare. */
  async function pubblica(): Promise<string> {
    if (!firebaseEnabled() || account?.role !== 'titolare') return ''
    const { callPubblicaSalone } = await import('../../data/firebase/client')
    return callPubblicaSalone(nome)
  }

  function cambia(acceso: boolean) {
    setErrore('')
    if (!acceso) {
      save({ ...settings, prenotazioniOnline: false })
      return
    }
    if (!decisione.ok) return
    void pubblica().then((slug) => {
      save({ ...settings, prenotazioniOnline: true, ...(slug ? { slugPubblico: slug } : {}) })
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : ''
      setErrore(message.includes(MESSAGGIO_SLUG_PRESO) ? message : frasi.authSalvataggio)
    })
  }

  return {
    acceso: settings.prenotazioniOnline === true,
    decisione,
    cambia,
    pubblica,
    errore,
    setErrore,
  }
}

export function LinkCondivisione() {
  const frasi = useFrasi()
  const piano = usePiano()
  const session = useSession()
  const { settings, save, ready } = useSettings()
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const uid = account?.uid ?? ''
  const [copiato, setCopiato] = useState(false)
  const { decisione, pubblica, errore, setErrore } = usePrenotazioniOnline()
  const visibile = haAccesso(piano.stato, 'prenotazioni')
  const collaboratore = account?.role === 'collaboratore'
  const nome = settings.business.salonName.trim()
  const link = linkPrenotazione(slugAttuale(settings.slugPubblico, nome))
  const specie = specieAccettate(settings.speciePrenotabili)

  /** Ricorda il link assegnato dal server, così app e messaggi usano quello con il numero. */
  function ricordaSlug(slug: string) {
    const current = settingsRef.current
    if (slug && current.slugPubblico !== slug) save({ ...current, slugPubblico: slug })
  }

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

  // Il link mostrato deve aprirsi anche con le prenotazioni spente o dopo un cambio di nome: lo registra subito.
  useEffect(() => {
    if (!ready || !visibile || collaboratore || nome === '') return
    let vivo = true
    void pubblica().then((slug) => {
      if (vivo) ricordaSlug(slug)
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : ''
      if (vivo && message.includes(MESSAGGIO_SLUG_PRESO)) setErrore(message)
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, visibile, collaboratore, nome])

  if (!visibile || collaboratore || link === '') return null

  async function copia() {
    setErrore('')
    try {
      const slug = await pubblica()
      ricordaSlug(slug)
      await navigator.clipboard.writeText(linkPrenotazione(slug) || link)
      setCopiato(true)
      window.setTimeout(() => setCopiato(false), 2000)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setErrore(message.includes(MESSAGGIO_SLUG_PRESO) ? message : frasi.authSalvataggio)
    }
  }

  async function condividi() {
    setErrore('')
    let condiviso = link
    try {
      const slug = await pubblica()
      ricordaSlug(slug)
      condiviso = linkPrenotazione(slug) || link
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setErrore(message.includes(MESSAGGIO_SLUG_PRESO) ? message : frasi.authSalvataggio)
      return
    }
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title: nome,
        text: `${frasi.prenotaBio}\n${condiviso}`,
        url: condiviso,
        dialogTitle: frasi.prenotaCondividi,
      })
    } catch (error) {
      const { isShareCancel } = await import('../../lib/shareFile')
      if (isShareCancel(error)) return
      try {
        await navigator.clipboard.writeText(condiviso)
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 700 }}>{frasi.prenotaPer}</span>
          {SPECIE_PRENOTABILI.map((id) => {
            const etichette: Record<SpeciePrenotabile, string> = {
              cane: frasi.prenotaCani,
              gatto: frasi.prenotaGatti,
              altro: frasi.prenotaAltroAnimale,
            }
            const etichetta = etichette[id]
            return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', minHeight: 44, gap: 8 }}>
              <span style={{ flex: 1 }}>{etichetta}</span>
              <Toggle
                checked={specie.includes(id)}
                disabled={specie.length === 1 && specie.includes(id)}
                label={etichetta}
                onChange={(acceso) => {
                  const next = acceso ? specieAccettate([...specie, id]) : specie.filter((voce) => voce !== id)
                  if (next.length === 0) return
                  save({ ...settings, speciePrenotabili: next })
                }}
              />
            </div>
            )
          })}
        </div>
        {decisione.ok ? null : (
          <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>
            {decisione.manca === 'servizi' ? (
              <Link to="/impostazioni/servizi" style={{ color: 'var(--pri)', fontWeight: 700 }}>{frasi.prenotaMancaServizi}</Link>
            ) : decisione.manca === 'fiscale' ? frasi.prenotaMancaFiscale : frasi.prenotaMancaProfilo}
          </p>
        )}
        {errore ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
      </div>
    </Card>
  )
}
