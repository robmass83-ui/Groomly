import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'

export function ShellFrame({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  function soon() {
    setOpen(false)
    toast.show('In arrivo', 'plain')
  }
  function newDog() {
    setOpen(false)
    navigate('/animali/nuovo')
  }
  return (
    <PhoneShell showNav onFab={() => setOpen(true)}>
      {children}
      <Sheet open={open} title="Nuovo" onClose={() => setOpen(false)}>
        <button type="button" onClick={soon}>Nuovo appuntamento</button>
        <button type="button" onClick={newDog}>Nuovo cane</button>
      </Sheet>
    </PhoneShell>
  )
}
