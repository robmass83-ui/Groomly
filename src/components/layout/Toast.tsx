import { Check } from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type Tone = 'ok' | 'plain'
type ToastAction = { label: string; onClick: () => void }
type ToastItem = { id: number; message: string; tone: Tone; action?: ToastAction } | null

const ToastContext = createContext<{ show: (message: string, tone: Tone, action?: ToastAction) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem>(null)
  const timer = useRef<number | null>(null)
  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current)
  }, [])
  const api = useMemo(() => ({
    show(message: string, tone: Tone, action?: ToastAction) {
      const id = Date.now()
      setToast({ id, message, tone, action })
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = null
        setToast((current) => (current?.id === id ? null : current))
      }, 2000)
    },
  }), [])
  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <div role="status" style={{ position: 'fixed', left: '50%', bottom: 72, transform: 'translateX(-50%)', background: 'var(--tx)', color: 'var(--card)', borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center', zIndex: 40 }}>
          {toast.tone === 'ok' ? <Check size={14} strokeWidth={2} color="var(--ok)" aria-hidden /> : null}
          {toast.message}
          {toast.action ? (
            <button type="button" onClick={() => { const run = toast.action?.onClick; setToast(null); run?.() }}>{toast.action.label}</button>
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
