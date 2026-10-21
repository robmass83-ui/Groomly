import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/layout/Dialog'
import { AppInstaller } from '../lib/appInstaller'
import { isNewerVersion, watchLatestRelease, type AppRelease } from '../lib/appRelease'
import { registerUpdatePrompt } from '../lib/updatePrompt'
import { APP_VERSION } from '../lib/appVersion'
import { TYPE } from '../theme/theme'

const UPDATE_NOTIFICATION_ID = 2
const UPDATE_CHANNEL = 'aggiornamenti'
let dismissedVersion: string | null = null
let announcedVersion: string | null = null
let permissionAsked = false

async function announceRelease(version: string): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: UPDATE_CHANNEL,
      name: 'Aggiornamenti',
      importance: 4,
      visibility: 1,
    })
    let permission = await LocalNotifications.checkPermissions()
    if (permission.display !== 'granted') {
      if (permissionAsked) return
      permissionAsked = true
      permission = await LocalNotifications.requestPermissions()
    }
    if (permission.display !== 'granted') return
    await LocalNotifications.schedule({
      notifications: [{
        id: UPDATE_NOTIFICATION_ID,
        title: 'Aggiornamento disponibile',
        body: `È pronta la versione ${version}.`,
        channelId: UPDATE_CHANNEL,
        schedule: { at: new Date(Date.now() + 1000) },
      }],
    })
  } catch {
    return
  }
}

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

  useEffect(() => registerUpdatePrompt((latest) => {
    dismissedVersion = null
    setHidden(false)
    setOffer(latest)
  }), [])

  useEffect(() => {
    if (release !== undefined) {
      if (!release || !isNewerVersion(release.version, APP_VERSION)) {
        setOffer(null)
        return
      }
      if (dismissedVersion === release.version) return
      setHidden(false)
      setOffer(release)
      return
    }
    return watchLatestRelease((latest) => {
      if (!latest || !isNewerVersion(latest.version, APP_VERSION)) return
      if (dismissedVersion === latest.version) return
      setHidden(false)
      setOffer((current) => (current?.version === latest.version && current.url === latest.url ? current : latest))
    })
  }, [release])

  useEffect(() => {
    if (!offer || !Capacitor.isNativePlatform()) return
    if (announcedVersion === offer.version) return
    announcedVersion = offer.version
    void announceRelease(offer.version)
  }, [offer])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let removed = false
    let handle: { remove: () => Promise<void> } | undefined
    void App.addListener('appStateChange', (state) => {
      if (state.isActive) window.dispatchEvent(new Event('groomlyResume'))
    }).then((registeredHandle) => {
      handle = registeredHandle
      if (removed) void registeredHandle.remove()
    })
    return () => {
      removed = true
      if (handle) void handle.remove()
    }
  }, [])

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
    let removeNotice = () => {}
    if (Capacitor.isNativePlatform()) {
      void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        if (event.notification.id !== UPDATE_NOTIFICATION_ID) return
        dismissedVersion = null
        flushSync(() => setHidden(false))
      }).then((handle) => {
        removeNotice = () => {
          void handle.remove()
        }
      })
    }
    return () => {
      remove()
      removeResume()
      removeNotice()
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
    dismissedVersion = offer?.version ?? null
    if (busy) void AppInstaller.cancel()
    setHidden(true)
  }

  const notes = offer.notes ?? []

  return (
    <Dialog open title="Vuoi aggiornare adesso?" onClose={dismiss}>
      <p style={{ margin: 0 }}>È pronta la versione {offer.version}.</p>
      {notes.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: TYPE.base }}>
          {notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      ) : null}
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
    </Dialog>
  )
}
