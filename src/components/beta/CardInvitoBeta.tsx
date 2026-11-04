import { FlaskConical } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFrasi } from '../../i18n/LinguaContext'
import { chiaveBeta, useBeta } from './BetaProvider'
import { nomePiano, riempi } from './testi'

// Sfumature fisse dei piani (come la scheda «Il tuo piano»): il bianco sopra è verificato 4.5:1.
export const SFUMATURA_BETA = {
  pro: 'linear-gradient(135deg, #7B3FE4, #4F2BB8)',
  salone: 'linear-gradient(135deg, #8A6200, #5E4300)',
} as const
export const COLORE_TESTO_BETA = { pro: '#4F2BB8', salone: '#5E4300' } as const

const GIORNI_PIU_TARDI = 3
const GIORNO_MS = 24 * 60 * 60 * 1000

function rimandata(salonId: string): boolean {
  try {
    const quando = Number(localStorage.getItem(chiaveBeta(salonId, 'piuTardi')))
    return Number.isFinite(quando) && quando > 0 && Date.now() - quando < GIORNI_PIU_TARDI * GIORNO_MS
  } catch {
    return false
  }
}

const pulsante: CSSProperties = { minHeight: 44, padding: '0 16px', border: 0, borderRadius: 999, font: 'inherit', fontWeight: 800, fontSize: 14 }

// Card dell'invito in Home, sopra l'agenda di oggi (spec 9.1). Solo il titolare, solo finché l'invito è aperto.
export function CardInvitoBeta() {
  const frasi = useFrasi()
  const beta = useBeta()
  const navigate = useNavigate()
  const [nascosta, setNascosta] = useState(() => (beta.salonId ? rimandata(beta.salonId) : false))
  if (!beta.titolare || beta.fase !== 'invitato' || !beta.piano || nascosta) return null
  const piano = beta.piano
  const nome = nomePiano(frasi, piano)

  function piuTardi() {
    try {
      localStorage.setItem(chiaveBeta(beta.salonId, 'piuTardi'), String(Date.now()))
    } catch {
      // Senza storage la card si nasconde solo per questa visita.
    }
    setNascosta(true)
  }

  return (
    <section aria-label={riempi(frasi.betaInvitoAvviso, { piano: nome })} data-card-invito-beta={piano} style={{ background: SFUMATURA_BETA[piano], color: '#fff', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: 'var(--sh-2)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', opacity: 0.92 }}>
        <FlaskConical size={13} strokeWidth={2.4} aria-hidden />
        {frasi.betaInvitoCardRiga}
      </span>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>{riempi(frasi.betaInvitoCardTitolo, { piano: nome, n: beta.giorniInvito ?? 0 })}</h2>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.4, opacity: 0.92 }}>{riempi(frasi.betaInvitoCardTesto, { piano: nome })}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        <button type="button" onClick={() => navigate('/impostazioni/beta')} style={{ ...pulsante, background: '#fff', color: COLORE_TESTO_BETA[piano] }}>{frasi.betaScopri}</button>
        <button type="button" onClick={piuTardi} style={{ ...pulsante, background: 'rgba(255,255,255,.16)', color: '#fff' }}>{frasi.betaPiuTardi}</button>
      </div>
    </section>
  )
}
