import { Bell, ChevronRight, IdCard } from 'lucide-react'
import { useContext, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { testoPerLingua } from '../../lib/avvisiSistema'
import { ProfiloContext } from '../layout/ProfiloTestata'
import { Card, Row } from '../ui/Card'
import { IconTile } from '../ui/IconTile'
import { SectionTitle } from '../ui/SectionTitle'

function Voce({ to, icona, titolo, dettaglio, prima }: { to: string; icona: ReactNode; titolo: string; dettaglio?: string; prima: boolean }) {
  return (
    <Row style={{ minHeight: 52, ...(prima ? { borderTop: 'none' } : {}) }}>
      <Link to={to} className="tocco" style={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 44, alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
        <IconTile tone="warn" size="sm">{icona}</IconTile>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 650 }}>{titolo}</span>
          {dettaglio ? <small style={{ color: 'var(--tx3)', overflowWrap: 'anywhere' }}>{dettaglio}</small> : null}
        </span>
        <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
      </Link>
    </Row>
  )
}

/** Il perché del pallino rosso sull'icona del profilo: una riga per motivo, ognuna porta dove si risolve. */
export function DaFare() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const profilo = useContext(ProfiloContext)
  if (!profilo) return null
  const { fiscale, avvisi } = profilo
  if (!fiscale && avvisi.n === 0) return null
  return (
    <>
      <SectionTitle tone="bad">{frasi.tourDaFare}</SectionTitle>
      <Card>
        {fiscale ? (
          <Voce
            prima
            to="/impostazioni/account?scheda=personali&modifica=toelettatura"
            icona={<IdCard size={13} strokeWidth={2} aria-hidden />}
            titolo={frasi.homeAggiungiFiscale}
            dettaglio={frasi.homePerCompletare}
          />
        ) : null}
        {avvisi.n > 0 ? (
          <Voce
            prima={!fiscale}
            to="/impostazioni/avvisi"
            icona={<Bell size={13} strokeWidth={2} aria-hidden />}
            titolo={frasi.hubAvvisiDaLeggere.replace('{{n}}', String(avvisi.n))}
            dettaglio={avvisi.ultimo ? testoPerLingua(avvisi.ultimo, lingua).titolo : undefined}
          />
        ) : null}
      </Card>
    </>
  )
}
