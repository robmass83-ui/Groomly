import { useCallback, useEffect, useMemo, useState } from 'react'
import { firebaseEnabled } from '../data/firebase/enabled'
import { unisciAvvisi, type AvvisoSistema } from '../lib/avvisiSistema'

/** Avvisi di Groomly, a tutti e del solo account, e segno di lettura dell'account. Senza cloud non ci sono avvisi. */
export function useAvvisiSistema(uid: string): { avvisi: AvvisoSistema[]; lettiFino: number; pronti: boolean; segnaLetti: (fino: number) => void } {
  const [globali, setGlobali] = useState<AvvisoSistema[]>([])
  const [propri, setPropri] = useState<AvvisoSistema[]>([])
  const [lettiFino, setLettiFino] = useState(0)
  const [avvisiPronti, setAvvisiPronti] = useState(false)
  const [lettiPronti, setLettiPronti] = useState(false)

  useEffect(() => {
    if (!uid || !firebaseEnabled()) {
      setGlobali([])
      setPropri([])
      setLettiFino(0)
      setAvvisiPronti(true)
      setLettiPronti(true)
      return
    }
    let vivo = true
    const ferma: Array<() => void> = []
    const tieni = (stop: () => void) => {
      if (vivo) ferma.push(stop)
      else stop()
    }
    void import('../data/firebase/client')
      .then(async (client) => {
        tieni(await client.listenAvvisiSistema((lista) => {
          if (!vivo) return
          setGlobali(lista)
          setAvvisiPronti(true)
        }))
        tieni(await client.listenAvvisiAccount(uid, (lista) => {
          if (vivo) setPropri(lista)
        }))
        tieni(await client.listenAvvisiLetti(uid, (fino) => {
          if (!vivo) return
          setLettiFino(fino)
          setLettiPronti(true)
        }))
      })
      .catch(() => {
        if (!vivo) return
        setAvvisiPronti(true)
        setLettiPronti(true)
      })
    return () => {
      vivo = false
      for (const stop of ferma) stop()
    }
  }, [uid])

  const segnaLetti = useCallback((fino: number) => {
    if (!uid || !firebaseEnabled()) return
    setLettiFino((prima) => Math.max(prima, fino))
    void import('../data/firebase/client')
      .then((client) => client.segnaAvvisiLetti(uid, fino))
      .catch(() => {})
  }, [uid])

  const avvisi = useMemo(() => unisciAvvisi(globali, propri), [globali, propri])

  return { avvisi, lettiFino, pronti: avvisiPronti && lettiPronti, segnaLetti }
}
