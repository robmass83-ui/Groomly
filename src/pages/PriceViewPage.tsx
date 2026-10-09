import { useSearchParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { getSettings, type PriceFile, type SettingsMain } from '../data/local/settings'
import { useSession } from '../hooks/useSession'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

function findPrice(settings: SettingsMain | null, id: string | null): PriceFile | undefined {
  if (!settings) return undefined
  if (!id) return settings.priceList
  if (settings.priceList?.id === id) return settings.priceList
  return settings.priceListHistory.find((item) => item.id === id)
}

export function PriceViewPage() {
  const [params] = useSearchParams()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const settings = uid ? getSettings(uid) : null
  const file = findPrice(settings, params.get('id'))
  const image = file?.mime.startsWith('image/') === true
  return (
    <ShellFrame>
      <Header title="Listino" backTo="/listino" />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 24px` }}>
        {file ? (
          image ? (
            <img alt={file.fileName} src={file.dataUrl} style={{ width: '100%' }} />
          ) : (
            <iframe title="Listino" src={file.dataUrl} style={{ width: '100%', height: 480, border: 0 }} />
          )
        ) : (
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun file</p>
        )}
      </div>
    </ShellFrame>
  )
}
