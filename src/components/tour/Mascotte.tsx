import { useId } from 'react'
import './tour.css'

// Il badge di src/assets/brand/groomly-logo-animato.svg (senza la scritta), animato da tour.css.
export function Mascotte({ size }: { size: number }) {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const clip = `tour-m-clip-${base}`
  const grad = `tour-m-grad-${base}`
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <clipPath id={clip}><circle cx="50" cy="50" r="50" /></clipPath>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8ADBD9" />
          <stop offset="1" stopColor="#4A9FCB" />
        </linearGradient>
      </defs>
      <g className="tour-m-badge">
        <g clipPath={`url(#${clip})`}>
          <rect width="100" height="100" fill={`url(#${grad})`} />

          <g fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.6">
            <circle className="tour-m-bolla" cx="20" cy="24" r="5" />
            <circle className="tour-m-bolla" cx="78" cy="22" r="4" style={{ animationDelay: '-.8s', animationDuration: '3.4s' }} />
            <circle className="tour-m-bolla" cx="86" cy="40" r="2.6" style={{ animationDelay: '-1.6s', animationDuration: '2.6s' }} />
            <circle className="tour-m-bolla" cx="13" cy="44" r="3" style={{ animationDelay: '-2.2s', animationDuration: '3.2s' }} />
          </g>

          <g fill="none" stroke="#fff" strokeWidth="1.1">
            <circle className="tour-m-sale" cx="18" cy="74" r="2.2" style={{ animationDelay: '1s' }} />
            <circle className="tour-m-sale" cx="80" cy="72" r="2.8" style={{ animationDelay: '1.9s', animationDuration: '4.2s' }} />
            <circle className="tour-m-sale" cx="30" cy="70" r="1.6" style={{ animationDelay: '2.7s', animationDuration: '3.2s' }} />
            <circle className="tour-m-sale" cx="70" cy="70" r="1.8" style={{ animationDelay: '3.4s' }} />
            <circle className="tour-m-sale" cx="10" cy="76" r="1.4" style={{ animationDelay: '4.1s', animationDuration: '3s' }} />
            <circle className="tour-m-sale" cx="90" cy="76" r="1.9" style={{ animationDelay: '2.2s', animationDuration: '3.8s' }} />
          </g>

          <g className="tour-m-cane">
            <g className="tour-m-orecchio-s"><ellipse cx="32" cy="44" rx="7" ry="13" transform="rotate(22 32 44)" fill="#A8683A" /></g>
            <g className="tour-m-orecchio-d"><ellipse cx="68" cy="44" rx="7" ry="13" transform="rotate(-22 68 44)" fill="#A8683A" /></g>
            <circle cx="50" cy="48" r="18" fill="#E9B57A" />
            <ellipse className="tour-m-guancia" cx="38.5" cy="53" rx="3.2" ry="1.9" fill="#F2958A" />
            <ellipse className="tour-m-guancia" cx="61.5" cy="53" rx="3.2" ry="1.9" fill="#F2958A" />
            <g className="tour-m-occhi">
              <circle cx="43" cy="46" r="2.6" fill="#2B2B2B" />
              <circle cx="57" cy="46" r="2.6" fill="#2B2B2B" />
              <circle cx="43.8" cy="45.2" r=".9" fill="#fff" />
              <circle cx="57.8" cy="45.2" r=".9" fill="#fff" />
            </g>
            <ellipse cx="50" cy="55" rx="8" ry="6" fill="#F7DDBA" />
            <ellipse cx="50" cy="52.3" rx="3" ry="2.2" fill="#2B2B2B" />
            <path d="M46.5 57 Q50 60.5 53.5 57" fill="none" stroke="#2B2B2B" strokeWidth="1.3" strokeLinecap="round" />
            <g className="tour-m-ciuffo" fill="#fff">
              <circle cx="43" cy="31" r="5" />
              <circle cx="50" cy="28.5" r="6" />
              <circle cx="57" cy="31.5" r="4.5" />
            </g>
          </g>

          <g className="tour-m-schiuma" fill="#fff">
            <rect x="-6" y="76" width="112" height="30" />
            <circle className="tour-m-fiocco" cx="14" cy="76" r="10" />
            <circle className="tour-m-fiocco" cx="30" cy="72" r="11" style={{ animationDelay: '-.5s' }} />
            <circle className="tour-m-fiocco" cx="50" cy="73" r="12" style={{ animationDelay: '-1s' }} />
            <circle className="tour-m-fiocco" cx="70" cy="72" r="11" style={{ animationDelay: '-1.5s' }} />
            <circle className="tour-m-fiocco" cx="86" cy="76" r="10" style={{ animationDelay: '-.8s' }} />
            <circle className="tour-m-fiocco" cx="-2" cy="78" r="9" style={{ animationDelay: '-1.2s' }} />
            <circle className="tour-m-fiocco" cx="102" cy="78" r="9" style={{ animationDelay: '-.3s' }} />
            <g fill="#D6F0F5">
              <circle className="tour-m-punto" cx="40" cy="82" r="3" />
              <circle className="tour-m-punto" cx="62" cy="85" r="2.4" style={{ animationDelay: '-.9s' }} />
              <circle className="tour-m-punto" cx="24" cy="86" r="2" style={{ animationDelay: '-1.7s' }} />
              <circle className="tour-m-punto" cx="78" cy="88" r="1.8" style={{ animationDelay: '-.4s' }} />
            </g>
          </g>
        </g>
        <circle cx="50" cy="50" r="48" fill="none" stroke="#fff" strokeWidth="4" />
      </g>
    </svg>
  )
}
