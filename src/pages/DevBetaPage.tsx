import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Vetrina } from '../components/abbonamento/Vetrina'
import { BetaContext, type ValoreBeta } from '../components/beta/BetaProvider'
import { invitoDiProva, pianoFinto, valoreBeta } from '../components/beta/provaBeta'
import { PianoContext } from '../hooks/usePiano'
import { avvisiBeta } from '../lib/avvisiBeta'
import type { InvitoBeta } from '../lib/betaInvito'
import { CONFIG_PIANI_DEFAULT } from '../lib/configPiani'
import { faseBeta } from '../lib/faseBeta'
import { livelloElenco } from '../lib/funzioniPiano'
import { statoPiano, type ProMain } from '../lib/piano'
import { AbbonamentoPage } from './AbbonamentoPage'
import { AvvisiSistemaPage } from './AvvisiSistemaPage'
import { BetaFeedbackPage } from './BetaFeedbackPage'
import { BetaFinePage } from './BetaFinePage'
import { BetaInvitoPage } from './BetaInvitoPage'
import { HomePage } from './HomePage'
import { SettingsPage } from './SettingsPage'

// Solo in sviluppo (/dev/beta): le schermate vere della beta con uno stato finto, per il controllo grafico.
// ?scena=nessuna|invito|beta|ultimo|finita|revocata|scaduto &piano=pro|salone &pagina=home|avvisi|invito|impostazioni|abbonamento|feedback|fine|vetrina
const GIORNO = 24 * 60 * 60 * 1000

function scenario(scena: string, piano: 'pro' | 'salone', adesso: Date): { pro: ProMain | undefined; invito: InvitoBeta | null } {
  const tra = (giorni: number) => new Date(adesso.getTime() + giorni * GIORNO).toISOString()
  const traccia = (fine: number): ProMain => ({ exBeta: true, betaPiano: piano, betaDal: tra(fine - 30), betaFinoAl: tra(fine), earlyAdopter: true })
  const attiva = (fine: number): ProMain => ({ piano, stato: 'attivo', fonte: 'beta', scadeIl: tra(fine), rinnovoAutomatico: false, provaUsata: true, ...(piano === 'salone' ? { seatsIncluded: 3 } : {}), ...traccia(fine) })
  const invito = (campi: Partial<InvitoBeta>) => invitoDiProva({ salonId: 'dev', piano, messaggio: 'Ci farebbe piacere sapere cosa ne pensi: sei tra i primi a provarlo!', ...campi }, adesso)
  switch (scena) {
    case 'invito': return { pro: undefined, invito: invito({}) }
    case 'scaduto': return { pro: undefined, invito: invito({ stato: 'scaduto' }) }
    case 'beta': return { pro: attiva(18), invito: invito({ stato: 'accettato' }) }
    case 'ultimo': return { pro: attiva(1), invito: invito({ stato: 'accettato' }) }
    case 'finita': return { pro: { piano: 'base', stato: 'scaduto', ...traccia(-2) }, invito: invito({ stato: 'accettato' }) }
    case 'revocata': return { pro: { piano: 'base', stato: 'scaduto', ...traccia(12) }, invito: invito({ stato: 'revocato', revocatoIl: tra(-1) }) }
    default: return { pro: undefined, invito: null }
  }
}

const PAGINE: Record<string, () => ReactNode> = {
  home: () => <HomePage />,
  avvisi: () => <AvvisiSistemaPage />,
  invito: () => <BetaInvitoPage />,
  impostazioni: () => <SettingsPage />,
  abbonamento: () => <AbbonamentoPage />,
  feedback: () => <BetaFeedbackPage />,
  fine: () => <BetaFinePage />,
  vetrina: () => <Vetrina piano="plus" />,
  'vetrina-salone': () => <Vetrina piano="salone" />,
}

export function DevBetaPage() {
  const [parametri] = useSearchParams()
  const scena = parametri.get('scena') ?? 'invito'
  const piano = parametri.get('piano') === 'salone' ? 'salone' : 'pro'
  const pagina = parametri.get('pagina') ?? 'home'
  const prezzi = parametri.get('prezzi') === '1'
  const valori = useMemo(() => {
    const adesso = new Date()
    const { pro, invito } = scenario(scena, piano, adesso)
    const configPiani = { ...CONFIG_PIANI_DEFAULT, showPrezziInBeta: prezzi, offertaEarlyAdopter: { it: 'Prezzo fondatori: −30% sul primo anno', en: 'Founders’ price: −30% for the first year', es: 'Precio fundadores: −30% el primer año' } }
    const pianoValore = pianoFinto({ livelloNome: livelloElenco(pro, adesso), configPiani }, pro, adesso)
    const stato = faseBeta({ invito, stato: statoPiano(pro, adesso), traccia: pro ?? {}, adesso })
    const avvisi = avvisiBeta(stato, adesso, {})
    const beta: ValoreBeta = valoreBeta({ ...stato, salonId: 'dev', avvisi, nonLetti: avvisi.length })
    return { pianoValore, beta }
  }, [scena, piano, prezzi])
  const Pagina = PAGINE[pagina] ?? PAGINE.home
  return (
    <PianoContext.Provider value={valori.pianoValore}>
      <BetaContext.Provider value={valori.beta}>
        <Pagina />
      </BetaContext.Provider>
    </PianoContext.Provider>
  )
}
