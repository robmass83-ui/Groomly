import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { aggiornamentiApkAttivi } from './distribuzione'

const root = path.resolve(import.meta.dirname, '../..')

describe('distribuzione', () => {
  afterEach(() => {
    delete window.__GROOMLY_DISTRIBUTION__
  })

  it('tiene l’aggiornamento APK sulla variante github e sul web', () => {
    expect(aggiornamentiApkAttivi()).toBe(true)
    window.__GROOMLY_DISTRIBUTION__ = 'github'
    expect(aggiornamentiApkAttivi()).toBe(true)
  })

  it('spegne l’aggiornamento APK sulla variante play', () => {
    window.__GROOMLY_DISTRIBUTION__ = 'play'
    expect(aggiornamentiApkAttivi()).toBe(false)
  })

  it('tiene lo stesso applicationId e il permesso di installare solo su github', () => {
    const gradle = readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8')
    const main = readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8')
    const github = readFileSync(path.join(root, 'android/app/src/github/AndroidManifest.xml'), 'utf8')
    expect(gradle).toContain('applicationId "it.groomly.app"')
    expect(gradle).toContain('productFlavors')
    expect(gradle).toMatch(/github\s*\{/)
    expect(gradle).toMatch(/play\s*\{/)
    expect(main).not.toContain('REQUEST_INSTALL_PACKAGES')
    expect(github).toContain('REQUEST_INSTALL_PACKAGES')
  })
})
