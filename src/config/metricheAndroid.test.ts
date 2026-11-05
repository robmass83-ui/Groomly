import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('raccolta spenta di base', () => {
  it('il manifest parte con tutto spento e senza AD_ID', () => {
    const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
    for (const nome of [
      'firebase_analytics_collection_enabled',
      'firebase_crashlytics_collection_enabled',
      'google_analytics_adid_collection_enabled',
      'google_analytics_ssaid_collection_enabled',
      'google_analytics_default_allow_ad_personalization_signals',
    ]) {
      expect(manifest).toContain(`android:name="${nome}" android:value="false"`)
    }
    expect(manifest).toMatch(/com\.google\.android\.gms\.permission\.AD_ID"\s+tools:node="remove"/)
  })

  it('il sito admin non carica i plugin', () => {
    expect(readFileSync('vite.config.ts', 'utf8')).toContain("'@capacitor-firebase/analytics'")
    expect(readFileSync('vite.config.ts', 'utf8')).toContain("'@capacitor-firebase/crashlytics'")
    expect(readFileSync('scripts/controlla-bundle-admin.mjs', 'utf8')).toContain('capacitor-firebase')
  })
})
