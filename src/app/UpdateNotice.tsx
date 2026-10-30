import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/layout/Dialog'
import { AppInstaller } from '../lib/appInstaller'
import { isNewerVersion, urlApkConsentito, watchLatestRelease, type AppRelease } from '../lib/appRelease'
import { shouldScheduleLocalUpdate } from '../lib/pushDevice'
import { registerUpdatePrompt } from '../lib/updatePrompt'
import { APP_VERSION } from '../lib/appVersion'
import { useFrasi } from '../i18n/LinguaContext'
import { leggiLinguaAttiva } from '../i18n/linguaLocale'
import { t } from '../i18n/t'
import { TYPE } from '../theme/theme'

const UPDATE_NOTIFICATION_ID = 2
const UPDATE_CHANNEL = 'aggiornamenti'
let dismissedVersion: string | null = null
let rememberedRelease: AppRelease | null = null
const announcedVersions = new Set<string>()
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
    const lingua = leggiLinguaAttiva()
    await LocalNotifications.schedule({
      notifications: [{
        id: UPDATE_NOTIFICATION_ID,
        title: t(lingua, 'pushAggiornamento'),
        body: t(lingua, 'aggPronta', { version }),
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
  const frasi = useFrasi()
  const [offer, setOffer] = useState<AppRelease | null>(null)
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState('Scarica')
  const [notice, setNotice] = useState<string | null>(null)
  const [awaitingPermission, setAwaitingPermission] = useState(false)
  const shown = useRef(true)

  useEffect(() => registerUpdatePrompt((latest) => {
    if (!urlApkConsentito(latest.url) || !isNewerVersion(latest.version, APP_VERSION)) return
    dismissedVersion = null
    rememberedRelease = latest
    setHidden(false)
    setOffer(latest)
  }), [])

  useEffect(() => {
    if (release !== undefined) {
      if (!release || !isNewerVersion(release.version, APP_VERSION) || !urlApkConsentito(release.url)) {
        setOffer(null)
        return
      }
      rememberedRelease = release
      if (dismissedVersion === release.version) return
      setHidden(false)
      setOffer(release)
      return
    }
    return watchLatestRelease((latest) => {
      if (!latest || !isNewerVersion(latest.version, APP_VERSION) || !urlApkConsentito(latest.url)) return
      rememberedRelease = latest
      if (dismissedVersion === latest.version) return
      setHidden(false)
      setOffer((current) => (current?.version === latest.version && current.url === latest.url ? current : latest))
    })
  }, [release])

  useEffect(() => {
    if (!offer || !Capacitor.isNativePlatform()) return
    const pushUpdatesReady = localStorage.getItem('groomly.pushUpdatesReady') === '1'
    if (!shouldScheduleLocalUpdate(true, pushUpdatesReady)) return
    if (announcedVersions.has(offer.version)) return
    announcedVersions.add(offer.version)
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
    let removed = false
    let progressHandle: { remove: () => Promise<void> } | undefined
    void AppInstaller.addListener('progress', (event) => {
      flushSync(() => setLabel(downloadLabel(event.received, event.total)))
    }).then((registeredHandle) => {
      progressHandle = registeredHandle
      if (removed) void registeredHandle.remove()
    })
    let resumeHandle: { remove: () => Promise<void> } | undefined
    void AppInstaller.addListener('resume', (event) => {
      if (event.opened === 'installer') {
        flushSync(() => {
          setAwaitingPermission(false)
          setNotice(null)
          setBusy(false)
          setLabel('Scarica')
        })
      }
    }).then((registeredHandle) => {
      resumeHandle = registeredHandle
      if (removed) void registeredHandle.remove()
    })
    let noticeHandle: { remove: () => Promise<void> } | undefined
    if (Capacitor.isNativePlatform()) {
      void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        if (event.notification.id !== UPDATE_NOTIFICATION_ID) return
        dismissedVersion = null
        flushSync(() => {
          setHidden(false)
          if (rememberedRelease && isNewerVersion(rememberedRelease.version, APP_VERSION)) {
            setOffer(rememberedRelease)
          }
        })
      }).then((registeredHandle) => {
        noticeHandle = registeredHandle
        if (removed) void registeredHandle.remove()
      })
    }
    return () => {
      removed = true
      if (progressHandle) void progressHandle.remove()
      if (resumeHandle) void resumeHandle.remove()
      if (noticeHandle) void noticeHandle.remove()
    }
  }, [])

  if (!offer || hidden) return null

  async function startDownload() {
    if (!offer || !urlApkConsentito(offer.url)) return
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
    <Dialog open title={frasi.aggAdesso} onClose={dismiss}>
      <p style={{ margin: 0 }}>{frasi.aggPronta.replace('{{version}}', offer.version)}</p>
      {notes.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: TYPE.base }}>
          {notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      ) : null}
      {notice ? <p style={{ margin: 0 }}>{notice}</p> : null}
      <Button
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={() => {
          if (!urlApkConsentito(offer.url)) return
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
