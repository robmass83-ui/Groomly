import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import './bottomNav.css'

export const BOTTOM_NAV_CONTENT_PAD = 'calc(72px + 56px + env(safe-area-inset-bottom, 0px))'

function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  )
}

const items: { to: string; chiave: 'navHome' | 'navAnimali' | 'navAgenda' | 'navMensili' | 'navListino' | 'navImpostazioni'; end?: boolean; alerts?: boolean; icon: ReactNode }[] = [
  {
    to: '/',
    chiave: 'navHome',
    end: true,
    icon: (
      <LineIcon>
        <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15V15h-6v5.5H5.5A1.5 1.5 0 0 1 4 19z" />
      </LineIcon>
    ),
  },
  {
    to: '/animali',
    chiave: 'navAnimali',
    icon: (
      <LineIcon>
        <circle cx="6.2" cy="10.4" r="1.9" />
        <circle cx="10" cy="6.3" r="1.9" />
        <circle cx="14" cy="6.3" r="1.9" />
        <circle cx="17.8" cy="10.4" r="1.9" />
        <path d="M12 12.2c2.2 0 5 3.4 5 5.8 0 1.6-1.2 2.4-2.6 2.4-1.1 0-1.6-.6-2.4-.6s-1.3.6-2.4.6C8.2 20.4 7 19.6 7 18c0-2.4 2.8-5.8 5-5.8z" />
      </LineIcon>
    ),
  },
  {
    to: '/calendario',
    chiave: 'navAgenda',
    icon: (
      <LineIcon>
        <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </LineIcon>
    ),
  },
  {
    to: '/mensili',
    chiave: 'navMensili',
    alerts: true,
    icon: (
      <LineIcon>
        <path d="M6 8.5a6 6 0 0 1 12 0c0 6 2.2 7.5 2.2 7.5H3.8S6 14.5 6 8.5" />
        <path d="M10 18.2a2 2 0 0 0 4 0" />
      </LineIcon>
    ),
  },
  {
    to: '/listino',
    chiave: 'navListino',
    icon: (
      <LineIcon>
        <path d="M3.5 4.8c0-.7.6-1.3 1.3-1.3h6.6c.3 0 .7.1.9.4l7.4 7.4c.5.5.5 1.3 0 1.8l-6.6 6.6c-.5.5-1.3.5-1.8 0l-7.4-7.4a1.3 1.3 0 0 1-.4-.9z" />
        <circle cx="8.3" cy="8.3" r="1.3" />
      </LineIcon>
    ),
  },
  {
    to: '/impostazioni',
    chiave: 'navImpostazioni',
    icon: (
      <LineIcon>
        <rect x="4" y="4" width="6.5" height="6.5" rx="2" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="2" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="3.25" />
      </LineIcon>
    ),
  },
]

export function BottomNav({ onFab, menuOpen = false, alerts = 0, tax = false, showFab = true }: { onFab?: () => void; menuOpen?: boolean; alerts?: number; tax?: boolean; showFab?: boolean }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const count = Math.max(0, Math.floor(alerts))
  return (
    <nav className="bottom-nav" aria-label={frasi.navPrincipale}>
      {showFab ? (
        <button type="button" className="bottom-nav__fab" aria-label={frasi.navAggiungi} aria-expanded={menuOpen} onClick={onFab}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      ) : null}
      <div className="bottom-nav__bar">
        {items.map((item) => {
          const label = frasi[item.chiave]
          const hint = item.alerts && count > 0
            ? t(lingua, 'navDaFissare', { count })
            : item.to === '/impostazioni' && tax
              ? frasi.navDati
              : ''
          const name = hint ? `${label}, ${hint}` : label
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className="bottom-nav__tab" aria-label={name}>
              <span className="bottom-nav__icon">
                {item.icon}
                {item.alerts && count > 0 ? <span data-testid="bell-count" className="bottom-nav__count">{count}</span> : null}
                {item.to === '/impostazioni' && tax ? <span data-testid="tax-dot" className="bottom-nav__dot" /> : null}
              </span>
              <span className="bottom-nav__label">{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
