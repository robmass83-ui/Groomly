import { readPushPrefs, type PushPrefs } from '../lib/pushDue'

function pushPrefsKey(uid: string): string {
  return `groomly.pushPrefs.${uid}`
}

export function loadPushPrefs(uid: string): PushPrefs {
  try {
    return readPushPrefs(JSON.parse(localStorage.getItem(pushPrefsKey(uid)) ?? 'null'))
  } catch {
    return readPushPrefs(null)
  }
}

export function savePushPrefs(uid: string, prefs: PushPrefs): void {
  localStorage.setItem(pushPrefsKey(uid), JSON.stringify(readPushPrefs(prefs)))
}
