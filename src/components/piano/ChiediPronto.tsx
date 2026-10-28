import { t } from '../../i18n/t'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { TYPE } from '../../theme/theme'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'

export function ChiediPronto({
  nomeCane,
  inInvio,
  onInvia,
  onChiudi,
}: {
  nomeCane: string | null
  inInvio: boolean
  onInvia: () => void
  onChiudi: () => void
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  return (
    <Dialog open={nomeCane !== null} title={frasi.strumPronto} onClose={inInvio ? () => undefined : onChiudi} portal>
      <p style={{ margin: 0, fontSize: TYPE.base, lineHeight: 1.4 }}>
        {t(lingua, 'prontoMailDomanda', { cane: nomeCane ?? '' })}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="lg" variant="secondary" disabled={inInvio} onClick={onChiudi} style={{ flex: '1 1 0' }}>
          {frasi.prontoMailNo}
        </Button>
        <Button size="lg" variant="primary" disabled={inInvio} onClick={onInvia} style={{ flex: '1 1 0' }}>
          {inInvio ? frasi.codaInvio : frasi.codaInvia}
        </Button>
      </div>
    </Dialog>
  )
}
