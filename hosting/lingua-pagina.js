(function () {
  var LINGUE = ['it', 'en', 'es', 'fr', 'de']
  var params = new URLSearchParams(location.search)
  var chiesta = params.get('lang')
  var browser = (navigator.language || '').toLowerCase().split('-')[0]
  var lang = LINGUE.indexOf(chiesta) !== -1 ? chiesta : LINGUE.indexOf(browser) !== -1 ? browser : 'en'
  document.documentElement.lang = lang
  var titolo = document.documentElement.getAttribute('data-titolo-' + lang)
  if (titolo) document.title = titolo
  var stile = document.createElement('style')
  stile.textContent = 'nav.lingue{font-size:14px;margin:0 0 16px}nav.lingue a{color:#2E7FB0}[hidden]{display:none!important}body{overflow-wrap:break-word}'
  document.head.appendChild(stile)
  var blocchi = document.querySelectorAll('[data-lang]')
  for (var i = 0; i < blocchi.length; i++) blocchi[i].hidden = blocchi[i].getAttribute('data-lang') !== lang
  var link = document.querySelectorAll('a[href]')
  for (var j = 0; j < link.length; j++) {
    var href = link[j].getAttribute('href') || ''
    if (href.indexOf('mailto:') === 0 || href.indexOf('#') === 0) continue
    var url
    try { url = new URL(href, location.href) } catch (e) { continue }
    if (url.origin !== location.origin) continue
    if (!url.searchParams.has('lang')) url.searchParams.set('lang', lang)
    params.forEach(function (value, key) {
      if (key !== 'lang' && !url.searchParams.has(key)) url.searchParams.set(key, value)
    })
    link[j].setAttribute('href', url.pathname + url.search + url.hash)
  }
})()
