import type { CSSProperties } from 'react'
import logoChiaro from '../assets/brand/groomly-logo-animato.svg'
import logoScuro from '../assets/brand/groomly-logo-animato-scuro.svg'
import scrittaChiara from '../assets/brand/groomly-logo-scritta.svg'
import scrittaScura from '../assets/brand/groomly-logo-scritta-scuro.svg'
import './loadingSplash.css'

const VIEW_W = 307
const VIEW_H = 250
const TOP = 160
const HEIGHT = 63

/** Riquadro di ogni lettera nel viewBox delle SVG del logo, con il ritardo d'ingresso. */
const LETTERS: { left: number; right: number; delay: number; hop?: boolean }[] = [
  { left: 21, right: 65, delay: 0.55 },
  { left: 68.5, right: 91.5, delay: 0.7 },
  { left: 92, right: 129, delay: 0.85, hop: true },
  { left: 130, right: 167.5, delay: 1, hop: true },
  { left: 170.5, right: 229, delay: 1.15 },
  { left: 234, right: 246.5, delay: 1.3 },
  { left: 248, right: 288, delay: 1.45 },
]

const pct = (part: number, whole: number) => `${(part / whole) * 100}%`

/**
 * Schermata di caricamento con il logo animato; la versione chiara/scura segue il tema scelto nell'app (data-theme su <html>).
 * Le lettere di «Groomly» sono elementi HTML animati solo con opacity e transform: il compositore le muove anche mentre l'app si avvia.
 */
export function LoadingSplash({ leaving = false, greeting = null }: { leaving?: boolean; greeting?: string | null }) {
  return (
    <div className={`loading-splash${leaving ? ' is-leaving' : ''}`} role="status" aria-label="Caricamento Groomly">
      <div className="loading-splash__center">
        <div className="loading-splash__mark">
          <img className="loading-splash__logo loading-splash__logo--light" src={logoChiaro} alt="" />
          <img className="loading-splash__logo loading-splash__logo--dark" src={logoScuro} alt="" />
          {LETTERS.map(({ left, right, delay, hop }) => {
            const width = right - left
            const box: CSSProperties = {
              left: pct(left, VIEW_W),
              top: pct(TOP, VIEW_H),
              width: pct(width, VIEW_W),
              height: pct(HEIGHT, VIEW_H),
              animationDelay: hop ? `${delay}s, ${delay + 1.6}s` : `${delay}s`,
            }
            const crop: CSSProperties = { left: pct(-left, width), top: pct(-TOP, HEIGHT), width: pct(VIEW_W, width) }
            return (
              <span key={left} className={`loading-splash__letter${hop ? ' loading-splash__letter--hop' : ''}`} style={box}>
                <img className="loading-splash__logo--light" src={scrittaChiara} alt="" style={crop} />
                <img className="loading-splash__logo--dark" src={scrittaScura} alt="" style={crop} />
              </span>
            )
          })}
        </div>
        {greeting ? <p className="loading-splash__greeting">{greeting}</p> : null}
      </div>
    </div>
  )
}
