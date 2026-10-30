import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type PointerEvent } from 'react'
import { Check, type LucideIcon } from 'lucide-react'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import { Button } from '../ui/Button'
import './tour.css'

type Vars = CSSProperties & Record<`--${string}`, string | number>

export type TourTono = 'logo' | 'sede' | 'listino' | 'backup' | 'fiscale'

const TONI: Record<TourTono, { tc: string; tb: string }> = {
  logo: { tc: 'var(--pri)', tb: 'var(--pri-s)' },
  sede: { tc: 'var(--tea)', tb: 'var(--tea-s)' },
  listino: { tc: 'var(--s-combo)', tb: 'var(--s-combo-bg)' },
  backup: { tc: 'var(--s-bagno)', tb: 'var(--s-bagno-bg)' },
  fiscale: { tc: 'var(--sen)', tb: 'var(--sen-s)' },
}

function movimentiRidotti(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function TourTestata({ n, m }: { n: number; m: number }) {
  const { lingua } = useLingua()
  const testo = t(lingua, 'tourTestata', { n, m })
  const totale = Math.max(1, m)
  // parte dal passo prima e scorre fino a questo
  const [p, setP] = useState(Math.max(0, n - 1) / totale)
  useEffect(() => {
    let secondo = 0
    const primo = requestAnimationFrame(() => {
      secondo = requestAnimationFrame(() => setP(Math.min(1, n / totale)))
    })
    return () => {
      cancelAnimationFrame(primo)
      cancelAnimationFrame(secondo)
    }
  }, [n, totale])
  return (
    <div>
      <div className="tour-testata">
        <span>{testo}</span>
      </div>
      <div
        className="tour-barra"
        role="progressbar"
        aria-label={testo}
        aria-valuemin={0}
        aria-valuemax={m}
        aria-valuenow={n}
      >
        <span className="tour-barra-pieno" style={{ '--p': p } as Vars} />
      </div>
    </div>
  )
}

// bolle attorno al riquadro, misurate dal centro come nel prototipo
const BOLLE: CSSProperties[] = [
  { width: 14, height: 14, left: 'calc(50% - 62px)', top: 30 },
  { width: 9, height: 9, right: 'calc(50% - 58px)', top: 46, animationDelay: '.8s' },
  { width: 11, height: 11, right: 'calc(50% - 44px)', bottom: 22, animationDelay: '1.5s' },
]

export function TourIllustrazione({ tono, icona: Icona, compatta }: { tono: TourTono; icona: LucideIcon; compatta?: boolean }) {
  const t = TONI[tono]
  const vars = { '--tour-tc': t.tc, '--tour-tb': t.tb } as Vars
  const riquadro = (
    <span className={compatta ? 'tour-riquadro is-compatto' : 'tour-riquadro'} style={compatta ? vars : undefined}>
      <Icona strokeWidth={2} aria-hidden />
    </span>
  )
  if (compatta) return riquadro
  return (
    <div className="tour-illustrazione" style={vars} aria-hidden>
      <span className="tour-alone" />
      {BOLLE.map((b, i) => <span key={i} className="tour-bolla" style={b} />)}
      {riquadro}
    </div>
  )
}

type Onda = { id: number; x: number; y: number; d: number }

export function TourPulsante({
  pronto,
  freccia = true,
  className,
  children,
  onPointerDown,
  onAnimationEnd,
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pronto?: boolean; freccia?: boolean }) {
  // pulsa solo al passaggio false → true, non se nasce già pronto
  const [prima, setPrima] = useState(pronto)
  const [pulsa, setPulsa] = useState(false)
  if (prima !== pronto) {
    setPrima(pronto)
    setPulsa(!!pronto)
  }
  const [onde, setOnde] = useState<Onda[]>([])
  const prossima = useRef(0)

  function tocca(e: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(e)
    const r = e.currentTarget.getBoundingClientRect()
    const d = Math.max(r.width, r.height)
    const id = prossima.current++
    setOnde((o) => [...o, { id, x: e.clientX - r.left - d / 2, y: e.clientY - r.top - d / 2, d }])
  }

  const classi = ['tour-btn', pulsa ? 'tour-pronto' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <span className="tour-btn-box">
      <Button
        variant="primary"
        size="lg"
        {...props}
        className={classi}
        style={{ width: '100%', fontSize: 15, fontWeight: 650, ...style }}
        onPointerDown={tocca}
        onAnimationEnd={(e) => {
          if (e.animationName === 'tour-pronto') setPulsa(false)
          onAnimationEnd?.(e)
        }}
      >
        {children}
        {freccia ? <span className="tour-freccia" aria-hidden>→</span> : null}
        {onde.map((o) => (
          <span
            key={o.id}
            className="tour-onda"
            aria-hidden
            style={{ left: o.x, top: o.y, width: o.d, height: o.d }}
            onAnimationEnd={(e) => {
              e.stopPropagation()
              setOnde((tutte) => tutte.filter((x) => x.id !== o.id))
            }}
          />
        ))}
      </Button>
      <span className="tour-btn-anello" aria-hidden />
    </span>
  )
}

const COLORI_CORIANDOLI = ['var(--s-bagno)', 'var(--s-taglio)', 'var(--s-combo)', 'var(--s-nodi)', 'var(--s-derma)', 'var(--pri-solid)']
export const DURATA_FESTA = 1100

type Coriandolo = { dx: number; dy: number; r: number; ritardo: number }

function lanciaCoriandoli(): Coriandolo[] {
  return Array.from({ length: 26 }, () => {
    const a = Math.random() * Math.PI * 2
    const d = 70 + Math.random() * 90
    return {
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d - 20,
      r: Math.random() * 720 - 360,
      ritardo: 0.25 + Math.random() * 0.1,
    }
  })
}

export function TourFesta({ titolo, onFine }: { titolo: string; onFine: () => void }) {
  const frasi = useFrasi()
  const [coriandoli] = useState(lanciaCoriandoli)
  const fine = useRef(onFine)
  fine.current = onFine
  useEffect(() => {
    const t = setTimeout(() => fine.current(), DURATA_FESTA)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="tour-festa" role="status" aria-live="polite">
      <div className="tour-festa-centro">
        <div className="tour-festa-cerchio">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3 className="tour-festa-titolo">{titolo}</h3>
        <p className="tour-festa-sotto">{frasi.tourFestaSotto}</p>
        {coriandoli.map((c, i) => (
          <i
            key={i}
            className={i % 3 === 0 ? 'tour-coriandolo is-tondo' : 'tour-coriandolo'}
            aria-hidden
            style={{
              '--dx': `${c.dx}px`,
              '--dy': `${c.dy}px`,
              '--r': `${c.r}deg`,
              background: COLORI_CORIANDOLI[i % COLORI_CORIANDOLI.length],
              animationDelay: `${c.ritardo}s`,
            } as Vars}
          />
        ))}
      </div>
    </div>
  )
}

const RAGGIO = 62
const GIRO = 2 * Math.PI * RAGGIO
const ATTESA_ANELLO = 250
const DURATA_ANELLO = 1400

export function TourAnello({ fatti, tutti }: { fatti: number; tutti: number }) {
  const quota = tutti > 0 ? Math.min(1, fatti / tutti) : 0
  const [pieno, setPieno] = useState(false)
  const [conta, setConta] = useState(() => (movimentiRidotti() ? fatti : 0))
  useEffect(() => {
    if (movimentiRidotti()) {
      setPieno(true)
      setConta(fatti)
      return
    }
    let frame = 0
    const attesa = setTimeout(() => {
      setPieno(true)
      let inizio: number | null = null
      const passo = (ora: number) => {
        if (inizio === null) inizio = ora
        const k = Math.min(1, (ora - inizio) / DURATA_ANELLO)
        setConta(Math.round(fatti * (1 - Math.pow(1 - k, 3))))
        if (k < 1) frame = requestAnimationFrame(passo)
      }
      frame = requestAnimationFrame(passo)
    }, ATTESA_ANELLO)
    return () => {
      clearTimeout(attesa)
      cancelAnimationFrame(frame)
    }
  }, [fatti])
  return (
    <div className="tour-anello" role="img" aria-label={`${fatti}/${tutti}`}>
      <svg width="150" height="150" aria-hidden>
        <circle className="tour-anello-traccia" cx="75" cy="75" r={RAGGIO} fill="none" strokeWidth="12" />
        <circle
          className="tour-anello-pieno"
          cx="75"
          cy="75"
          r={RAGGIO}
          fill="none"
          strokeWidth="12"
          strokeDasharray={GIRO}
          strokeDashoffset={pieno ? GIRO * (1 - quota) : GIRO}
        />
      </svg>
      <div className="tour-anello-numero" aria-hidden>
        <span>
          <span data-testid="tour-anello-numero">{conta}</span>
          <span style={{ fontSize: 18, color: 'var(--tx3)' }}>/{tutti}</span>
        </span>
      </div>
    </div>
  )
}

// indicatore a due tappe del passo prezzi → tempi
export function TourTappe({ attiva }: { attiva: 1 | 2 }) {
  const frasi = useFrasi()
  return (
    <div className="tour-tappe">
      <span className={attiva === 1 ? 'tour-tappa is-attiva' : 'tour-tappa is-fatta'} aria-current={attiva === 1 ? 'step' : undefined}>
        <i className="tour-tappa-n">{attiva === 1 ? '1' : <Check size={12} strokeWidth={3} aria-hidden />}</i>
        {frasi.tourTappaPrezzi}
      </span>
      <span className={attiva === 2 ? 'tour-tappe-linea is-piena' : 'tour-tappe-linea'} aria-hidden />
      <span className={attiva === 2 ? 'tour-tappa is-attiva' : 'tour-tappa'} aria-current={attiva === 2 ? 'step' : undefined}>
        <i className="tour-tappa-n">2</i>
        {frasi.tourTappaTempi}
      </span>
    </div>
  )
}
