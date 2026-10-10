import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FlagIcon } from '../domain/FlagIcon'
import { Button } from './Button'
import { Chip } from './Chip'
import { ChipRow } from './ChipRow'
import { FilterChip } from './FilterChip'
import { Input } from './Input'
import { ServiceChip } from './ServiceChip'
import { StatusPill } from './StatusPill'
import { SearchBar } from './SearchBar'
import { Segmented } from './Segmented'
import { Switch, Toggle } from './Toggle'

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
        <Switch label="Attivo" checked onChange={onToggle} />
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

  it('completa è verde con spunta, disdetto è rosso senza icona', () => {
    render(
      <div>
        <Button variant="ok" size="sm">Completato</Button>
        <Button variant="secondary" size="sm">Non venuto</Button>
        <Button variant="bad" size="sm">Disdetto</Button>
      </div>,
    )
    expect(screen.getByRole('button', { name: 'Completato' }).getAttribute('style')).toContain('height: 26px')
    expect(screen.getByRole('button', { name: 'Disdetto' }).getAttribute('style')).toContain('color: var(--bad)')
    expect(screen.getByRole('button', { name: 'Non venuto' }).getAttribute('style')).toContain('background: var(--card)')
  })

  it('il campo usa border-width/style inline; border-color solo con errore', () => {
    const { rerender } = render(<Input label="Nome" />)
    let style = screen.getByLabelText('Nome').getAttribute('style') ?? ''
    expect(style).toContain('border-width: 1px')
    expect(style).toContain('border-style: solid')
    expect(style).not.toMatch(/border-color:/)
    expect(style).not.toContain('border: 1px')

    rerender(<Input label="Email" error="Obbligatorio" />)
    style = document.getElementById('Email')?.getAttribute('style') ?? ''
    expect(style).toContain('border-color: var(--bad)')
    expect(style).toContain('box-shadow: 0 0 0 3px var(--bad-s)')

    const css = readFileSync(createRequire(import.meta.url).resolve('../../index.css'), 'utf8')
    expect(css).toMatch(/input,\s*textarea\s*\{[\s\S]*?border-color:\s*var\(--line2\)/)
  })

  it('l’interruttore è 38×22 e Toggle è esportato come Switch', () => {
    expect(Switch).toBe(Toggle)
    render(<Toggle label="Mensile" checked={false} onChange={() => undefined} />)
    const style = screen.getByRole('switch', { name: 'Mensile' }).getAttribute('style') ?? ''
    expect(style).toContain('width: 38px')
    expect(style).toContain('height: 22px')
    expect(style).toContain('background: var(--line2)')
  })

  it('separa la chip servizio dalla pill e accende il filtro', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <ChipRow>
        <ServiceChip iconKey="bagno">Bagno</ServiceChip>
        <StatusPill tone="prim">tra 36 min</StatusPill>
        <FilterChip pressed onClick={onClick}>Tutti</FilterChip>
      </ChipRow>,
    )
    const bagno = screen.getByText('Bagno')
    expect(bagno.getAttribute('style')).toContain('height: 20px')
    expect(bagno.getAttribute('style')).toContain('border-radius: 6px')
    expect(bagno.getAttribute('style')).toContain('color: var(--s-bagno)')
    expect(screen.getByText('tra 36 min').getAttribute('style')).toContain('border-radius: 999px')
    const filtro = screen.getByRole('button', { name: 'Tutti' })
    expect(filtro.getAttribute('style')).toContain('box-shadow: 0 0 0 3px var(--focus)')
    expect(filtro.querySelector('svg')).not.toBeNull()
    await user.click(filtro)
    expect(onClick).toHaveBeenCalledOnce()
    expect(screen.getByText('Bagno').parentElement?.getAttribute('style')).toContain('flex-wrap: wrap')
  })
})
