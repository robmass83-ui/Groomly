import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { en } from './en'
import { es } from './es'
import { it } from './it'
import { leggiLinguaAttiva, scriviLinguaLocale } from './linguaLocale'
import type { Lingua } from './lingua'

const cataloghi = { it, en, es }

type Api = {
  lingua: Lingua
  scegli: (lingua: Lingua) => void
}

const Contesto = createContext<Api>({ lingua: 'it', scegli: () => undefined })

export function LinguaProvider({ children }: { children: ReactNode }) {
  const [lingua, setLingua] = useState<Lingua>(() => leggiLinguaAttiva())
  const api = useMemo<Api>(() => ({
    lingua,
    scegli: (prossima) => {
      scriviLinguaLocale(prossima)
      setLingua(prossima)
    },
  }), [lingua])
  return <Contesto.Provider value={api}>{children}</Contesto.Provider>
}

export function useLingua(): Api {
  return useContext(Contesto)
}

export function useFrasi() {
  const { lingua } = useLingua()
  return cataloghi[lingua]
}
