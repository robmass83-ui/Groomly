import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { APP_CHECK_ATTIVO, modoAppCheck, preparaAppCheck } from './appCheck'

const root = path.resolve(import.meta.dirname, '../..')

describe('App Check', () => {
  it('resta spento finché il flag non è acceso', () => {
    expect(APP_CHECK_ATTIVO).toBe(false)
    expect(modoAppCheck(false, 'app', 'chiave')).toBe('spento')
    expect(modoAppCheck(false, 'pagina', 'chiave')).toBe('spento')
  })

  it('con il flag acceso usa Play Integrity nell’app e reCAPTCHA sulla pagina', () => {
    expect(modoAppCheck(true, 'app', '')).toBe('play-integrity')
    expect(modoAppCheck(true, 'pagina', 'chiave-sito')).toBe('recaptcha')
    expect(modoAppCheck(true, 'pagina', '  ')).toBe('spento')
  })

  it('non avvia il provider se è spento', async () => {
    const avvia = vi.fn(async () => {})
    await expect(preparaAppCheck({}, 'app', { attivo: false, siteKey: 'chiave', avvia })).resolves.toBe('spento')
    expect(avvia).not.toHaveBeenCalled()
  })

  it('la pagina pubblica ha il flag spento e il provider reCAPTCHA pronto', () => {
    const script = readFileSync(path.join(root, 'hosting/app-check.js'), 'utf8')
    const page = readFileSync(path.join(root, 'hosting/salone/index.html'), 'utf8')
    expect(script).toContain('GROOMLY_APP_CHECK = false')
    expect(script).toContain('ReCaptchaV3Provider')
    expect(page).toContain('/app-check.js')
  })
})
