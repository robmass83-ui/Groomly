import { Header } from '../components/layout/Header'
import { useFrasi } from '../i18n/LinguaContext'
import { SIZES } from '../theme/sizes'
import { ShellFrame } from './ShellFrame'

export function PrivacyPage() {
  const frasi = useFrasi()
  return (
    <ShellFrame>
      <Header title={frasi.privacy} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX }}>
        <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.45 }}>{frasi.prvTesto}</p>
      </div>
    </ShellFrame>
  )
}
