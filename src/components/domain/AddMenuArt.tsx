import type { ReactNode } from 'react'

function Plate({ id, from, to, children }: { id: string; from: string; to: string; children: ReactNode }) {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <defs>
        <linearGradient id={id} x1="8" y1="4" x2="40" y2="46">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill={`url(#${id})`} />
      {children}
    </svg>
  )
}

export function PelosettoArt() {
  return (
    <Plate id="add-pelosetto" from="#5DDC9A" to="#0E7A4E">
      <rect x="11" y="14" width="26" height="22" rx="4" fill="#fff" />
      <path d="M11 18.2V17a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v1.2z" fill="#127A4C" />
      <rect x="17" y="10.2" width="2.6" height="6" rx="1.3" fill="#163226" />
      <rect x="28.4" y="10.2" width="2.6" height="6" rx="1.3" fill="#163226" />
      <ellipse cx="18.2" cy="26.2" rx="2.3" ry="3.4" transform="rotate(18 18.2 26.2)" fill="#E7B56A" />
      <ellipse cx="29.8" cy="26.2" rx="2.3" ry="3.4" transform="rotate(-18 29.8 26.2)" fill="#E7B56A" />
      <ellipse cx="24" cy="28.4" rx="5.2" ry="4.6" fill="#F6D7B0" />
      <ellipse cx="24" cy="30.2" rx="2.6" ry="1.8" fill="#FFF6EA" />
      <circle cx="22.2" cy="27.6" r=".7" fill="#3B2A20" />
      <circle cx="25.8" cy="27.6" r=".7" fill="#3B2A20" />
      <ellipse cx="24" cy="29.2" rx="1" ry=".7" fill="#3B2A20" />
    </Plate>
  )
}

export function PersonaleArt() {
  return (
    <Plate id="add-personale" from="#F0D2AE" to="#A56B3C">
      <circle cx="21" cy="17.5" r="6.2" fill="#FFF6EA" />
      <path d="M9.5 37c1.4-7.2 5.6-10.8 11.5-10.8S31.1 29.8 32.5 37" fill="#FFF6EA" />
      <circle cx="34.2" cy="33.2" r="8" fill="#fff" />
      <circle cx="34.2" cy="33.2" r="6.1" fill="#8A5A32" />
      <path d="M34.2 29.4v4.1l2.7 1.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Plate>
  )
}

export function ChiusuraArt() {
  return (
    <Plate id="add-chiusura" from="#F4B2A8" to="#C0362C">
      <path d="M9 20h30l-3-6.4H12z" fill="#fff" />
      <path d="M15 14.2l1.2 5.6M21 13.8l.3 6M27 13.8l-.3 6M33 14.2l-1.2 5.6" stroke="#C0362C" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="12" y="20" width="24" height="17.5" rx="2" fill="#fff" />
      <path d="M20.2 26h7.6V37.5h-7.6z" fill="#F6D0CB" />
      <path d="M20.2 26h7.6c0 1.8-1.6 3-3.8 3s-3.8-1.2-3.8-3z" fill="#E7ABA4" />
      <circle cx="26.2" cy="32" r="1.05" fill="#C0362C" />
      <path d="M30.2 20v2.6" stroke="#2B211C" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="26.2" y="22.4" width="9.2" height="5.4" rx="1.3" fill="#2B211C" />
      <path d="M27.8 25.1h6" stroke="#F4E4C8" strokeWidth="1.3" strokeLinecap="round" />
    </Plate>
  )
}

export function NuovoCaneArt() {
  return (
    <Plate id="add-cane" from="#8EB4F2" to="#2F4E96">
      <ellipse cx="16.2" cy="20" rx="4.2" ry="7" transform="rotate(16 16.2 20)" fill="#E7B56A" />
      <ellipse cx="31.2" cy="20" rx="4.2" ry="7" transform="rotate(-16 31.2 20)" fill="#E7B56A" />
      <ellipse cx="23.6" cy="24.5" rx="9" ry="8.2" fill="#F6D7B0" />
      <ellipse cx="23.6" cy="28.2" rx="4.6" ry="3.2" fill="#FFF6EA" />
      <circle cx="20.4" cy="23.2" r="1.05" fill="#3B2A20" />
      <circle cx="26.6" cy="23.2" r="1.05" fill="#3B2A20" />
      <ellipse cx="23.6" cy="26" rx="1.35" ry=".95" fill="#3B2A20" />
      <path d="M21.6 29.2q2 1.6 4 0" fill="none" stroke="#3B2A20" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="34.5" cy="34.5" r="7.4" fill="#fff" />
      <path d="M34.5 31.2v6.6M31.2 34.5h6.6" fill="none" stroke="#2F4E96" strokeWidth="2" strokeLinecap="round" />
    </Plate>
  )
}
