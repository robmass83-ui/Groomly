import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAdminDati } from '../../components/admin/AdminDati'
import { RIGA } from '../../components/admin/comuni'
import { CardTour } from '../../components/admin/PanoramicaAdmin'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { Card, Row } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { useFrasi } from '../../i18n/LinguaContext'
import { APP_VERSION } from '../../lib/appVersion'
import { TETTO_EMAIL_GIORNO } from '../../lib/promemoriaEmail'
import { CORPO } from './comune'

const RELEASE = 'https://groomlyapp.it/release.json'
const TRATTINO = '—'
const LINK: [string, string][] = [
  ['Firebase', 'https://console.firebase.google.com/project/groomly-3128b'],
  ['Play Console', 'https://play.google.com/console'],
  ['Brevo', 'https://app.brevo.com'],
  ['RevenueCat', 'https://app.revenuecat.com'],
]

export function SistemaPage() {
  const frasi = useFrasi()
  const { config, contatori } = useAdminDati()
  const [pubblicata, setPubblicata] = useState<string | null>(null)
  const [letta, setLetta] = useState(false)

  useEffect(() => {
    let vivo = true
    void fetch(RELEASE, { cache: 'no-store' })
      .then((risposta) => risposta.json() as Promise<{ version?: unknown }>)
      .then((dati) => { if (vivo && typeof dati.version === 'string') setPubblicata(dati.version) })
      .catch(() => undefined)
      .finally(() => { if (vivo) setLetta(true) })
    return () => { vivo = false }
  }, [])

  return (
    <>
      <TestataAdmin titolo={frasi.consSistema} />
      <div style={{ ...CORPO, maxWidth: 720 }}>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>{frasi.consVersione}</span>
            <strong>{APP_VERSION}</strong>
          </Row>
          <Row>
            <span style={{ flex: 1 }}>{frasi.consPubblicata}</span>
            <strong>{pubblicata ?? (letta ? TRATTINO : '')}</strong>
          </Row>
          {contatori ? (
            <Row>
              <span>{frasi.consEmailOggi.replace('{{n}}', String(contatori.emailOggi)).replace('{{tetto}}', String(TETTO_EMAIL_GIORNO))}</span>
            </Row>
          ) : null}
          {contatori && contatori.feedbackOrfani > 0 ? (
            <Row>
              <span>{frasi.consFeedbackOrfani.replace('{{n}}', String(contatori.feedbackOrfani))}</span>
            </Row>
          ) : null}
        </Card>
        {config?.tour ? <CardTour tour={config.tour} /> : null}
        <SectionTitle color="var(--tx3)">{frasi.consCollegamenti}</SectionTitle>
        <Card>
          {LINK.map(([nome, indirizzo], indice) => (
            <a key={nome} href={indirizzo} target="_blank" rel="noreferrer" style={{ ...RIGA, borderTop: indice === 0 ? 'none' : RIGA.borderTop, textDecoration: 'none' }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{nome}</span>
              <ExternalLink size={15} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </a>
          ))}
        </Card>
      </div>
    </>
  )
}
