import { useState, type InputHTMLAttributes } from 'react'

export function formatSheetAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

export function parseSheetAmount(raw: string): number | null {
  const parsed = Number(raw.replace(',', '.').trim())
  return Number.isFinite(parsed) ? parsed : null
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'inputMode'> & {
  value: number
  onCommit: (next: number) => void
}

export function PriceAmountInput({ value, onCommit, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')
  return (
    <input
      {...rest}
      inputMode="decimal"
      value={focused ? text : formatSheetAmount(value)}
      onFocus={(event) => {
        setText(formatSheetAmount(value))
        setFocused(true)
        onFocus?.(event)
      }}
      onChange={(event) => setText(event.target.value)}
      onBlur={(event) => {
        setFocused(false)
        const parsed = parseSheetAmount(text)
        if (parsed != null && parsed >= 0) onCommit(parsed)
        onBlur?.(event)
      }}
    />
  )
}
