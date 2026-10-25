import type { FirebaseApp } from 'firebase/app'

export const APP_CHECK_ATTIVO = false
export const RECAPTCHA_SITE_KEY = ''

export type AppCheckModo = 'spento' | 'play-integrity' | 'recaptcha'

export function modoAppCheck(attivo: boolean, dove: 'app' | 'pagina', siteKey: string): AppCheckModo {
  if (!attivo) return 'spento'
  if (dove === 'pagina') return siteKey.trim() ? 'recaptcha' : 'spento'
  return 'play-integrity'
}

type Avvia = (modo: Exclude<AppCheckModo, 'spento'>, app: FirebaseApp, siteKey: string) => Promise<void>

async function avviaPredefinito(modo: Exclude<AppCheckModo, 'spento'>, app: FirebaseApp, siteKey: string): Promise<void> {
  const { initializeAppCheck, CustomProvider, ReCaptchaV3Provider } = await import('firebase/app-check')
  if (modo === 'recaptcha') {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true })
    return
  }
  const { registerPlugin } = await import('@capacitor/core')
  const bridge = registerPlugin<{ getToken: () => Promise<{ token: string; expireTimeMillis: number }> }>('AppCheckBridge')
  initializeAppCheck(app, {
    provider: new CustomProvider({
      getToken: async () => bridge.getToken(),
    }),
    isTokenAutoRefreshEnabled: true,
  })
}

/** Non fa nulla finché `APP_CHECK_ATTIVO` è false. L’app usa Play Integrity, la pagina reCAPTCHA. */
export async function preparaAppCheck(
  app: FirebaseApp,
  dove: 'app' | 'pagina',
  deps: { attivo?: boolean; siteKey?: string; avvia?: Avvia } = {},
): Promise<AppCheckModo> {
  const attivo = deps.attivo ?? APP_CHECK_ATTIVO
  const siteKey = deps.siteKey ?? RECAPTCHA_SITE_KEY
  const modo = modoAppCheck(attivo, dove, siteKey)
  if (modo === 'spento') return modo
  await (deps.avvia ?? avviaPredefinito)(modo, app, siteKey)
  return modo
}
