import { useEffect } from 'react'
import { usePiano } from '../../hooks/usePiano'
import { useProfiloMetriche } from '../../hooks/useProfiloMetriche'
import { useSession } from '../../hooks/useSession'
import { useLingua } from '../../i18n/LinguaContext'
import { nomePiano, puoRaccogliere } from '../../lib/metriche'
import { impostaRaccolta } from '../../lib/metricheNative'

/** Tiene la raccolta del telefono allineata a chi è entrato. Non disegna nulla. */
export function RaccoltaMetriche() {
  const session = useSession()
  const { gate } = session
  const { livelloNome, pianoCaricatoPer } = usePiano()
  const { lingua } = useLingua()
  const profilo = useProfiloMetriche()
  const account = gate.kind === 'in' ? gate.account : null
  // Decidere prima del piano cancellerebbe i crash in attesa di chi ha detto sì. Agli altri il piano non serve.
  const pronto = gate.kind !== 'pending'
    && (account === null || profilo?.admin === true || account.role !== 'titolare' || pianoCaricatoPer === account.salonId)
  const attiva = profilo !== null && puoRaccogliere(profilo, account?.consensoMetriche)
  const piano = livelloNome === undefined || livelloNome === 'vip' ? null : nomePiano(livelloNome)

  useEffect(() => {
    if (!pronto) return
    void (attiva && piano ? impostaRaccolta(true, { piano, lingua }) : impostaRaccolta(false))
  }, [pronto, attiva, piano, lingua])

  // La scelta è dell'account: tornando nell'app si legge quella fatta su un altro telefono.
  const uid = account?.role === 'titolare' ? account.uid : null
  useEffect(() => {
    if (!uid || !profilo?.nativo) return
    let vivo = true
    const allinea = () => {
      void import('../../data/firebase/client')
        .then((mod) => mod.rileggiConsensoMetriche())
        .then((consensoMetriche) => {
          const attuale = session.gate.kind === 'in' ? session.gate.account : null
          if (!vivo || !consensoMetriche || !attuale || attuale.consensoMetriche?.at === consensoMetriche.at) return
          session.replaceAccount({ ...attuale, consensoMetriche })
        })
        .catch(() => undefined)
    }
    window.addEventListener('groomlyResume', allinea)
    return () => {
      vivo = false
      window.removeEventListener('groomlyResume', allinea)
    }
  }, [uid, profilo?.nativo, session])

  return null
}
