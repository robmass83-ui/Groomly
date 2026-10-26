import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isNewerVersion } from './appRelease'
import { tagPubblicato, urlApk, urlProntoAccettato, urlPubblicatoAccettato, versioneSupera } from './releasePubblicata'

describe('versione pubblicata', () => {
  it('segnala solo una versione più nuova', () => {
    expect(versioneSupera('1.1.97', '1.1.96')).toBe(true)
    expect(versioneSupera('1.1.96', '1.1.96')).toBe(false)
    expect(versioneSupera('1.1.95', '1.1.96')).toBe(false)
    expect(tagPubblicato('v1.1.96')).toBe('1.1.96')
  })

  it('accetta groomly.apk solo se è la versione del tag', () => {
    expect(urlApk('1.1.97')).toBe('https://groomlyapp.it/groomly-1.1.97.apk')
    expect(urlPubblicatoAccettato('1.1.96', 'https://groomlyapp.it/groomly.apk', '1.1.96')).toBe(true)
    expect(urlPubblicatoAccettato('1.1.97', 'https://groomlyapp.it/groomly.apk', '1.1.96')).toBe(false)
    expect(urlPubblicatoAccettato('1.1.97', urlApk('1.1.97'), '1.1.96')).toBe(false)
    expect(urlProntoAccettato('1.1.97', urlApk('1.1.97'), '1.1.96')).toBe(true)
    expect(urlProntoAccettato('1.1.97', 'https://groomlyapp.it/groomly.apk', '1.1.96')).toBe(false)
  })

  it('tiene hosting/release.json non più nuovo dell’ultimo tag GitHub', () => {
    const hosted = JSON.parse(readFileSync(path.join(process.cwd(), 'hosting', 'release.json'), 'utf8')) as {
      version: string
      url: string
    }
    const raw = execFileSync('gh', ['release', 'view', '--repo', 'robmass83-ui/Groomly', '--json', 'tagName'], {
      encoding: 'utf8',
    })
    const tag = tagPubblicato((JSON.parse(raw) as { tagName: string }).tagName)
    expect(versioneSupera(hosted.version, tag)).toBe(false)
    expect(isNewerVersion(hosted.version, tag)).toBe(false)
    expect(urlPubblicatoAccettato(hosted.version, hosted.url, tag)).toBe(true)
  })
})
