import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { firebaseEnabled } from '../data/firebase/enabled'
import { livelloElenco, type FunzioniMappa } from '../lib/funzioniPiano'
import { aprePaywall, statoPiano, type FeatureKey, type ProMain, type StatoPiano } from '../lib/piano'
import { PaywallSheet } from '../components/piano/PaywallSheet'

export type PianoValore = {
  mostraPiani: boolean
  abbonamentiAttivi: boolean
  stato: StatoPiano
  funzioni: FunzioniMappa
  provaUsata: boolean
  paywall: FeatureKey | null
  esitoProva: 'spento' | 'attesa' | 'ok' | 'errore'
  messaggioProva: string
  apriPaywall: (feature: FeatureKey) => void
  chiudiPaywall: () => void
  prova: () => Promise<void>
  avvisa: (feature: FeatureKey) => Promise<void>
  fonte?: string
  statoAbbonamento?: string
  livelloNome?: 'base' | 'pro' | 'salone' | 'vip'
}

const spento: PianoValore = {
  mostraPiani: false,
  abbonamentiAttivi: false,
  stato: statoPiano(undefined, new Date(0)),
  funzioni: {},
  provaUsata: false,
  paywall: null,
  esitoProva: 'spento',
  messaggioProva: '',
  apriPaywall: () => undefined,
  chiudiPaywall: () => undefined,
  prova: async () => undefined,
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

function funzioniDi(data: Record<string, unknown> | null): FunzioniMappa {
  const raw = data?.funzioni
  if (!raw || typeof raw !== 'object') return {}
  const out: FunzioniMappa = {}
  for (const [chiave, valore] of Object.entries(raw)) {
    if (typeof valore === 'boolean') out[chiave] = valore
  }
  return out
}

export function PianoProvider({ children }: { children: ReactNode }) {
  const [pro, setPro] = useState<Record<string, unknown> | null>(null)
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const [paywall, setPaywall] = useState<FeatureKey | null>(null)
  const [esitoProva, setEsitoProva] = useState<'spento' | 'attesa' | 'ok' | 'errore'>('spento')
  const [messaggioProva, setMessaggioProva] = useState('')
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
    const funzioni = funzioniDi(pro)
    const mostraPiani = config?.mostraPiani === true
    return {
      mostraPiani,
      abbonamentiAttivi: config?.abbonamentiAttivi === true,
      stato,
      funzioni,
      provaUsata: pro?.provaUsata === true,
      paywall,
      esitoProva,
      messaggioProva,
      apriPaywall: (feature) => {
        if (!aprePaywall(stato, feature)) return
        setEsitoProva('spento')
        setMessaggioProva('')
        setPaywall(feature)
      },
      chiudiPaywall: () => {
        setPaywall(null)
        setEsitoProva('spento')
        setMessaggioProva('')
      },
      prova: async () => {
        setPaywall('pagella')
        setEsitoProva('attesa')
        setMessaggioProva('')
        try {
          const { callAvviaProva } = await import('../data/firebase/client')
          await callAvviaProva()
          setEsitoProva('ok')
        } catch (error) {
          const testo = error instanceof Error ? error.message.trim() : ''
          const generico = testo === '' || testo.startsWith('Firebase') || testo === 'internal'
          setMessaggioProva(generico ? '' : testo)
          setEsitoProva('errore')
        }
      },
      avvisa: async (feature) => {
        const { scriviInteresse } = await import('../data/firebase/client')
        await scriviInteresse(feature)
      },
      fonte: typeof pro?.fonte === 'string' ? pro.fonte : undefined,
      statoAbbonamento: typeof pro?.stato === 'string' ? pro.stato : undefined,
      livelloNome: livelloElenco(comePro(pro), adesso),
    }
  }, [pro, config, paywall, adesso, esitoProva, messaggioProva])

  function chiudi() {
    setPaywall(null)
    setEsitoProva('spento')
    setMessaggioProva('')
  }

  return (
    <PianoContext.Provider value={valore}>
      {children}
      <PaywallSheet
        open={paywall !== null}
        puoProvare={valore.stato.livello === 'base' && !valore.provaUsata}
        esitoProva={esitoProva}
        messaggioProva={messaggioProva}
        onClose={chiudi}
        onAvvisami={() => {
          if (!paywall) return
          void valore.avvisa(paywall)
          chiudi()
        }}
        onProva={() => { void valore.prova() }}
      />
    </PianoContext.Provider>
  )
}
