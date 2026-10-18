export function sharedMirrorKey(uid: string): string {
  return `groomly.users.${uid}.shared-mirror`
}

export function isSharedMirrorTrusted(uid: string): boolean {
  return Boolean(uid) && localStorage.getItem(sharedMirrorKey(uid)) === '1'
}

export function trustSharedMirror(uid: string): void {
  localStorage.setItem(sharedMirrorKey(uid), '1')
}
