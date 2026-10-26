import { ChevronRight, Globe, Mail, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Card, Row } from '../components/ui/Card'
import { useFrasi } from '../i18n/LinguaContext'
import { APP_VERSION } from '../lib/appVersion'
import { aggiornamentiApkAttivi } from '../lib/distribuzione'
import { isOperator } from '../lib/salonPath'
import { leggiPrimoDato } from '../lib/primoDato'
import { useSession } from '../hooks/useSession'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const link = { display: 'flex', flex: 1, alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', minHeight: 44 } as const

export function InfoGroomlyPage() {
  const frasi = useFrasi()
  const session = useSession()
  const email = session.gate.kind === 'in' ? session.gate.account.email : null
  const primo = isOperator(email) ? leggiPrimoDato() : null
  return (
    <ShellFrame>
      <Header title={frasi.hubInfoApp} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <Card>
          <Row style={{ borderTop: 'none', minHeight: 52 }}>
            <span style={{ flex: 1 }}>{frasi.infoVersione}</span>
            <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{frasi.infoBuild.replace('{{versione}}', APP_VERSION)}</span>
          </Row>
          {aggiornamentiApkAttivi() ? (
            <Row style={{ minHeight: 52 }}>
              <Link to="/impostazioni/aggiornamenti" style={link}>
                <Sparkles size={14} strokeWidth={2} aria-hidden />
                <span style={{ flex: 1 }}>{frasi.infoNovita}</span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
              </Link>
            </Row>
          ) : (
            <Row style={{ minHeight: 52 }}>
              <Sparkles size={14} strokeWidth={2} aria-hidden />
              <span style={{ flex: 1 }}>{frasi.infoNovita}</span>
              <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{APP_VERSION}</span>
            </Row>
          )}
          <Row style={{ minHeight: 52 }}>
            <a href="https://play.google.com/store/apps/details?id=it.groomly.app" style={link}>
              <Star size={14} strokeWidth={2} aria-hidden />
              <span style={{ flex: 1 }}>{frasi.infoValuta}</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </a>
          </Row>
          <Row style={{ minHeight: 52 }}>
            <a href="mailto:info@groomlyapp.it" style={link}>
              <Mail size={14} strokeWidth={2} aria-hidden />
              <span style={{ flex: 1 }}>{frasi.infoContatto}</span>
              <small style={{ color: 'var(--tx3)' }}>info@groomlyapp.it</small>
            </a>
          </Row>
          <Row style={{ minHeight: 52 }}>
            <a href="https://groomlyapp.it" style={link}>
              <Globe size={14} strokeWidth={2} aria-hidden />
              <span style={{ flex: 1 }}>{frasi.infoSito}</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </a>
          </Row>
        </Card>
        {primo !== null ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.meta }}>{frasi.impPrimoDato.replace('{{ms}}', String(primo))}</p> : null}
      </div>
    </ShellFrame>
  )
}
