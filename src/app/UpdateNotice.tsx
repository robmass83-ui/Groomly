import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/layout/Sheet'
import { AppInstaller } from '../lib/appInstaller'
import { fetchLatestRelease, isNewerVersion, type AppRelease } from '../lib/appRelease'
import { APP_VERSION } from '../lib/appVersion'

export function downloadLabel(received: number, total: number): string {
  if (total <= 0) return 'Download…'
  const percent = Math.floor((received * 100) / total)
  const clamped = Math.max(0, Math.min(100, percent))
  return `Download ${clamped}%`
}

export function UpdateNotice({ release }: { release?: AppRelease | null }) {
  const [offer, setOffer] = useState<AppRelease | null>(null)
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState('Scarica')
  const [notice, setNotice] = useState<string | null>(null)
  const [awaitingPermission, setAwaitingPermission] = useState(false)
  const shown = useRef(true)

  useEffect(() => {
    if (release !== undefined) {
      setOffer(release && isNewerVersion(release.version, APP_VERSION) ? release : null)
      return
    }
    if (import.meta.env.MODE === 'test') return
    let live = true
    void fetchLatestRelease().then((latest) => {
      if (!live || !latest || !isNewerVersion(latest.version, APP_VERSION)) return
      setOffer(latest)
    })
    return () => {
      live = false
    }
  }, [release])

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return
    let remove = () => {}
    void AppInstaller.addListener('progress', (event) => {
      flushSync(() => setLabel(downloadLabel(event.received, event.total)))
    }).then((handle) => {
      remove = () => {
        void handle.remove()
      }
    })
    let removeResume = () => {}
    void AppInstaller.addListener('resume', (event) => {
      if (event.opened === 'installer') {
        flushSync(() => {
          setAwaitingPermission(false)
          setNotice(null)
          setBusy(false)
          setLabel('Scarica')
        })
      }
    }).then((handle) => {
      removeResume = () => {
        void handle.remove()
      }
    })
    return () => {
      remove()
      removeResume()
    }
  }, [])

  if (!offer || hidden) return null

  async function startDownload() {
    if (!offer) return
    shown.current = true
    setBusy(true)
    setNotice(null)
    setLabel(downloadLabel(0, 0))
    try {
      const result = awaitingPermission
        ? await AppInstaller.installDownloaded()
        : await AppInstaller.downloadAndInstall({ url: offer.url })
      if (!shown.current) return
      if (result.opened === 'settings') {
        setAwaitingPermission(true)
        setNotice('Per installare, consenti le app di Groomly')
      } else if (result.opened === 'none') {
        setAwaitingPermission(false)
        setNotice('Download non riuscito')
      } else {
        setAwaitingPermission(false)
        setNotice(null)
      }
    } catch {
      if (shown.current) setNotice('Download non riuscito')
    } finally {
      if (shown.current) {
        setBusy(false)
        setLabel('Scarica')
      }
    }
  }

  function dismiss() {
    shown.current = false
    if (busy) void AppInstaller.cancel()
    setHidden(true)
  }

  return (
    <Sheet open title="Aggiornamento disponibile" onClose={dismiss}>
      <p style={{ margin: 0 }}>È pronta la versione {offer.version}. Scaricala e installala al posto di questa.</p>
      {notice ? <p style={{ margin: 0 }}>{notice}</p> : null}
      <Button
        disabled={busy}
        onClick={() => {
          if (Capacitor.getPlatform() === 'android') {
            void startDownload()
            return
          }
          void Browser.open({ url: offer.url })
        }}
      >
        {label}
      </Button>
      <Button variant="ghost" onClick={dismiss}>
        Più tardi
      </Button>
    </Sheet>
  )
}
