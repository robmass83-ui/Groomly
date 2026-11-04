import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { firebaseEnabled } from '../../data/firebase/enabled'
import { usePiano } from '../../hooks/usePiano'
import { useSession } from '../../hooks/useSession'
import { avvisiBeta, type AvvisoBeta } from '../../lib/avvisiBeta'
import type { InvitoBeta } from '../../lib/betaInvito'
import { faseBeta, STATO_BETA_VUOTO, type StatoBeta } from '../../lib/faseBeta'

export type ValoreBeta = StatoBeta & {
  pronto: boolean
  // Solo il titolare del suo salone legge l'invito (regole di betaInviti).
  titolare: boolean
  salonId: string
  avvisi: AvvisoBeta[]
  letti: ReadonlySet<string>
  nonLetti: number
  segnaLetto: (...ids: string[]) => void
  feedbackInviatoIl: number | null
  ricordaFeedback: () => void
}

export const VALORE_BETA_VUOTO: ValoreBeta = {
  ...STATO_BETA_VUOTO,
  pronto: true,
  titolare: false,
  salonId: '',
  avvisi: [],
  letti: new Set(),
  nonLetti: 0,
  segnaLetto: () => undefined,
  feedbackInviatoIl: null,
  ricordaFeedback: () => undefined,
}

export const BetaContext = createContext<ValoreBeta>(VALORE_BETA_VUOTO)

export function useBeta(): ValoreBeta {
  return useContext(BetaContext)
}

export const chiaveBeta = (salonId: string, nome: string) => `groomly.beta.${salonId}.${nome}`

function leggi(chiave: string): string | null {
  try {
    return localStorage.getItem(chiave)
  } catch {
    return null
  }
}

function scrivi(chiave: string, valore: string) {
  try {
    localStorage.setItem(chiave, valore)
  } catch {
    // Spazio pieno o storage spento: si perde solo il segno di lettura.
  }
}

function leggiLetti(salonId: string): Set<string> {
  try {
    const lista: unknown = JSON.parse(leggi(chiaveBeta(salonId, 'letti')) ?? '[]')
    return new Set(Array.isArray(lista) ? lista.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function leggiNumero(chiave: string): number | null {
  const valore = Number(leggi(chiave))
  return leggi(chiave) !== null && Number.isFinite(valore) ? valore : null
}

export function BetaProvider({ children }: { children: ReactNode }) {
  const session = useSession()
  const piano = usePiano()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const salonId = account ? account.salonId || account.uid : ''
  const titolare = !!account && (account.role === undefined || account.role === 'titolare') && salonId === account.uid
  const [invito, setInvito] = useState<InvitoBeta | null>(null)
  const [invitoPronto, setInvitoPronto] = useState(false)
  const [adesso, setAdesso] = useState(() => new Date())
  const [letti, setLetti] = useState<Set<string>>(() => new Set())
  const [feedbackInviatoIl, setFeedbackInviatoIl] = useState<number | null>(null)

  useEffect(() => {
    const aggiorna = () => setAdesso(new Date())
    const timer = window.setInterval(aggiorna, 15 * 60 * 1000)
    document.addEventListener('visibilitychange', aggiorna)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', aggiorna)
    }
  }, [])

  useEffect(() => {
    setLetti(salonId ? leggiLetti(salonId) : new Set())
    setFeedbackInviatoIl(salonId ? leggiNumero(chiaveBeta(salonId, 'feedbackIl')) : null)
  }, [salonId])

  useEffect(() => {
    setInvito(null)
    if (!titolare || !salonId || !firebaseEnabled()) {
      setInvitoPronto(true)
      return
    }
    setInvitoPronto(false)
    let vivo = true
    let stop = () => {}
    void import('../../data/firebase/betaClient')
      .then(async ({ listenInvitoBeta }) => {
        const unsub = await listenInvitoBeta(salonId, (dato) => {
          if (!vivo) return
          setInvito(dato)
          setAdesso(new Date())
          setInvitoPronto(true)
        })
        if (vivo) stop = unsub
        else unsub()
      })
      .catch(() => { if (vivo) setInvitoPronto(true) })
    return () => {
      vivo = false
      stop()
    }
  }, [titolare, salonId])

  const segnaLetto = useCallback((...ids: string[]) => {
    if (!salonId) return
    setLetti((prima) => {
      if (ids.every((id) => prima.has(id))) return prima
      const dopo = new Set([...prima, ...ids])
      scrivi(chiaveBeta(salonId, 'letti'), JSON.stringify([...dopo]))
      return dopo
    })
  }, [salonId])

  const ricordaFeedback = useCallback(() => {
    if (!salonId) return
    const ora = Date.now()
    scrivi(chiaveBeta(salonId, 'feedbackIl'), String(ora))
    setFeedbackInviatoIl(ora)
  }, [salonId])

  const valore = useMemo<ValoreBeta>(() => {
    const stato = faseBeta({ invito: titolare ? invito : null, stato: piano.stato, traccia: piano.traccia ?? {}, adesso })
    const avvisi = avvisiBeta(stato, adesso, { feedbackInviatoIl })
    return {
      ...stato,
      pronto: invitoPronto && piano.pronto !== false,
      titolare,
      salonId,
      avvisi,
      letti,
      nonLetti: avvisi.filter((avviso) => !letti.has(avviso.id)).length,
      segnaLetto,
      feedbackInviatoIl,
      ricordaFeedback,
    }
  }, [invito, invitoPronto, titolare, salonId, piano.stato, piano.traccia, piano.pronto, adesso, letti, feedbackInviatoIl, segnaLetto, ricordaFeedback])

  return <BetaContext.Provider value={valore}>{children}</BetaContext.Provider>
}
