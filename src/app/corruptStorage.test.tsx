// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { createAccount } from '../data/local/auth'
import { storageKeys } from '../data/local/storage'

describe('mappa cani illeggibile', () => {
  beforeEach(() => localStorage.clear())

  it('mostra il messaggio e lascia il valore nella chiave', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const key = storageKeys.dogs(account.uid)
    localStorage.setItem(key, '{')
    render(<App memory isDev={false} />)
    expect(screen.getByText('Dati locali illeggibili')).toBeInTheDocument()
    expect(localStorage.getItem(key)).toBe('{')
  })
})
