// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RigaAuguri, RigaConfermaAttesa, RigaPromemoria } from './RigheHome'

describe('righe in home', () => {
  it('il promemoria da inviare ha il pallino e il cestino, quello partito no', async () => {
    const onCestino = vi.fn()
    const user = userEvent.setup()
    const vista = render(<RigaPromemoria nome="Nina" quando="27 ott alle 18:00" inviato={false} onCestino={onCestino} />)
    expect(screen.getByText('Nina')).toBeInTheDocument()
    expect(screen.getByText('27 ott alle 18:00')).toBeInTheDocument()
    expect(screen.getByText('Promemoria')).toBeInTheDocument()
    expect(screen.getByText('Da inviare')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Da inviare' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cestino' }))
    expect(onCestino).toHaveBeenCalledOnce()

    vista.rerender(<RigaPromemoria nome="Nina" quando="27 ott alle 18:00" inviato onCestino={null} />)
    expect(screen.getByText('Inviato')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Inviato' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cestino' })).not.toBeInTheDocument()

    vista.rerender(<RigaPromemoria nome="Nina" quando="27 ott alle 18:00" inviato={false} nota="Manca l’email" onCestino={onCestino} />)
    expect(screen.getByText('Manca l’email')).toBeInTheDocument()
    expect(screen.queryByText('Da inviare')).not.toBeInTheDocument()
  })

  it('le righe stanno in una scheda e nessun testo si taglia con i puntini', () => {
    const lungo = 'Gingerina Principessa del Borgo Antico'
    const { container } = render(
      <>
        <RigaPromemoria nome={lungo} quando="Domenica 1 novembre alle 18:00" inviato={false} onCestino={() => undefined} />
        <RigaAuguri nome={lungo} onSi={() => undefined} onCestino={() => undefined} errore="Non inviata, riprova" />
        <RigaConfermaAttesa testo={`${lungo} ha confermato il posto in lista d’attesa per il bagno di domani`} />
      </>,
    )
    expect(container.querySelectorAll('[data-scheda="riga-home"]')).toHaveLength(3)
    for (const el of container.querySelectorAll<HTMLElement>('*')) {
      expect(el.style.textOverflow).not.toBe('ellipsis')
      expect(el.style.whiteSpace === 'nowrap' && el.tagName !== 'BUTTON').toBe(false)
    }
    expect(screen.getByText(lungo)).toBeInTheDocument()
  })

  it('gli auguri chiedono sì o il cestino', () => {
    render(<RigaAuguri nome="Fluffy" onSi={() => undefined} onCestino={() => undefined} />)
    expect(screen.getByText('È il compleanno di Fluffy. Inviare gli auguri?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sì' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cestino' })).toBeInTheDocument()
  })
})
