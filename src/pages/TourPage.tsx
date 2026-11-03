import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { rimandaAvvisoTour } from '../app/TourAvvio'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Mascotte } from '../components/tour/Mascotte'
import { cascata, linkTour, PassoBackup, PassoFiscale, PassoLogo, PassoPrezzi, PassoSede, Piede, TourFine, useImpostazioniTour } from '../components/tour/TourPassi'
import { TourFesta, TourPulsante } from '../components/tour/TourScena'
import type { SettingsMain } from '../data/local/settings'
import { usePassiSalone } from '../hooks/usePassiSalone'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import type { PassoSalone } from '../lib/completaSalone'
import { passiDelTour } from '../lib/tourBenvenuto'
import { AttesaRiga } from '../components/ui/Zampette'

type Schermata =
  | { tipo: 'benvenuto' }
  | { tipo: 'passo'; indice: number; fase?: 'tempi' }
  | { tipo: 'fine' }

type Ricetta = (current: SettingsMain) => SettingsMain

// Ogni passo è una voce della cronologia: il tasto indietro torna al passo prima. prof = voci aggiunte dal tour.
type StatoTour = { tour: Schermata; prof: number }

const BENVENUTO: Schermata = { tipo: 'benvenuto' }

/** I passi che il tour mostra: si calcolano una volta sola, così il contatore "n di m" resta fermo. */
export function passiDaMostrare(passi: readonly { id: PassoSalone; fatto: boolean }[], saltati: readonly PassoSalone[]): PassoSalone[] {
  // la verifica email avviene prima del tour: qui non compare mai
  return passiDelTour(passi, saltati).filter((id) => id !== 'email')
}

function conSaltato(id: PassoSalone): Ricetta {
  return (current) => {
    const saltati = current.tourBenvenuto?.saltati ?? []
    if (saltati.includes(id)) return current
    return { ...current, tourBenvenuto: { stato: current.tourBenvenuto?.stato ?? 'in-corso', saltati: [...saltati, id] } }
  }
}

const segnaVisto: Ricetta = (current) => {
  if (current.tourBenvenuto?.stato === 'visto') return current
  return { ...current, tourBenvenuto: { stato: 'visto', saltati: current.tourBenvenuto?.saltati ?? [] } }
}

function movimentiRidotti(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

const DURATA_USCITA = 400

const SCINTILLA = 'M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2Z'
const SCINTILLE: CSSProperties[] = [
  { left: 'calc(50% - 106px)', top: 60 },
  { left: 'calc(50% + 86px)', top: 44, animationDelay: '.7s' },
  { left: 'calc(50% + 64px)', top: 170, animationDelay: '1.2s', color: 'var(--s-bagno)' },
]

export function TourPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const navigate = useNavigate()
  const location = useLocation()
  const { settings, ready, stantio } = useSettings()
  const { passi, pronto, aggiornaDrive } = usePassiSalone()
  const { attuali, scrivi } = useImpostazioniTour()
  const { gate } = useSession()
  const uid = gate.kind === 'in' ? gate.account.uid : null
  const [elenco, setElenco] = useState<PassoSalone[]>([])
  const stato = location.state as Partial<StatoTour> | null
  const prof = stato?.prof ?? 0
  // dopo una ricarica la cronologia ricorda il passo ma non l'elenco: si riparte come in ripresa
  const schermata: Schermata = stato?.tour && (stato.tour.tipo !== 'passo' || stato.tour.indice < elenco.length) ? stato.tour : BENVENUTO
  const [festa, setFesta] = useState<string | null>(null)
  const uscendo = useRef(false)
  const scena = useRef<HTMLDivElement>(null)
  const uscita = useRef<HTMLDivElement>(null)
  // durante la festa la schermata sotto non risponde, neanche da tastiera
  const inFesta = festa !== null

  function mostra(prossima: Schermata, sostituisci = false) {
    const nuovo: StatoTour = { tour: prossima, prof: sostituisci ? prof : prof + 1 }
    navigate(location.pathname, { state: nuovo, replace: sostituisci })
  }

  // Tornando indietro la festa di un passo non deve portare avanti quello sotto.
  useEffect(() => {
    setFesta(null)
  }, [location.key])

  // Uscita: si tolgono le voci del tour dalla cronologia, poi si va in Home al posto del benvenuto.
  useEffect(() => {
    if (uscendo.current && prof === 0) navigate('/', { replace: true })
  }, [location.key, prof, navigate])

  function esci() {
    if (uscendo.current) return
    scrivi(segnaVisto)
    rimandaAvvisoTour(uid)
    uscendo.current = true
    if (prof > 0) navigate(-prof)
    else navigate('/', { replace: true })
  }

  useEffect(() => {
    const nodo = scena.current
    if (!nodo) return
    if (inFesta) nodo.setAttribute('inert', '')
    else nodo.removeAttribute('inert')
  }, [inFesta, schermata])

  // Ripresa: il tour era già in corso prima di questa visita (letto al primo ready, prima di scriverlo noi).
  // Con la sola copia salvata sul telefono si aspetta quella vera.
  const [ripresa, setRipresa] = useState<boolean | null>(null)

  useEffect(() => {
    if (!ready || stantio || ripresa !== null) return
    const tour = attuali().tourBenvenuto
    // a metà o già visto con qualcosa che manca (si arriva dall'avviso): si riprende dai passi
    setRipresa(tour !== undefined)
    if (tour) return
    scrivi((current) => ({ ...current, tourBenvenuto: { stato: 'in-corso', saltati: current.tourBenvenuto?.saltati ?? [] } }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stantio])

  useEffect(() => {
    if (!ripresa || !pronto || schermata.tipo !== 'benvenuto') return
    // saltare vale per quel giro: in ripresa tornano tutti i passi ancora da fare
    const lista = passiDaMostrare(passi, [])
    setElenco(lista)
    // al posto del benvenuto mai mostrato: indietro dal primo passo esce dal tour
    mostra(lista.length > 0 ? { tipo: 'passo', indice: 0 } : { tipo: 'fine' }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ripresa, pronto])

  // La schermata vecchia esce a sinistra mentre la nuova entra da destra: ne resta una copia ferma per 400 ms.
  function vai(prossima: Schermata, ricetta?: Ricetta) {
    const vecchia = scena.current
    const box = uscita.current
    if (vecchia && box && !movimentiRidotti()) {
      const copia = vecchia.cloneNode(true) as HTMLElement
      copia.classList.remove('tour-entra')
      copia.classList.add('tour-esce', 'tour-fantasma')
      copia.setAttribute('aria-hidden', 'true')
      copia.setAttribute('inert', '')
      box.replaceChildren(copia)
      window.setTimeout(() => copia.remove(), DURATA_USCITA)
    }
    const fine = prossima.tipo === 'fine'
    // una sola scrittura per passaggio: online le impostazioni lette restano quelle di questo render
    if (ricetta || fine) scrivi((current) => (fine ? segnaVisto((ricetta ?? ((c) => c))(current)) : (ricetta as Ricetta)(current)))
    mostra(prossima)
    if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }

  function dopoIl(indice: number): Schermata {
    return indice + 1 < elenco.length ? { tipo: 'passo', indice: indice + 1 } : { tipo: 'fine' }
  }

  function inizia() {
    if (!pronto) return
    const lista = passiDaMostrare(passi, attuali().tourBenvenuto?.saltati ?? [])
    setElenco(lista)
    vai(lista.length > 0 ? { tipo: 'passo', indice: 0 } : { tipo: 'fine' })
  }

  function dopo() {
    if (!ready) return
    esci()
  }

  const nomeFesta: Record<PassoSalone, string> = {
    logo: frasi.hubPassoLogo,
    sede: frasi.hubPassoSede,
    listino: frasi.tourNomeListino,
    backup: frasi.tourNomeBackup,
    email: frasi.hubPassoEmail,
    fiscale: frasi.tourFiscaleTitolo,
  }

  function sottoBenvenuto(): string {
    const n = pronto ? passiDaMostrare(passi, settings.tourBenvenuto?.saltati ?? []).length : 0
    if (n === 1) return frasi.tourBenvenutoSottoUno
    return n > 1 ? t(lingua, 'tourBenvenutoSottoN', { n }) : frasi.tourBenvenutoSotto
  }

  function contenuto() {
    // in ripresa il benvenuto non si mostra finché non si sa quali passi mancano; tornandoci con indietro sì
    if (schermata.tipo === 'benvenuto' && ripresa && elenco.length === 0) {
      return <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}><AttesaRiga testo={frasi.relCaricamento} /></div>
    }
    if (schermata.tipo === 'benvenuto') {
      const nome = settings.business.salonName.trim() || settings.business.name.trim()
      const parole = (nome ? t(lingua, 'tourBenvenutoTitolo', { nome }) : frasi.tourBenvenutoAnonimo).split(' ')
      return (
        <>
          <div style={{ position: 'relative' }}>
            {SCINTILLE.map((stile, i) => (
              <span key={i} className="tour-scintilla" style={stile} aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d={SCINTILLA} /></svg>
              </span>
            ))}
            <div style={{ width: 170, margin: '30px auto 8px' }}><Mascotte size={170} /></div>
          </div>
          <h1 style={{ margin: '8px 0 4px', fontSize: 24, lineHeight: 1.2, fontWeight: 750, letterSpacing: '-0.015em', textAlign: 'center', color: 'var(--tx)' }}>
            {parole.map((parola, i) => (
              <span key={i}>
                {i > 0 ? ' ' : null}
                <span className="tour-parola" style={{ '--i': i } as CSSProperties}>{parola}</span>
              </span>
            ))}
          </h1>
          <p {...cascata(6, { margin: '0 0 10px', padding: '0 8px', fontSize: 14, lineHeight: 1.45, color: 'var(--tx2)', textAlign: 'center' })}>{sottoBenvenuto()}</p>
          <Piede i={8}>
            <TourPulsante disabled={!pronto} onClick={inizia}>{frasi.tourIniziamo}</TourPulsante>
            <button type="button" style={{ ...linkTour, opacity: ready ? 1 : 0.5 }} disabled={!ready} onClick={dopo}>{frasi.tourDopo}</button>
          </Piede>
        </>
      )
    }
    // la verifica email non è un passo del tour: non entra nel conto finale
    if (schermata.tipo === 'fine') return <TourFine passi={passi.filter((passo) => passo.id !== 'email')} onEntra={esci} />
    const { indice } = schermata
    const id = elenco[indice]
    const comune = {
      n: indice + 1,
      m: elenco.length,
      // a festa in corso il passo è già chiuso: la festa stessa porta avanti di uno
      onFatto: () => { if (!inFesta) setFesta(nomeFesta[id]) },
      onSalta: () => { if (!inFesta) vai(dopoIl(indice), conSaltato(id)) },
    }
    if (id === 'logo') return <PassoLogo {...comune} />
    if (id === 'sede') return <PassoSede {...comune} />
    if (id === 'listino') {
      return <PassoPrezzi {...comune} fase={schermata.fase ?? 'prezzi'} onTempi={() => { if (!inFesta) vai({ tipo: 'passo', indice, fase: 'tempi' }) }} />
    }
    if (id === 'backup') return <PassoBackup {...comune} aggiornaDrive={aggiornaDrive} />
    return <PassoFiscale {...comune} />
  }

  const chiave = schermata.tipo === 'passo' ? `passo-${schermata.indice}-${schermata.fase ?? ''}` : schermata.tipo

  return (
    <PhoneShell>
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        <div
          key={chiave}
          ref={scena}
          className="tour-entra"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minHeight: 'calc(100dvh - var(--safe-top, 0px))', padding: '22px 16px 18px' }}
        >
          {contenuto()}
        </div>
        <div ref={uscita} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      </div>
      {festa ? (
        <TourFesta
          titolo={t(lingua, 'tourFesta', { passo: festa })}
          onFine={() => {
            setFesta(null)
            if (schermata.tipo === 'passo') vai(dopoIl(schermata.indice))
          }}
        />
      ) : null}
    </PhoneShell>
  )
}
