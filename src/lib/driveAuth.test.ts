import { describe, expect, it } from 'vitest'
import { DriveAuth } from './driveAuth'

describe('DriveAuth sul web', () => {
  it('non collega e non risulta collegato', async () => {
    await expect(DriveAuth.collega()).rejects.toThrow('telefono')
    await expect(DriveAuth.scollega()).rejects.toThrow('telefono')
    await expect(DriveAuth.leggi()).resolves.toEqual({ collegato: false, email: null })
  })
})
