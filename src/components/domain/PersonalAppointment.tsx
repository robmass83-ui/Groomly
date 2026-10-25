import type { CSSProperties } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'

export function PersonalGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="24" cy="24" r="23" fill="#8A5A32" />
      <circle cx="24" cy="18" r="7" fill="#FFF6EA" />
      <path d="M10 40.5c1.6-8 6.4-12 14-12s12.4 4 14 12" fill="#FFF6EA" />
      <circle cx="35.5" cy="34.5" r="7.2" fill="#fff" />
      <circle cx="35.5" cy="34.5" r="5.4" fill="#F3E4D2" />
      <path d="M35.5 31.2v3.6l2.4 1.4" fill="none" stroke="#8A5A32" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const entryStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flex: 1,
  minWidth: 0,
  width: '100%',
  textAlign: 'left',
  border: 0,
  background: 'var(--personal-s)',
  color: 'var(--personal-ink)',
  boxShadow: 'inset 3px 0 0 var(--personal)',
  font: 'inherit',
  fontWeight: 700,
  padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`,
  minHeight: SIZES.row.minH,
}

export function PersonalEntry({ title, when, onOpen }: { title: string; when: string; onOpen: () => void }) {
  const frasi = useFrasi()
  return (
    <button type="button" aria-label={frasi.apriNome.replace('{{nome}}', title)} onClick={onOpen} style={entryStyle}>
      <PersonalGlyph />
      <span style={{ flex: '1 1 auto', minWidth: 0 }}>
        <span style={{ display: 'block', ...USER_TEXT }}>{title}</span>
        <span style={{ display: 'block', marginTop: 1, fontSize: 11, fontWeight: 600, color: 'var(--personal-ink)' }}>{frasi.homePersonale}</span>
      </span>
      <span style={{ flex: 'none', fontWeight: 800 }}>{when}</span>
    </button>
  )
}

export function PersonalInline({ title, when, glyph = 18 }: { title: string; when: string; glyph?: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, width: '100%' }}>
      <PersonalGlyph size={glyph} />
      <span style={{ flex: '1 1 auto', minWidth: 0, fontWeight: 700, ...USER_TEXT }}>{title}</span>
      <span style={{ flex: 'none', fontWeight: 800 }}>{when}</span>
    </span>
  )
}
