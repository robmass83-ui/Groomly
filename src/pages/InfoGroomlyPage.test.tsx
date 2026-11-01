// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InfoGroomlyPage } from './InfoGroomlyPage'

let role: string | undefined

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({ gate: { kind: 'in', account: { uid: 'u1', email: 'x@y.it', role } } }),
}))

vi.mock('./ShellFrame', () => ({ ShellFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

function apri() {
  render(<MemoryRouter><InfoGroomlyPage /></MemoryRouter>)
}

describe('InfoGroomlyPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('groomly.lingua', 'it')
    role = undefined
  })

  it('il collaboratore non vede la guida degli incassi ma vede quella del backup', () => {
    role = 'collaboratore'
    apri()
    expect(screen.queryByText(/Incassi e report/)).not.toBeInTheDocument()
    expect(screen.getByText('Backup')).toBeInTheDocument()
  })

  it('il titolare vede la guida degli incassi', () => {
    role = 'titolare'
    apri()
    expect(screen.getByText(/Incassi e report/)).toBeInTheDocument()
  })
})
