// @vitest-environment happy-dom
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LinguaProvider, useLingua } from './LinguaContext'
import type { Lingua } from './lingua'

describe('LinguaProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('groomly.lingua', 'it')
  })

  it('la lingua della pagina segue subito la lingua scelta', () => {
    let scegli: (lingua: Lingua) => void = () => undefined
    function Sonda() {
      scegli = useLingua().scegli
      return null
    }
    render(<LinguaProvider><Sonda /></LinguaProvider>)
    expect(document.documentElement.lang).toBe('it')
    act(() => scegli('en'))
    expect(document.documentElement.lang).toBe('en')
    act(() => scegli('es'))
    expect(document.documentElement.lang).toBe('es')
  })
})
