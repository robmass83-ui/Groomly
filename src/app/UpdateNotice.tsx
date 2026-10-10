import { Browser } from '@capacitor/browser'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/layout/Sheet'
import { fetchLatestRelease, isNewerVersion, type AppRelease } from '../lib/appRelease'
import { APP_VERSION } from '../lib/appVersion'

export function UpdateNotice({ release }: { release?: AppRelease | null }) {
  const [offer, setOffer] = useState<AppRelease | null>(null)
  const [hidden, setHidden] = useState(false)

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

  if (!offer || hidden) return null

  return (
    <Sheet open title="Aggiornamento disponibile" onClose={() => setHidden(true)}>
      <p style={{ margin: 0 }}>È pronta la versione {offer.version}. Scaricala e installala al posto di questa.</p>
      <Button
        onClick={() => {
          void Browser.open({ url: offer.url })
        }}
      >
        Scarica
      </Button>
      <Button variant="ghost" onClick={() => setHidden(true)}>Più tardi</Button>
    </Sheet>
  )
}
