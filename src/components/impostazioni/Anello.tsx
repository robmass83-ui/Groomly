export function Anello({ fatti, tutti }: { fatti: number; tutti: number }) {
  const raggio = 15
  const giro = 2 * Math.PI * raggio
  const parte = tutti === 0 ? 0 : fatti / tutti
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r={raggio} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={raggio}
        fill="none"
        stroke="var(--pri)"
        strokeWidth="4"
        strokeDasharray={`${giro * parte} ${giro}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="23" textAnchor="middle" dominantBaseline="middle" fill="var(--tx)" fontSize="10" fontWeight="700">
        {`${fatti}/${tutti}`}
      </text>
    </svg>
  )
}
