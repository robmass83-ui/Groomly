import logoChiaro from '../assets/brand/groomly-logo-animato.svg'
import logoScuro from '../assets/brand/groomly-logo-animato-scuro.svg'
import './loadingSplash.css'

/** Schermata di caricamento con il logo animato; la versione chiara/scura segue il tema scelto nell'app (data-theme su <html>). */
export function LoadingSplash({ leaving = false, greeting = null }: { leaving?: boolean; greeting?: string | null }) {
  return (
    <div className={`loading-splash${leaving ? ' is-leaving' : ''}`} role="status" aria-label="Caricamento Groomly">
      <div className="loading-splash__center">
        <img className="loading-splash__logo loading-splash__logo--light" src={logoChiaro} alt="" />
        <img className="loading-splash__logo loading-splash__logo--dark" src={logoScuro} alt="" />
        {greeting ? <p className="loading-splash__greeting">{greeting}</p> : null}
      </div>
    </div>
  )
}
