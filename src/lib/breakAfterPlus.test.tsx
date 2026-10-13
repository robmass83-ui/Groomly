import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { breakAfterPlus } from './breakAfterPlus'

describe('a capo dopo il +', () => {
  it('mette un punto di a capo dopo ogni + e lascia il testo uguale', () => {
    const { container } = render(<div>{breakAfterPlus('Bagno+sistemazione')}</div>)
    const box = container.firstElementChild!
    expect(box.textContent).toBe('Bagno+sistemazione')
    expect(box.querySelectorAll('wbr')).toHaveLength(1)
    expect(box.innerHTML).toBe('Bagno+<wbr>sistemazione')
  })

  it('senza + non aggiunge nulla', () => {
    const { container } = render(<div>{breakAfterPlus('Stripping')}</div>)
    expect(container.firstElementChild!.innerHTML).toBe('Stripping')
  })
})
