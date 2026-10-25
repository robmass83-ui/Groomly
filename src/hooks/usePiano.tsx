import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { firebaseEnabled } from '../data/firebase/enabled'
import { aprePaywall, statoPiano, type FeatureKey, type ProMain, type StatoPiano } from '../lib/piano'
import { PaywallSheet } from '../components/piano/PaywallSheet'

export type PianoValore = {
  mostraPiani: boolean
  abbonamentiAttivi: boolean
  stato: StatoPiano
  provaUsata: boolean
  paywall: FeatureKey | null
  apriPaywall: (feature: FeatureKey) => void
  chiudiPaywall: () => void
  avvisa: (feature: FeatureKey) => Promise<void>
}

const spento: PianoValore = {
  mostraPiani: false,
  abbonamentiAttivi: false,
  stato: statoPiano(undefined, new Date(0)),
  provaUsata: false,
  paywall: null,
  apriPaywall: () => undefined,
  chiudiPaywall: () => undefined,
  avvisa: async () => undefined,
}

const PianoContext = createContext<PianoValore>(spento)

export function usePiano(): PianoValore {
  return useContext(PianoContext)
}

function comePro(data: Record<string, unknown> | null): ProMain | undefined {
  if (!data) return undefined
  return data as ProMain
}

export function PianoProvider({ children }: { children: ReactNode }) {
  const [pro, setPro] = useState<Record<string, unknown> | null>(null)
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const [paywall, setPaywall] = useState<FeatureKey | null>(null)
  const [adesso] = useState(() => new Date())

  useEffect(() => {
    if (!firebaseEnabled()) return
    let stop: () => void = () => undefined
    let chiuso = false
    void import('../data/firebase/client').then(async (mod) => {
      const unsub = await mod.listenDocumentoPiano(
        (data) => { if (!chiuso) setPro(data) },
        (data) => { if (!chiuso) setConfig(data) },
      )
      if (chiuso) unsub()
      else stop = unsub
    }).catch(() => undefined)
    return () => {
      chiuso = true
      stop()
    }
  }, [])

  const valore = useMemo<PianoValore>(() => {
    const stato = statoPiano(comePro(pro), adesso)
    const mostraPiani = config?.mostraPiani === true
    return {
      mostraPiani,
      abbonamentiAttivi: config?.abbonamentiAttivi === true,
      stato,
      provaUsata: pro?.provaUsata === true,
      paywall,
      apriPaywall: (feature) => {
        if (!aprePaywall(stato, feature)) return
        setPaywall(feature)
      },
      chiudiPaywall: () => setPaywall(null),
      avvisa: async (feature) => {
        const { scriviInteresse } = await import('../data/firebase/client')
        await scriviInteresse(feature)
      },
    }
  }, [pro, config, paywall, adesso])

  return (
    <PianoContext.Provider value={valore}>
      {children}
      <PaywallSheet
        open={paywall !== null && !valore.abbonamentiAttivi}
        puoProvare={valore.stato.livello === 'base' && !valore.provaUsata}
        onClose={() => setPaywall(null)}
        onAvvisami={() => {
          if (!paywall) return
          void valore.avvisa(paywall)
          setPaywall(null)
        }}
        onProva={() => {
          void import('../data/firebase/client')
            .then((mod) => mod.callAvviaProva())
            .then(() => setPaywall(null))
            .catch(() => undefined)
        }}
      />
    </PianoContext.Provider>
  )
}
