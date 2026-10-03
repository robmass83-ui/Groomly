import { useState, type ReactNode } from 'react'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'

export function ShellFrame({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()
  function soon() {
    setOpen(false)
    toast.show('In arrivo', 'plain')
  }
  return (
    <PhoneShell showNav onFab={() => setOpen(true)}>
      {children}
      <Sheet open={open} title="Nuovo" onClose={() => setOpen(false)}>
        <button type="button" onClick={soon}>Nuovo appuntamento</button>
        <button type="button" onClick={soon}>Nuovo cane</button>
      </Sheet>
    </PhoneShell>
  )
}
