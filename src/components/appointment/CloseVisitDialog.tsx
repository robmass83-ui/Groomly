import { useState, type ReactNode } from 'react'
import cashDark from '../../assets/icons/svg/icona-contanti-scuro.svg'
import cashLight from '../../assets/icons/svg/icona-contanti-chiaro.svg'
import posDark from '../../assets/icons/svg/icona-pos-scuro.svg'
import posLight from '../../assets/icons/svg/icona-pos-chiaro.svg'
import { euro } from '../../i18n/format'
import { t } from '../../i18n/t'
import {
  INVALID_PRICE,
  INVALID_TIME,
  NA_PRICE_MESSAGE,
  NOTE_MAX,
  canSaveClose,
  mancaNotaPrezzo,
  PRICE_NOTE_MESSAGE,
  canSkipClose,
  closePatch,
  formatSpent,
  naBlocks,
  parseCloseDuration,
  parseClosePrice,
  splitDuration,
  type ClosePatch,
} from '../../lib/closeVisit'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'
import { TYPE } from '../../theme/theme'
import { useDocumentTheme } from '../../theme/useDocumentTheme'
import type { PaymentMethod } from '../../types/models'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

function PayTile({
  pressed,
  dimmed,
  label,
  onClick,
  icon,
}: {
  pressed: boolean
  dimmed: boolean
  label: string
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={{
        position: 'relative',
        minHeight: 44,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '6px 4px',
        borderRadius: 14,
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: pressed ? 'var(--pri)' : 'var(--line)',
        background: pressed ? 'var(--pri-s)' : 'var(--card)',
        color: pressed ? 'var(--pri)' : 'var(--tx2)',
        fontFamily: 'inherit',
        fontSize: TYPE.meta,
        fontWeight: 700,
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {icon}
      {label}
      {pressed ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 2,
            right: 4,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: 'var(--pri)',
            color: 'var(--on-pri)',
            fontSize: 11,
            display: 'grid',
            placeItems: 'center',
            lineHeight: 1,
          }}
        >
          ✓
        </span>
      ) : null}
    </button>
  )
}

export function CloseVisitDialog({
  open,
  mode,
  quotedPrice,
  quotedMinutes,
  initialPrice,
  initialMinutes,
  initialNote,
  initialPayment,
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
  initialPayment: PaymentMethod | null
  onClose: () => void
  onNone: (patch: ClosePatch) => void
  onSave: (patch: ClosePatch) => void
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const theme = useDocumentTheme()
  const dark = theme === 'dark'
  const initialSplit = splitDuration(initialMinutes)
  const [price, setPrice] = useState(String(initialPrice))
  const [hours, setHours] = useState(String(initialSplit.hours))
  const [minutes, setMinutes] = useState(String(initialSplit.minutes))
  const [note, setNote] = useState(initialNote)
  const [payment, setPayment] = useState<PaymentMethod | null>(initialPayment)
  const priceParsed = parseClosePrice(price)
  const durationParsed = parseCloseDuration(hours, minutes)
  const priceBlocked = naBlocks({ priceRaw: price, payment })
  const priceBad = !priceParsed.ok || priceBlocked
  const fields = { quotedPrice, quotedMinutes, priceRaw: price, hoursRaw: hours, minutesRaw: minutes, payment }
  const skip = canSkipClose(fields)
  const save = canSaveClose({ ...fields, note, allowSame: true })

  function currentPatch(): ClosePatch | null {
    if (!payment || !priceParsed.ok || !durationParsed.ok) return null
    return closePatch({
      quotedPrice,
      quotedMinutes,
      price: priceParsed.value,
      minutes: durationParsed.value,
      note,
      paymentMethod: payment,
    })
  }

  function skipClose() {
    const patch = currentPatch()
    if (!patch || !skip) return
    onNone(patch)
  }

  function saveClose() {
    const patch = currentPatch()
    if (!patch || !save) return
    onSave(patch)
  }

  function errore(message: string): string {
    if (message === NA_PRICE_MESSAGE) return frasi.chiudiNa
    if (message === PRICE_NOTE_MESSAGE) return frasi.chiudiNotaPrezzo
    if (message === INVALID_PRICE) return frasi.chiudiImporto
    if (message === INVALID_TIME) return frasi.chiudiTempo
    return message
  }

  const canCommit = skip || save
  const posIcon = dark ? posDark : posLight
  const cashIcon = dark ? cashDark : cashLight

  return (
    <Dialog open={open} title={mode === 'complete' ? frasi.chiudiCompletare : frasi.chiudiCorreggi} onClose={onClose}>
      <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.rowSub }}>
        {t(lingua, 'chiudiPrevisto', { prezzo: euro(lingua, quotedPrice), durata: formatSpent(quotedMinutes) })}
      </p>
      <Input
        label={frasi.servPrezzo}
        value={price}
        inputMode="decimal"
        aria-invalid={priceBad ? true : undefined}
        onChange={(event) => setPrice(event.target.value)}
        style={priceBad ? { borderColor: 'var(--bad)', boxShadow: '0 0 0 3px var(--bad-s)' } : undefined}
      />
      {!priceParsed.ok ? (
        <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{errore(priceParsed.message)}</span>
      ) : priceBlocked ? (
        <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{frasi.chiudiNa}</span>
      ) : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input label={frasi.chiudiOre} value={hours} inputMode="numeric" onChange={(event) => setHours(event.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input label={frasi.chiudiMinuti} value={minutes} inputMode="numeric" onChange={(event) => setMinutes(event.target.value)} />
        </div>
      </div>
      {durationParsed.ok ? null : <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{errore(durationParsed.message)}</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap }}>
        <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>{frasi.chiudiPagamento}</span>
        <div role="group" aria-label={frasi.chiudiPagamento} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <PayTile
          pressed={payment === 'pos'}
          dimmed={payment !== null && payment !== 'pos'}
          label="POS"
          onClick={() => setPayment('pos')}
          icon={<img alt="" src={posIcon} width={46} height={46} style={{ width: 46, height: 46 }} />}
        />
        <PayTile
          pressed={payment === 'contanti'}
          dimmed={payment !== null && payment !== 'contanti'}
          label={frasi.chiudiContanti}
          onClick={() => setPayment('contanti')}
          icon={<img alt="" src={cashIcon} width={46} height={46} style={{ width: 46, height: 46 }} />}
        />
        <PayTile
          pressed={payment === 'na'}
          dimmed={payment !== null && payment !== 'na'}
          label="N/A"
          onClick={() => setPayment('na')}
          icon={(
            <span aria-hidden style={{ width: 46, height: 46, borderRadius: 11, background: 'var(--surf)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800 }}>
              N/A
            </span>
          )}
        />
        </div>
      </div>
      <label htmlFor="close-visit-note" style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap, margin: 0 }}>
        <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>{frasi.schedaNota}</span>
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
            ...USER_TEXT,
          }}
        />
      </label>
      {mancaNotaPrezzo({ quotedPrice, priceRaw: price, note, payment }) ? (
        <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{frasi.chiudiNotaPrezzo}</span>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {mode === 'complete' ? (
          <>
            <Button variant="secondary" disabled={!skip} onClick={skipClose} style={{ width: '100%', opacity: skip ? 1 : 0.4 }}>
              {frasi.chiudiNessuna}
            </Button>
            <Button variant="primary" disabled={!save} onClick={saveClose} style={{ width: '100%', opacity: save ? 1 : 0.4 }}>
              {frasi.chiudiSalvaCompleta}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>
              {frasi.homeAnnulla}
            </Button>
            <Button variant="primary" disabled={!canCommit} onClick={saveClose} style={{ width: '100%', opacity: canCommit ? 1 : 0.4 }}>
              {frasi.schedaSalva}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  )
}
