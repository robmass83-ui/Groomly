import { isNewerVersion, parseVersion } from './appRelease'

export function tagPubblicato(tag: string): string {
  return tag.trim().replace(/^v/i, '')
}

export function versioneSupera(candidata: string, pubblicata: string): boolean {
  return isNewerVersion(candidata, pubblicata)
}

export function urlApk(versione: string): string {
  return `https://groomlyapp.it/groomly-${versione}.apk`
}

/** L'APK della release GitHub: il sito non lo ospita più. */
export function urlApkGithub(versione: string): string {
  return `https://github.com/robmass83-ui/Groomly/releases/download/v${versione}/groomly.apk`
}

export function urlProntoAccettato(versioneJson: string, url: string, tag: string): boolean {
  if (!parseVersion(versioneJson) || !parseVersion(tag)) return false
  return versioneSupera(versioneJson, tag) && url === urlApk(versioneJson)
}

export function urlPubblicatoAccettato(versioneJson: string, url: string, tag: string): boolean {
  if (!parseVersion(versioneJson) || !parseVersion(tag)) return false
  if (versioneSupera(versioneJson, tag)) return false
  if (url === 'https://groomlyapp.it/groomly.apk' || url === urlApkGithub(tag)) return versioneJson === tag
  return url === urlApk(versioneJson)
}
