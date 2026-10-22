import type { CSSProperties, JSX } from 'react'
import { USER_TEXT } from '../../theme/text'

export function NoteAltro({ note, altro, muted }: { note: string; altro: boolean; muted?: boolean }): JSX.Element | null {
  if (!note && !altro) return null
  const row: CSSProperties = note
    ? { display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0, maxWidth: '100%', width: '100%' }
    : { display: 'inline-flex', alignItems: 'baseline', flex: 'none', maxWidth: '100%' }
  return (
    <span style={row}>
      {note ? (
        <span
          style={{
            display: 'block',
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: muted ? 'var(--tx3)' : 'var(--bad)',
            ...USER_TEXT,
          }}
        >
          {note}
        </span>
      ) : null}
      {altro ? <span style={{ flex: 'none', fontWeight: 700, color: 'var(--tx2)' }}>altro</span> : null}
    </span>
  )
}
