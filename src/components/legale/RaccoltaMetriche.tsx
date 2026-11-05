import { useEffect } from 'react'
import { usePiano } from '../../hooks/usePiano'
import { useProfiloMetriche } from '../../hooks/useProfiloMetriche'
import { useSession } from '../../hooks/useSession'
import { useLingua } from '../../i18n/LinguaContext'
import { nomePiano, puoRaccogliere } from '../../lib/metriche'
import { impostaRaccolta } from '../../lib/metricheNative'

/** Tiene la raccolta del telefono allineata a chi è entrato. Non disegna nulla. */
export function RaccoltaMetriche() {
  const { gate } = useSession()
  const { livelloNome } = usePiano()
  const { lingua } = useLingua()
  const profilo = useProfiloMetriche()
  const account = gate.kind === 'in' ? gate.account : null
  // Decidere prima del piano cancellerebbe i crash in attesa di chi ha detto sì.
  const pronto = gate.kind !== 'pending' && (account === null || profilo?.admin === true || livelloNome !== undefined)
  const attiva = profilo !== null && puoRaccogliere(profilo, account?.consensoMetriche)
  const piano = livelloNome === undefined || livelloNome === 'vip' ? null : nomePiano(livelloNome)

  useEffect(() => {
    if (!pronto) return
    void (attiva && piano ? impostaRaccolta(true, { piano, lingua }) : impostaRaccolta(false))
  }, [pronto, attiva, piano, lingua])

  return null
}
