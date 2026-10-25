import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrariEditor } from './OrariEditor'

describe('editor orari', () => {
  it('con i piani spenti non aggiunge l’editor', () => {
    const { container } = render(<OrariEditor mostra={false} orari={undefined} onChange={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('copia su tutti riempie la settimana', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<OrariEditor mostra orari={{ 1: [{ da: '09:00', a: '13:00' }] }} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Copia su tutti' }))
    expect(onChange.mock.calls[0][0][0]).toEqual([{ da: '09:00', a: '13:00' }])
    expect(onChange.mock.calls[0][0][6]).toEqual([{ da: '09:00', a: '13:00' }])
  })
})
