import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FlagIcon } from '../domain/FlagIcon'
import { Button } from './Button'
import { Chip } from './Chip'
import { Input } from './Input'
import { SearchBar } from './SearchBar'
import { Segmented } from './Segmented'
import { Toggle } from './Toggle'

function ThemeProbe() {
  const [value, setValue] = useState<'light' | 'dark' | 'auto'>('auto')
  return (
    <Segmented
      label="Tema"
      value={value}
      onChange={setValue}
      options={[
        { value: 'light', label: 'Chiaro' },
        { value: 'dark', label: 'Scuro' },
        { value: 'auto', label: 'Auto' },
      ]}
    />
  )
}

describe('ui kit', () => {
  it('mostra bottone, chip, errore di campo e ricerca', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <div>
        <Button>Entra</Button>
        <Chip>Principale</Chip>
        <Input label="Email" error="Inserisci un’email valida" />
        <SearchBar onClick={onClick} />
      </div>,
    )
    expect(screen.getByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.getByText('Principale')).toBeInTheDocument()
    expect(screen.getByText('Inserisci un’email valida')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('cambia tema e toggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <div>
        <ThemeProbe />
        <Toggle label="Attivo" checked onChange={onToggle} />
      </div>,
    )
    await user.click(screen.getByRole('radio', { name: 'Scuro' }))
    expect(screen.getByRole('radio', { name: 'Scuro' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('switch', { name: 'Attivo' }))
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('il chip selezionato è pieno e la bandiera ha l’alt', () => {
    render(<Chip tone="sel">Tutti</Chip>)
    expect(screen.getByText('Tutti')).toHaveStyle({ background: 'var(--pri)' })
    render(<FlagIcon kind="mensile" size={25} />)
    expect(screen.getByAltText('Mensile')).toBeInTheDocument()
  })
})
