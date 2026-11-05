// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'

describe('licenze', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('groomly.lingua', 'it')
  })

  it('mostra l’elenco completo con la licenza di ogni pacchetto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/licenze" />)
    const voce = (await screen.findByText(/^exceljs /)).closest('li')
    expect(voce?.textContent).toContain('MIT')
    expect(screen.getByText(/^react /)).toBeInTheDocument()
    expect(screen.getByText(/^jszip /)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(300)
  })
})
