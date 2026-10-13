import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import logoTestata from '../../assets/brand/groomly-logo-testata.svg'
import logoTestataScuro from '../../assets/brand/groomly-logo-testata-scuro.svg'
import { SIZES } from '../../theme/sizes'
import { BrandBar } from './BrandBar'

describe('logo di testata', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('nelle pagine è il logo chiaro alto 30 px', () => {
    render(<BrandBar />)
    const logo = screen.getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('src', logoTestata)
    expect(logo).toHaveAttribute('height', '30')
    expect(screen.getByTestId('brand-bar').tagName).toBe('DIV')
    expect(SIZES.brandBar).toEqual({ regular: 30, large: 44, padTop: 10, gap: 8 })
  })

  it('in Home è il titolo, alto 44 px', () => {
    render(<BrandBar size="large" as="h1" />)
    const heading = screen.getByRole('heading', { name: 'Groomly' })
    expect(heading).toBe(screen.getByTestId('brand-bar'))
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '44')
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
})
