import { useState, type CSSProperties, type JSX } from 'react'
import { EXTRA_NOTE_LIMIT, EXTRA_NOTE_MAX, cleanExtraNote } from '../../lib/dogNotes'
import { USER_TEXT } from '../../theme/text'
import { TYPE } from '../../theme/theme'
import type { DogExtraNote } from '../../types/models'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'

const noteCard: CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: 8,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
}

export function ExtraNoteList(props: {
  notes: DogExtraNote[]
  onAdd: (text: string) => void
  onRemove: (id: string) => void
}): JSX.Element {
  const { notes, onAdd, onRemove } = props
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const full = notes.length >= EXTRA_NOTE_LIMIT
  const ordered = [...notes].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))

  function close() {
    setOpen(false)
    setDraft('')
  }

  function save() {
    const text = cleanExtraNote(draft)
    if (!text) return
    onAdd(text)
    close()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ordered.map((note) => (
        <div key={note.id} style={noteCard}>
          <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: TYPE.base, ...USER_TEXT }}>{note.text}</p>
          <button
            type="button"
            aria-label={`Togli nota: ${note.text}`}
            onClick={() => onRemove(note.id)}
            style={{
              flex: 'none',
              border: '1px solid var(--line)',
              borderRadius: 9,
              background: 'transparent',
              color: 'var(--tx2)',
              font: 'inherit',
              fontWeight: 600,
              fontSize: TYPE.rowSub,
              padding: '8px 10px',
              minHeight: 44,
              height: 'auto',
            }}
          >
            Togli
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={full}
        onClick={() => {
          setDraft('')
          setOpen(true)
        }}
        style={{
          textAlign: 'left',
          border: '1px dashed var(--line)',
          borderRadius: 9,
          background: 'transparent',
          color: 'var(--pri)',
          font: 'inherit',
          fontWeight: 600,
          padding: '8px 10px',
          minHeight: 44,
          height: 'auto',
          opacity: full ? 0.4 : 1,
          ...USER_TEXT,
        }}
      >
        Aggiungi nota
      </button>
      {full ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Troppe note</p> : null}
      <Dialog open={open} title="Aggiungi nota" onClose={close}>
        <textarea
          aria-label="Nota"
          maxLength={EXTRA_NOTE_MAX}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          style={{
            minHeight: 88,
            boxSizing: 'border-box',
            borderRadius: 9,
            border: '1px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--tx)',
            padding: '8px 10px',
            font: 'inherit',
            resize: 'vertical',
            ...USER_TEXT,
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <Button type="button" variant="secondary" onClick={close} style={{ flex: 1 }}>Annulla</Button>
          <Button type="button" onClick={save} style={{ flex: 1 }}>Salva</Button>
        </div>
      </Dialog>
    </div>
  )
}
