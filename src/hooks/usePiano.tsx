import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { firebaseEnabled } from '../data/firebase/enabled'
import { currentSalonId } from '../data/firebase/salonRoot'
import { livelloElenco } from '../lib/funzioniPiano'
import { leggiConfigTour, type ConfigTour } from '../lib/tourBenvenuto'
import { aprePaywall, provaConcessa, statoPiano, type FeatureKey, type ProMain, type StatoPiano } from '../lib/piano'
import { leggiPausa, type PausaSalone } from '../lib/pausaSalone'
import { salvaPiano } from '../lib/pianoSalvato'
import { offertaPiano } from '../lib/abbonamento'
import { useRuoloSessione, useUidSessione } from './useSession'
import { PaywallSheet } from '../components/piano/PaywallSheet'

export type PianoValore = {
  mostraPiani: boolean
  abbonamentiAttivi: boolean
  tour: ConfigTour
  stato: StatoPiano
  provaUsata: boolean
  provaConcessa: boolean
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
  // false finché il documento del piano del salone non è arrivato: prima il piano non si conosce.
  pronto?: boolean
  // Salone personale in pausa mentre si lavora in un altro; null se non lo è.
  pausa?: PausaSalone | null
}

const spento: PianoValore = {
  mostraPiani: false,
  abbonamentiAttivi: false,
  tour: { acceso: false, dal: null },
  stato: statoPiano(undefined, new Date(0)),
  provaUsata: false,
  provaConcessa: false,
  paywall: null,
  esitoProva: 'spento',
  messaggioProva: '',
  apriPaywall: () => undefined,
  chiudiPaywall: () => undefined,
  prova: async () => undefined,
  avvisa: async () => undefined,
  pausa: null,
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
  const [esitoProva, setEsitoProva] = useState<'spento' | 'attesa' | 'ok' | 'errore'>('spento')
  const [messaggioProva, setMessaggioProva] = useState('')
  const [adesso, setAdesso] = useState(() => new Date())
  const [caricato, setCaricato] = useState(() => !firebaseEnabled())
  const uid = useUidSessione()

  // I giorni della prova e la scadenza seguono l’orologio anche se l’app resta aperta.
  useEffect(() => {
    const aggiorna = () => setAdesso(new Date())
    const timer = window.setInterval(aggiorna, 15 * 60 * 1000)
    document.addEventListener('visibilitychange', aggiorna)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', aggiorna)
    }
  }, [])

  // Il backup notturno non ha Firestore: legge il piano da qui.
  useEffect(() => {
    if (uid && pro) salvaPiano(uid, comePro(pro) ?? null)
  }, [uid, pro])

  useEffect(() => {
    if (!firebaseEnabled()) return
    let stop = () => {}
    let chiuso = false
    let inVolo: string | null = null
    let agganciato: string | null = null
    const scollega = () => {
      stop()
      stop = () => {}
      agganciato = null
    }
    const collega = () => {
      if (chiuso) return
      const id = currentSalonId()
      if (id === agganciato || id === inVolo) return
      scollega()
      if (!id) {
        setPro(null)
        setCaricato(true)
        return
      }
      setCaricato(false)
      const richiesto = id
      inVolo = richiesto
      void import('../data/firebase/client').then(async (mod) => {
        if (chiuso || currentSalonId() !== richiesto) {
          if (inVolo === richiesto) inVolo = null
          return
        }
        const unsub = await mod.listenDocumentoPiano(
          (data) => {
            if (chiuso || currentSalonId() !== richiesto) return
            setPro(data)
            setAdesso(new Date())
            setCaricato(true)
          },
          (data) => { if (!chiuso && currentSalonId() === richiesto) setConfig(data) },
        )
        if (chiuso || currentSalonId() !== richiesto) {
          unsub()
          if (inVolo === richiesto) inVolo = null
          return
        }
        inVolo = null
        agganciato = richiesto
        stop = unsub
      }).catch(() => {
        if (inVolo === richiesto) inVolo = null
      })
    }
    collega()
    const timer = window.setInterval(collega, 400)
    return () => {
      chiuso = true
      window.clearInterval(timer)
      scollega()
    }
  }, [])

  const valore = useMemo<PianoValore>(() => {
    const stato = statoPiano(comePro(pro), adesso)
    const mostraPiani = config?.mostraPiani === true
    return {
      mostraPiani,
      abbonamentiAttivi: config?.abbonamentiAttivi === true,
      tour: leggiConfigTour(config),
      stato,
      provaUsata: pro?.provaUsata === true,
      provaConcessa: provaConcessa(comePro(pro), adesso),
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
      pronto: caricato,
      pausa: leggiPausa(pro?.pausa),
    }
  }, [pro, config, paywall, adesso, esitoProva, messaggioProva, caricato])

  return <PianoContext.Provider value={valore}>{children}</PianoContext.Provider>
}

export function PaywallPiano() {
  const piano = usePiano()
  const navigate = useNavigate()
  const feature = piano.paywall
  const offerta = offertaPiano({ provaConcessa: piano.provaConcessa, abbonamentiAttivi: piano.abbonamentiAttivi, ruolo: useRuoloSessione() })
  return (
    <PaywallSheet
      open={feature !== null || piano.esitoProva !== 'spento'}
      feature={feature}
      mostraProva={offerta.prova}
      abbonamentiAttivi={offerta.acquisto === 'abbonati'}
      esitoProva={piano.esitoProva}
      messaggioProva={piano.messaggioProva}
      onClose={piano.chiudiPaywall}
      onAvvisami={() => {
        if (feature) void piano.avvisa(feature)
        piano.chiudiPaywall()
      }}
      onProva={() => { void piano.prova() }}
      onAbbonati={(percorso) => {
        piano.chiudiPaywall()
        navigate(percorso)
      }}
    />
  )
}
