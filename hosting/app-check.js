window.GROOMLY_APP_CHECK = false
window.GROOMLY_RECAPTCHA_SITE_KEY = ''

window.preparaAppCheckPagina = async function (app) {
  if (!window.GROOMLY_APP_CHECK) return 'spento'
  var key = String(window.GROOMLY_RECAPTCHA_SITE_KEY || '').trim()
  if (!key) return 'spento'
  var mod = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-check.js')
  mod.initializeAppCheck(app, {
    provider: new mod.ReCaptchaV3Provider(key),
    isTokenAutoRefreshEnabled: true,
  })
  return 'recaptcha'
}
