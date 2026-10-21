import { describe, expect, it } from 'vitest'
import { isSheetPath } from './sheetRoute'

describe('isSheetPath', () => {
  it('riconosce il personale e le chiusure, non l’elenco delle chiusure', () => {
    expect(isSheetPath('/appuntamenti/personale/nuovo')).toBe(true)
    expect(isSheetPath('/appuntamenti/personale/p1')).toBe(true)
    expect(isSheetPath('/chiusure/nuovo')).toBe(true)
    expect(isSheetPath('/chiusure/c1')).toBe(true)
    expect(isSheetPath('/chiusure')).toBe(false)
  })
})
