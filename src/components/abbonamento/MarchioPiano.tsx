import bollinoVip from '../../assets/brand/groomly-vip-bollino.svg'

// Go: la «G» del font di Groomly con la «o» a pallina da tennis.
export function MarchioGo({ altezza = 20 }: { altezza?: number }) {
  const palla = altezza * 0.8
  return (
    <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'Poppins, Inter, sans-serif', fontWeight: 800, fontSize: altezza, lineHeight: 1, color: 'var(--nome-da)' }}>
      G
      <svg width={palla} height={palla} viewBox="0 0 24 24" style={{ display: 'block', marginLeft: 1 }}>
        <circle cx="12" cy="12" r="10.5" fill="#D7EA3A" stroke="#B5C823" strokeWidth="1" />
        <path d="M4.2 5.2C8.4 8.5 8.4 15.5 4.2 18.8M19.8 5.2C15.6 8.5 15.6 15.5 19.8 18.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  )
}

const PILLOLA = {
  plus: { testo: 'PLUS', sfondo: 'linear-gradient(135deg, #8A52EE, #4F2BB8)', colore: '#fff' },
  // Oro chiaro con scritta marrone scuro: 7:1, come il bollino VIP nero e oro.
  salone: { testo: 'SALONE', sfondo: 'linear-gradient(135deg, #EBB928, #DCA50E)', colore: '#3A2700' },
} as const

// Bollino inclinato dei piani a pagamento, nello stile del bollino VIP.
export function BollinoPiano({ piano, altezza = 18 }: { piano: 'plus' | 'salone' | 'vip'; altezza?: number }) {
  if (piano === 'vip') return <img alt="" src={bollinoVip} style={{ display: 'block', height: altezza * 1.5, width: 'auto', flex: 'none' }} />
  const stile = PILLOLA[piano]
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: altezza,
        padding: `0 ${altezza * 0.42}px`,
        borderRadius: 999,
        background: stile.sfondo,
        color: stile.colore,
        fontFamily: 'Poppins, Inter, sans-serif',
        fontWeight: 800,
        fontStyle: 'italic',
        fontSize: altezza * 0.48,
        letterSpacing: 1,
        whiteSpace: 'nowrap',
        flex: 'none',
        transform: 'rotate(-12deg)',
        boxShadow: '0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,.25)',
      }}
    >
      {stile.testo}
    </span>
  )
}
