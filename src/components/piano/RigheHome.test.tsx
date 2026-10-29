// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RigaAuguri, RigaPromemoria } from './RigheHome'

describe('righe in home', () => {
  it('il promemoria da inviare ha il pallino e il cestino, quello partito no', async () => {
    const onCestino = vi.fn()
    const user = userEvent.setup()
    const vista = render(<RigaPromemoria nome="Nina" quando="27 ott alle 18:00" inviato={false} onCestino={onCestino} />)
    expect(screen.getByText('Nina')).toBeInTheDocument()
    expect(screen.getByText('27 ott alle 18:00')).toBeInTheDocument()
    expect(screen.getByText('Promemoria')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Da inviare' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cestino' }))
    expect(onCestino).toHaveBeenCalledOnce()

    vista.rerender(<RigaPromemoria nome="Nina" quando="27 ott alle 18:00" inviato onCestino={null} />)
    expect(screen.getByRole('img', { name: 'Inviato' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cestino' })).not.toBeInTheDocument()
  })

  it('gli auguri chiedono sì o il cestino', () => {
    render(<RigaAuguri nome="Fluffy" onSi={() => undefined} onCestino={() => undefined} />)
    expect(screen.getByText('È il compleanno di Fluffy. Inviare gli auguri?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sì' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cestino' })).toBeInTheDocument()
  })
})
