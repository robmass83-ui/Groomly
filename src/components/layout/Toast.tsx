import { Check } from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { USER_TEXT } from '../../theme/text'

type Tone = 'ok' | 'plain'
type ToastAction = { label: string; onClick: () => void }
type ToastItem = { id: number; message: string; tone: Tone; action?: ToastAction; second?: ToastAction } | null

const toastAction: CSSProperties = {
  flex: 'none',
  minHeight: 44,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 700,
  textDecoration: 'none',
  padding: '0 4px',
  cursor: 'pointer',
}

const ToastContext = createContext<{ show: (message: string, tone: Tone, action?: ToastAction, second?: ToastAction, durationMs?: number) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem>(null)
  const timer = useRef<number | null>(null)
  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current)
  }, [])
  const api = useMemo(() => ({
    show(message: string, tone: Tone, action?: ToastAction, second?: ToastAction, durationMs = 2000) {
      const id = Date.now()
      setToast({ id, message, tone, action, second })
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = null
        setToast((current) => (current?.id === id ? null : current))
      }, durationMs)
    },
  }), [])
  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <div role="status" style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(128px + env(safe-area-inset-bottom, 0px))', margin: '0 auto', maxWidth: 420, background: 'var(--tx)', color: 'var(--card)', borderRadius: 12, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', zIndex: 40, ...USER_TEXT }}>
          {toast.tone === 'ok' ? <Check size={16} strokeWidth={2} color="var(--ok)" aria-hidden /> : null}
          <span style={{ flex: 1, ...USER_TEXT }}>{toast.message}</span>
          {toast.action ? <span>{' · '}</span> : null}
          {toast.action ? (
            <button type="button" onClick={() => { const run = toast.action?.onClick; setToast(null); run?.() }} style={toastAction}>{toast.action.label}</button>
          ) : null}
          {toast.second ? (
            <button type="button" onClick={() => { const run = toast.second?.onClick; setToast(null); run?.() }} style={toastAction}>{toast.second.label}</button>
          ) : null}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast fuori da ToastProvider')
  return ctx
}
