import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegniFedelta } from './SegniFedelta'

function stile(nodo: Element): string {
  return nodo.getAttribute('style') ?? ''
}

describe('segni fedeltà', () => {
  it('dieci segni, gli ultimi vuoti, e il premio solo all’ultimo', () => {
    const { container } = render(<SegniFedelta timbri={7} onUsa={() => {}} />)
    expect(screen.queryAllByRole('img', { hidden: true })).toHaveLength(0)
    expect(screen.getByText('7 su 10')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usa premio' })).not.toBeInTheDocument()
    const riga = container.querySelector('[aria-hidden="true"]')
    expect(riga).not.toBeNull()
    const segni = riga!.querySelectorAll(':scope > span')
    expect(segni).toHaveLength(10)
    expect(stile(riga!)).toMatch(/gap:\s*8px/)
    for (const segno of segni) {
      expect(stile(segno)).toMatch(/width:\s*16px/)
      expect(stile(segno)).toMatch(/height:\s*16px/)
      expect(segno.tagName).toBe('SPAN')
    }
    expect(stile(segni[0]!)).toContain('var(--pri)')
    expect(stile(segni[6]!)).toContain('var(--pri)')
    expect(stile(segni[7]!)).toContain('transparent')
    expect(stile(segni[7]!)).toContain('var(--line)')
    expect(stile(segni[9]!)).toContain('transparent')
    expect(stile(segni[9]!)).toContain('var(--line)')
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('a dieci timbri Usa premio è il bottone primario e chiama onUsa', async () => {
    const onUsa = vi.fn()
    const user = userEvent.setup()
    render(<SegniFedelta timbri={10} onUsa={onUsa} />)
    expect(screen.getByText('10 su 10')).toBeInTheDocument()
    const premio = screen.getByRole('button', { name: 'Usa premio' })
    expect(stile(premio)).toContain('var(--pri-solid)')
    expect(stile(premio)).toMatch(/min-height:\s*48px/)
    await user.click(premio)
    expect(onUsa).toHaveBeenCalledOnce()
  })
})
