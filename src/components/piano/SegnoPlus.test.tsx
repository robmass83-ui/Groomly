// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Providers } from '../../app/providers'
import { SegnoPlus } from './SegnoPlus'

describe('segno Plus', () => {
  it('per una funzione Plus mostra il fulmine e la scritta Plus', () => {
    const { container } = render(<Providers><SegnoPlus feature="export" /></Providers>)
    expect(screen.getByLabelText('Plus')).toHaveTextContent('Plus')
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('per una funzione del livello Salone mostra Salone', () => {
    render(<Providers><SegnoPlus feature="team" /></Providers>)
    expect(screen.getByLabelText('Salone')).toHaveTextContent('Salone')
  })
})
