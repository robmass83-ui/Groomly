import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import logoTestata from '../../assets/brand/groomly-logo-testata.svg'
import logoTestataScuro from '../../assets/brand/groomly-logo-testata-scuro.svg'
import logoPlus from '../../assets/brand/groomly-plus-logo-orizzontale.svg'
import logoPlusScuro from '../../assets/brand/groomly-plus-logo-scuro.svg'
import logoSalone from '../../assets/brand/groomly-salon-logo-orizzontale.svg'
import logoSaloneScuro from '../../assets/brand/groomly-salon-logo-scuro.svg'
import logoVip from '../../assets/brand/groomly-vip-logo-orizzontale.svg'
import logoVipScuro from '../../assets/brand/groomly-vip-logo-scuro.svg'
import type { LivelloElenco } from '../../lib/funzioniPiano'
import { SIZES } from '../../theme/sizes'
import { BrandBar, logoTestataPer } from './BrandBar'

const livelloForzato = vi.hoisted(() => ({ valore: undefined as LivelloElenco | undefined }))
vi.mock('../../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/usePiano')>('../../hooks/usePiano')
  return { ...actual, usePiano: () => ({ ...actual.usePiano(), livelloNome: livelloForzato.valore }) }
})

describe('logo di testata', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
    livelloForzato.valore = undefined
  })

  it('nelle pagine è il logo chiaro alto 30 px', () => {
    render(<BrandBar />)
    const logo = screen.getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('src', logoTestata)
    expect(logo).toHaveAttribute('height', '30')
    expect(screen.getByTestId('brand-bar').tagName).toBe('DIV')
    expect(SIZES.brandBar).toEqual({ regular: 30, medium: 36, large: 44, padTop: 10, gap: 8 })
  })

  it('in Home è il titolo, alto 44 px', () => {
    render(<BrandBar size="large" as="h1" />)
    const heading = screen.getByRole('heading', { name: 'Groomly' })
    expect(heading).toBe(screen.getByTestId('brand-bar'))
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '44')
  })

  it('nelle Impostazioni è un po’ più grande, 36 px', () => {
    render(<BrandBar size="medium" />)
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '36')
  })

  it('segue il tema scuro', async () => {
    document.documentElement.dataset.theme = 'dark'
    render(<BrandBar />)
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('src', logoTestataScuro)
    await act(async () => {
      document.documentElement.dataset.theme = 'light'
    })
    await waitFor(() => expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('src', logoTestata))
  })

  it('con Plus mostra il logo Groomly Plus', () => {
    livelloForzato.valore = 'pro'
    render(<BrandBar />)
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('src', logoPlus)
  })

  it('sceglie il logo per ogni piano, in chiaro e in scuro', () => {
    expect(logoTestataPer(undefined, false)).toBe(logoTestata)
    expect(logoTestataPer('base', true)).toBe(logoTestataScuro)
    expect(logoTestataPer('pro', false)).toBe(logoPlus)
    expect(logoTestataPer('pro', true)).toBe(logoPlusScuro)
    expect(logoTestataPer('salone', false)).toBe(logoSalone)
    expect(logoTestataPer('salone', true)).toBe(logoSaloneScuro)
    expect(logoTestataPer('vip', false)).toBe(logoVip)
    expect(logoTestataPer('vip', true)).toBe(logoVipScuro)
  })
})
