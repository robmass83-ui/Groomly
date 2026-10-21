import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PUSH_PREFS } from '../lib/pushDue'
import { loadPushPrefs, savePushPrefs } from './pushPrefs'

describe('push preferences', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults for a new account', () => {
    expect(loadPushPrefs('new-uid')).toEqual(DEFAULT_PUSH_PREFS)
  })

  it('saves and reloads account preferences', () => {
    const prefs = {
      ...DEFAULT_PUSH_PREFS,
      enabled: true,
      completeAfterMin: 15,
    }

    savePushPrefs('uid-1', prefs)

    expect(loadPushPrefs('uid-1')).toEqual(prefs)
  })

  it('returns defaults for invalid stored JSON', () => {
    localStorage.setItem('groomly.pushPrefs.uid-1', '{')

    expect(loadPushPrefs('uid-1')).toEqual(DEFAULT_PUSH_PREFS)
  })
})
