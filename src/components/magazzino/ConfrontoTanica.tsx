import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import type { Confronto } from '../../lib/stimeMagazzino'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'

export function ConfrontoTanica({ confronto, onRisposta }: { confronto: Confronto; onRisposta: (aggiorna: boolean) => void }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  return (
    <Dialog open title={frasi.magConfrontoTitolo} onClose={() => onRisposta(false)}>
      <p style={{ margin: 0, color: 'var(--tx2)' }}>{t(lingua, 'magConfronto', { reali: confronto.reali, stima: confronto.stima })}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button type="button" variant="ghost" onClick={() => onRisposta(false)}>{frasi.magConfrontoNo}</Button>
        <Button type="button" onClick={() => onRisposta(true)}>{frasi.magConfrontoSi}</Button>
      </div>
    </Dialog>
  )
}
