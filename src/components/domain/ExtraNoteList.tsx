import { Plus, StickyNote, Trash2 } from 'lucide-react'
import { useState, type CSSProperties, type JSX } from 'react'
import { EXTRA_NOTE_LIMIT, EXTRA_NOTE_MAX, cleanExtraNote } from '../../lib/dogNotes'
import { USER_TEXT } from '../../theme/text'
import { TYPE } from '../../theme/theme'
import type { DogExtraNote } from '../../types/models'
import { useFrasi } from '../../i18n/LinguaContext'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'

const noteCard: CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 16,
  padding: 12,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  background: 'var(--card)',
  boxShadow: 'var(--sh-1)',
  borderLeft: '4px solid var(--pri)',
}

export function ExtraNoteList(props: {
  notes: DogExtraNote[]
  onAdd: (text: string) => void
  onRemove: (id: string) => void
}): JSX.Element {
  const { notes, onAdd, onRemove } = props
  const frasi = useFrasi()
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
          <span aria-hidden style={{ width: 36, height: 36, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center', color: 'var(--pri)', background: 'var(--pri-s)' }}>
            <StickyNote size={16} strokeWidth={2} />
          </span>
          <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: TYPE.base, lineHeight: 1.45, paddingTop: 6, ...USER_TEXT }}>{note.text}</p>
          <button
            type="button"
            aria-label={frasi.schedaTogliNota.replace('{{nota}}', note.text)}
            onClick={() => onRemove(note.id)}
            style={{
              flex: 'none',
              width: 44,
              height: 44,
              border: '1px solid var(--line)',
              borderRadius: 12,
              background: 'var(--surf)',
              color: 'var(--bad)',
              display: 'grid',
              placeItems: 'center',
              padding: 0,
            }}
          >
            <Trash2 size={16} strokeWidth={2} aria-hidden />
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          textAlign: 'center',
          border: '1.5px dashed var(--pri)',
          borderRadius: 16,
          background: 'var(--pri-s)',
          color: 'var(--pri)',
          font: 'inherit',
          fontWeight: 700,
          padding: '8px 12px',
          minHeight: 48,
          height: 'auto',
          opacity: full ? 0.4 : 1,
        }}
      >
        <Plus size={16} strokeWidth={2} aria-hidden />
        {frasi.noteAggiungi}
      </button>
      {full ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Troppe note</p> : null}
      <Dialog open={open} title={frasi.noteAggiungi} onClose={close}>
        <textarea
          aria-label={frasi.schedaNota}
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
          <Button type="button" variant="secondary" onClick={close} style={{ flex: 1 }}>{frasi.homeAnnulla}</Button>
          <Button type="button" onClick={save} style={{ flex: 1 }}>{frasi.schedaSalva}</Button>
        </div>
      </Dialog>
    </div>
  )
}
