import { useState } from 'react'
import {
  NOTE_MAX,
  canSaveClose,
  canSkipClose,
  closePatch,
  formatSpent,
  parseCloseDuration,
  parseClosePrice,
  splitDuration,
} from '../../lib/closeVisit'
import { formatEuro } from '../../lib/format'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

type Patch = ReturnType<typeof closePatch>

export function CloseVisitDialog({
  open,
  mode,
  quotedPrice,
  quotedMinutes,
  initialPrice,
  initialMinutes,
  initialNote,
  onClose,
  onNone,
  onSave,
}: {
  open: boolean
  mode: 'complete' | 'correct'
  quotedPrice: number
  quotedMinutes: number
  initialPrice: number
  initialMinutes: number
  initialNote: string
  onClose: () => void
  onNone: () => void
  onSave: (patch: Patch) => void
}) {
  const initialSplit = splitDuration(initialMinutes)
  const [price, setPrice] = useState(String(initialPrice))
  const [hours, setHours] = useState(String(initialSplit.hours))
  const [minutes, setMinutes] = useState(String(initialSplit.minutes))
  const [note, setNote] = useState(initialNote)
  const priceParsed = parseClosePrice(price)
  const durationParsed = parseCloseDuration(hours, minutes)
  const fields = { quotedPrice, quotedMinutes, priceRaw: price, hoursRaw: hours, minutesRaw: minutes }
  const skip = canSkipClose(fields)
  const save = canSaveClose({ ...fields, note })

  function parsedValues(): { price: number; minutes: number } | null {
    if (!priceParsed.ok || !durationParsed.ok) return null
    return { price: priceParsed.value, minutes: durationParsed.value }
  }

  function skipClose() {
    if (!parsedValues() || !skip) return
    onNone()
  }

  function saveClose() {
    const parsed = parsedValues()
    if (!parsed) return
    onSave(closePatch({ quotedPrice, quotedMinutes, price: parsed.price, minutes: parsed.minutes, note }))
  }

  const canCommit = skip || save

  return (
    <Dialog open={open} title={mode === 'complete' ? 'Completare' : 'Correggi'} onClose={onClose}>
      <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.rowSub }}>
        Previsto {formatEuro(quotedPrice)} · {formatSpent(quotedMinutes)}
      </p>
      <Input
        label="Prezzo"
        value={price}
        inputMode="decimal"
        aria-invalid={priceParsed.ok ? undefined : true}
        onChange={(event) => setPrice(event.target.value)}
        style={priceParsed.ok ? undefined : { borderColor: 'var(--bad)', boxShadow: '0 0 0 3px var(--bad-s)' }}
      />
      {priceParsed.ok ? null : <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{priceParsed.message}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input label="Ore" value={hours} inputMode="numeric" onChange={(event) => setHours(event.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input label="Minuti" value={minutes} inputMode="numeric" onChange={(event) => setMinutes(event.target.value)} />
        </div>
      </div>
      {durationParsed.ok ? null : <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{durationParsed.message}</span>}
      <label htmlFor="close-visit-note" style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap, margin: 0 }}>
        <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>Nota</span>
        <textarea
          id="close-visit-note"
          value={note}
          maxLength={NOTE_MAX}
          rows={2}
          onChange={(event) => setNote(event.target.value)}
          style={{
            boxSizing: 'border-box',
            width: '100%',
            minHeight: SIZES.field.areaMin,
            borderRadius: SIZES.field.radius,
            borderWidth: '1px',
            borderStyle: 'solid',
            background: 'var(--card)',
            color: 'var(--tx)',
            padding: '8px 10px',
            font: 'inherit',
            resize: 'vertical',
          }}
        />
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {mode === 'complete' ? (
          <>
            <Button variant="secondary" disabled={!skip} onClick={skipClose} style={{ width: '100%', opacity: skip ? 1 : 0.4 }}>
              Nessuna modifica
            </Button>
            <Button variant="primary" disabled={!save} onClick={saveClose} style={{ width: '100%', opacity: save ? 1 : 0.4 }}>
              Salva e completa
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>
              Annulla
            </Button>
            <Button variant="primary" disabled={!canCommit} onClick={saveClose} style={{ width: '100%', opacity: canCommit ? 1 : 0.4 }}>
              Salva
            </Button>
          </>
        )}
      </div>
    </Dialog>
  )
}
