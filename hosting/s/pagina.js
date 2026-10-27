(function () {
  var nodo = document.getElementById('profilo')
  var dati = nodo ? JSON.parse(nodo.textContent || '{}') : {}
  var root = document.getElementById('prenota')
  if (!root) return
  var lang = dati.lang === 'en' || dati.lang === 'es' ? dati.lang : 'it'
  var t = {
    it: {
      titolo: 'Prenota un appuntamento',
      passi: ['Animale', 'Giorno', 'Orario', 'Dati'],
      animale: 'Tipo di animale',
      cane: 'Cane', gatto: 'Gatto', altro: 'Altro',
      taglia: 'Taglia', piccola: 'Piccola', media: 'Media', grande: 'Grande',
      poi: 'Scegli il tipo di animale: poi vedi i giorni in cui il salone ha posto.',
      tagliaManca: 'Scegli la taglia per aprire gli orari.',
      giorno: 'Giorno',
      carico: 'Sto controllando i giorni liberi del salone…',
      vuoto: 'In queste settimane non ci sono orari liberi.',
      errore: 'Non riesco a leggere gli orari.',
      riprova: 'Riprova',
      prima: 'Mese precedente', dopo: 'Mese successivo',
      libero: 'orari disponibili', chiuso: 'nessun orario',
      orariDi: 'Orari',
      dati: 'I tuoi dati',
      nome: 'Il tuo nome', telefono: 'Cellulare', email: 'Email', caneNome: 'Nome dell’animale',
      consenso: 'Ho letto l’informativa privacy e accetto che il salone riceva questi dati.',
      privacy: 'Informativa',
      invia: 'Invia la richiesta',
      nota: 'Non è ancora una conferma: la richiesta arriva al salone, che ti risponde.',
      ok: 'Richiesta inviata a {{nome}}. Il salone la conferma.',
      okMail: 'Richiesta inviata a {{nome}}. Ti arriverà un’email.',
      ko: 'Invio non riuscito. Riprova.',
      spente: 'Questo salone non accetta prenotazioni online. Puoi chiamare il numero qui sopra.',
      problemi: 'Controlla questi campi',
      nomeKo: 'Scrivi il tuo nome.',
      telKo: 'Scrivi un cellulare.',
      emailKo: 'Scrivi un’email valida.',
      caneKo: 'Scrivi il nome dell’animale.',
      consensoKo: 'Serve il consenso per inviare la richiesta.',
      specie: { cane: 'Cane', gatto: 'Gatto', altro: 'Altro' },
      taglie: { piccola: 'taglia piccola', media: 'taglia media', grande: 'taglia grande' },
    },
    en: {
      titolo: 'Book an appointment',
      passi: ['Pet', 'Day', 'Time', 'Details'],
      animale: 'Type of pet',
      cane: 'Dog', gatto: 'Cat', altro: 'Other',
      taglia: 'Size', piccola: 'Small', media: 'Medium', grande: 'Large',
      poi: 'Choose the type of pet, then the days when the salon has room.',
      tagliaManca: 'Choose the size to open the times.',
      giorno: 'Day',
      carico: 'Checking the salon’s free days…',
      vuoto: 'There are no free times in these weeks.',
      errore: 'The times could not be loaded.',
      riprova: 'Try again',
      prima: 'Previous month', dopo: 'Next month',
      libero: 'times available', chiuso: 'no times',
      orariDi: 'Times',
      dati: 'Your details',
      nome: 'Your name', telefono: 'Mobile', email: 'Email', caneNome: 'Pet’s name',
      consenso: 'I have read the privacy notice and agree the salon receives these details.',
      privacy: 'Privacy notice',
      invia: 'Send the request',
      nota: 'This is not a confirmation yet: the request goes to the salon, and they reply.',
      ok: 'Request sent to {{nome}}. The salon will confirm it.',
      okMail: 'Request sent to {{nome}}. You will get an email.',
      ko: 'The request was not sent. Try again.',
      spente: 'This salon is not taking online bookings. You can call the number above.',
      problemi: 'Check these fields',
      nomeKo: 'Write your name.',
      telKo: 'Write a mobile number.',
      emailKo: 'Write a valid email.',
      caneKo: 'Write the pet’s name.',
      consensoKo: 'Consent is needed to send the request.',
      specie: { cane: 'Dog', gatto: 'Cat', altro: 'Other' },
      taglie: { piccola: 'small', media: 'medium', grande: 'large' },
    },
    es: {
      titolo: 'Reserva una cita',
      passi: ['Animal', 'Día', 'Hora', 'Datos'],
      animale: 'Tipo de animal',
      cane: 'Perro', gatto: 'Gato', altro: 'Otro',
      taglia: 'Tamaño', piccola: 'Pequeño', media: 'Mediano', grande: 'Grande',
      poi: 'Elige el tipo de animal y verás los días en los que el salón tiene sitio.',
      tagliaManca: 'Elige el tamaño para abrir los horarios.',
      giorno: 'Día',
      carico: 'Estoy mirando los días libres del salón…',
      vuoto: 'En estas semanas no hay horarios libres.',
      errore: 'No consigo leer los horarios.',
      riprova: 'Reintentar',
      prima: 'Mes anterior', dopo: 'Mes siguiente',
      libero: 'horarios disponibles', chiuso: 'sin horario',
      orariDi: 'Horarios',
      dati: 'Tus datos',
      nome: 'Tu nombre', telefono: 'Móvil', email: 'Email', caneNome: 'Nombre del animal',
      consenso: 'He leído la información de privacidad y acepto que el salón reciba estos datos.',
      privacy: 'Privacidad',
      invia: 'Enviar la solicitud',
      nota: 'Aún no es una confirmación: la solicitud llega al salón, que te responde.',
      ok: 'Solicitud enviada a {{nome}}. El salón la confirma.',
      okMail: 'Solicitud enviada a {{nome}}. Te llegará un email.',
      ko: 'No se ha enviado. Reintenta.',
      spente: 'Este salón no acepta reservas online. Puedes llamar al número de arriba.',
      problemi: 'Revisa estos campos',
      nomeKo: 'Escribe tu nombre.',
      telKo: 'Escribe un móvil.',
      emailKo: 'Escribe un email válido.',
      caneKo: 'Escribe el nombre del animal.',
      consensoKo: 'Hace falta el consentimiento para enviar la solicitud.',
      specie: { cane: 'Perro', gatto: 'Gato', altro: 'Otro' },
      taglie: { piccola: 'tamaño pequeño', media: 'tamaño mediano', grande: 'tamaño grande' },
    },
  }[lang]
  var locale = lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
  var stato = {
    specie: '', taglia: '', giorno: '', ora: '',
    nome: '', telefono: '', email: '', cane: '', consenso: false,
    mese: '', liberi: null, errore: false, invio: false,
  }

  if (dati.prenotabile !== true) {
    var spento = document.createElement('p')
    spento.textContent = t.spente
    root.append(spento)
    return
  }

  function oggiRoma() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  }
  function aggiungiGiorni(giorno, n) {
    var pezzi = giorno.split('-').map(Number)
    var data = new Date(Date.UTC(pezzi[0], pezzi[1] - 1, pezzi[2] + n))
    return data.toISOString().slice(0, 10)
  }
  function ridotto() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  function mostra(elemento) {
    if (elemento && elemento.scrollIntoView) elemento.scrollIntoView({ behavior: ridotto() ? 'auto' : 'smooth', block: 'nearest' })
  }
  function el(tag, classe, testo) {
    var creato = document.createElement(tag)
    if (classe) creato.className = classe
    if (testo) creato.textContent = testo
    return creato
  }
  function svg(tratti) {
    var icona = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    icona.setAttribute('viewBox', '0 0 24 24')
    icona.setAttribute('width', '28')
    icona.setAttribute('height', '28')
    icona.setAttribute('aria-hidden', 'true')
    icona.setAttribute('fill', 'none')
    icona.setAttribute('stroke', 'currentColor')
    icona.setAttribute('stroke-width', '1.75')
    icona.setAttribute('stroke-linecap', 'round')
    icona.setAttribute('stroke-linejoin', 'round')
    tratti.forEach(function (d) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      icona.append(path)
    })
    return icona
  }
  var icone = {
    cane: ['M4 13c1.5-4 3-6 5-6 1 2 2 3 3 3s2-1 3-3c2 0 3.5 2 5 6', 'M8 13v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2', 'M9 11h.01M15 11h.01', 'M10 15c.5.5 1.2.8 2 .8s1.5-.3 2-.8'],
    gatto: ['M12 21c-4 0-7-3-7-7 0-3 2-5 3-6l2-5 2 4 2-4 2 5c1 1 3 3 3 6 0 4-3 7-7 7z', 'M9 13h.01M15 13h.01', 'M10 16c.6.5 1.3.8 2 .8s1.4-.3 2-.8'],
    altro: ['M12 10.5c-1.2-2-2.2-3-3.2-3C6.6 7.5 5 9.2 5 11.4 5 14.4 8 17 12 19.5 16 17 19 14.4 19 11.4c0-2.2-1.6-3.9-3.8-3.9-1 0-2 1-3.2 3z'],
  }
  function passoAttivo() {
    if (!stato.specie || !stato.taglia) return 0
    if (!stato.giorno) return 1
    if (!stato.ora) return 2
    return 3
  }
  function passi() {
    var lista = el('ol', 'passi')
    var attivo = passoAttivo()
    t.passi.forEach(function (nome, indice) {
      var voce = el('li', indice < attivo ? 'fatto' : '')
      if (indice === attivo) voce.setAttribute('aria-current', 'step')
      voce.append(el('span', 'n', String(indice + 1)))
      voce.append(document.createTextNode(nome))
      lista.append(voce)
    })
    return lista
  }
  function scelta(gruppo, valore, etichetta, icona) {
    var bottone = el('button', 'scelta')
    bottone.type = 'button'
    bottone.setAttribute('aria-pressed', stato[gruppo] === valore ? 'true' : 'false')
    if (icona) bottone.append(svg(icone[icona]))
    bottone.append(document.createTextNode(etichetta))
    bottone.addEventListener('click', function () {
      stato[gruppo] = valore
      if (gruppo === 'specie') stato.ora = ''
      disegna()
    })
    return bottone
  }
  function animale() {
    var box = el('div')
    var specie = el('fieldset')
    specie.append(el('legend', '', t.animale))
    var griglia = el('div', 'scelte')
    ;[['cane', t.cane, 'cane'], ['gatto', t.gatto, 'gatto'], ['altro', t.altro, 'altro']].forEach(function (voce) {
      griglia.append(scelta('specie', voce[2], voce[1], voce[2]))
    })
    specie.append(griglia)
    box.append(specie)
    if (!stato.specie) {
      box.append(el('p', 'testo', t.poi))
      return box
    }
    var taglia = el('fieldset', 'taglie')
    taglia.append(el('legend', '', t.taglia))
    var righe = el('div', 'scelte')
    ;[['piccola', t.piccola], ['media', t.media], ['grande', t.grande]].forEach(function (voce) {
      righe.append(scelta('taglia', voce[0], voce[1]))
    })
    taglia.append(righe)
    box.append(taglia)
    if (!stato.taglia) box.append(el('p', 'testo', t.tagliaManca))
    return box
  }
  function celleMese(anno, mese) {
    var primo = new Date(Date.UTC(anno, mese - 1, 1))
    var offset = (primo.getUTCDay() + 6) % 7
    var totale = new Date(Date.UTC(anno, mese, 0)).getUTCDate()
    var celle = []
    for (var i = 0; i < offset; i += 1) celle.push('')
    for (var giorno = 1; giorno <= totale; giorno += 1) {
      celle.push(anno + '-' + String(mese).padStart(2, '0') + '-' + String(giorno).padStart(2, '0'))
    }
    return celle
  }
  function etichettaGiorno(iso) {
    var pezzi = iso.split('-').map(Number)
    return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(pezzi[0], pezzi[1] - 1, pezzi[2])))
  }
  function calendario() {
    var box = el('div')
    box.append(el('h3', '', t.giorno))
    if (stato.liberi === null && !stato.errore) {
      var attesa = el('p', 'testo', t.carico)
      attesa.setAttribute('role', 'status')
      box.append(attesa)
      return box
    }
    if (stato.errore) {
      var errore = el('p', 'errore', t.errore)
      errore.setAttribute('role', 'alert')
      var riprova = el('button', 'invia', t.riprova)
      riprova.type = 'button'
      riprova.addEventListener('click', function () { stato.errore = false; stato.liberi = null; disegna(); carica() })
      box.append(errore, riprova)
      return box
    }
    var chiavi = Object.keys(stato.liberi)
    if (chiavi.length === 0) {
      box.append(el('p', 'testo', t.vuoto))
      return box
    }
    if (!stato.mese) stato.mese = chiavi[0].slice(0, 7)
    var pezzi = stato.mese.split('-').map(Number)
    var nav = el('div', 'cal-nav')
    var prima = el('button', 'icona', '‹')
    prima.type = 'button'
    prima.setAttribute('aria-label', t.prima)
    var dopo = el('button', 'icona', '›')
    dopo.type = 'button'
    dopo.setAttribute('aria-label', t.dopo)
    var titolo = el('p', '', new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(pezzi[0], pezzi[1] - 1, 1))))
    var minimo = chiavi[0].slice(0, 7)
    var massimo = chiavi[chiavi.length - 1].slice(0, 7)
    prima.disabled = stato.mese <= minimo
    dopo.disabled = stato.mese >= massimo
    prima.addEventListener('click', function () { stato.mese = aggiungiGiorni(stato.mese + '-01', -1).slice(0, 7); disegna() })
    dopo.addEventListener('click', function () { stato.mese = aggiungiGiorni(stato.mese + '-01', 32).slice(0, 7); disegna() })
    nav.append(prima, titolo, dopo)
    box.append(nav)
    var dow = el('div', 'dow')
    dow.setAttribute('aria-hidden', 'true')
    for (var i = 0; i < 7; i += 1) {
      dow.append(el('span', '', new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 5 + i)))))
    }
    var griglia = el('div', 'griglia')
    griglia.setAttribute('role', 'group')
    griglia.setAttribute('aria-label', titolo.textContent || t.giorno)
    celleMese(pezzi[0], pezzi[1]).forEach(function (iso) {
      if (!iso) {
        griglia.append(el('span', 'vuoto'))
        return
      }
      var aperti = stato.liberi[iso] || []
      var bottone = el('button', aperti.length ? 'giorno aperto' : 'giorno', iso.slice(8))
      bottone.type = 'button'
      bottone.disabled = aperti.length === 0
      bottone.setAttribute('aria-pressed', stato.giorno === iso ? 'true' : 'false')
      bottone.setAttribute('aria-label', etichettaGiorno(iso) + ', ' + (aperti.length ? t.libero : t.chiuso))
      bottone.addEventListener('click', function () {
        if (!stato.taglia) {
          mostra(root.querySelector('.taglie'))
          return
        }
        stato.giorno = iso
        stato.ora = ''
        disegna()
        mostra(document.getElementById('orari-giorno'))
      })
      griglia.append(bottone)
    })
    box.append(dow, griglia)
    return box
  }
  function orari() {
    var lista = (stato.liberi && stato.liberi[stato.giorno]) || []
    if (!stato.giorno || lista.length === 0) return null
    var box = el('div')
    box.id = 'orari-giorno'
    box.append(el('h3', '', t.orariDi + ' ' + etichettaGiorno(stato.giorno)))
    var griglia = el('div', 'orari-giorno')
    griglia.setAttribute('role', 'group')
    griglia.setAttribute('aria-label', t.orariDi)
    lista.forEach(function (ora) {
      var bottone = el('button', 'ora', ora)
      bottone.type = 'button'
      bottone.setAttribute('aria-pressed', stato.ora === ora ? 'true' : 'false')
      bottone.addEventListener('click', function () {
        stato.ora = ora
        disegna()
        mostra(document.getElementById('dati-richiesta'))
      })
      griglia.append(bottone)
    })
    box.append(griglia)
    return box
  }
  function campo(id, etichetta, tipo, valore, auto) {
    var wrap = el('div', 'campo')
    var label = el('label', '', etichetta)
    label.htmlFor = id
    var input = document.createElement('input')
    input.id = id
    input.type = tipo
    input.autocomplete = auto
    input.value = valore
    input.addEventListener('input', function () {
      stato[id] = input.value
      pulisciCampo(input)
    })
    wrap.append(label, input)
    return wrap
  }
  function modulo() {
    if (!stato.ora) return null
    var form = el('form')
    form.id = 'dati-richiesta'
    form.noValidate = true
    form.append(el('h3', '', t.dati))
    form.append(el('p', 'testo', [t.specie[stato.specie], t.taglie[stato.taglia], etichettaGiorno(stato.giorno), stato.ora].filter(Boolean).join(' · ')))
    form.append(campo('nome', t.nome, 'text', stato.nome, 'name'))
    form.append(campo('telefono', t.telefono, 'tel', stato.telefono, 'tel'))
    form.append(campo('email', t.email, 'email', stato.email, 'email'))
    form.append(campo('cane', t.caneNome, 'text', stato.cane, 'off'))
    var esca = document.createElement('input')
    esca.className = 'esca'
    esca.name = 'esca'
    esca.tabIndex = -1
    esca.autocomplete = 'off'
    esca.setAttribute('aria-hidden', 'true')
    form.append(esca)
    var consenso = el('label', 'consenso')
    var check = document.createElement('input')
    check.type = 'checkbox'
    check.id = 'consenso'
    check.checked = stato.consenso
    check.addEventListener('change', function () {
      stato.consenso = check.checked
      pulisciCampo(check)
    })
    consenso.append(check, document.createTextNode(' ' + t.consenso))
    form.append(consenso)
    var privacy = el('a', '', t.privacy)
    privacy.href = '/privacy/?lang=' + lang
    form.append(privacy)
    form.append(el('p', 'testo', t.nota))
    var invia = el('button', 'invia', t.invia)
    invia.type = 'submit'
    invia.disabled = stato.invio
    form.append(invia)
    form.addEventListener('submit', function (evento) {
      evento.preventDefault()
      inviaRichiesta(form, esca)
    })
    return form
  }
  function pulisciCampo(input) {
    var wrap = input.closest('.campo') || input.parentElement
    if (wrap) {
      wrap.classList.remove('non-valido')
      var errore = wrap.querySelector('.errore')
      if (errore) errore.remove()
    }
    var form = input.form
    if (form && !form.querySelector('.non-valido')) {
      var somma = form.querySelector('.somma')
      if (somma) somma.remove()
    }
  }
  function problemi(form) {
    var voci = []
    if (stato.nome.trim().length < 2) voci.push(['nome', t.nomeKo])
    if (stato.telefono.replace(/\D/g, '').length < 6) voci.push(['telefono', t.telKo])
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stato.email.trim())) voci.push(['email', t.emailKo])
    if (stato.cane.trim().length < 1) voci.push(['cane', t.caneKo])
    if (!stato.consenso) voci.push(['consenso', t.consensoKo])
    form.querySelectorAll('.errore,.somma').forEach(function (nodoErrore) { nodoErrore.remove() })
    form.querySelectorAll('.non-valido').forEach(function (nodoCampo) { nodoCampo.classList.remove('non-valido') })
    if (voci.length === 0) return false
    var somma = el('div', 'somma')
    somma.tabIndex = -1
    somma.setAttribute('role', 'alert')
    somma.append(el('p', '', t.problemi))
    voci.forEach(function (voce) {
      var link = el('a', '', voce[1])
      link.href = '#' + voce[0]
      somma.append(link)
      var campoNodo = document.getElementById(voce[0])
      var wrap = campoNodo ? campoNodo.closest('.campo') || campoNodo.parentElement : null
      if (wrap) {
        wrap.classList.add('non-valido')
        var errore = el('p', 'errore', voce[1])
        errore.id = voce[0] + '-errore'
        if (campoNodo) campoNodo.setAttribute('aria-describedby', errore.id)
        wrap.append(errore)
      }
    })
    form.insertBefore(somma, form.firstChild)
    somma.focus()
    return true
  }
  function inviaRichiesta(form, esca) {
    if (stato.invio || problemi(form)) return
    stato.invio = true
    var bottone = form.querySelector('.invia')
    if (bottone) bottone.disabled = true
    fetch('https://europe-west1-groomly-3128b.cloudfunctions.net/inviaRichiesta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {
        salonId: dati.salonId,
        nome: stato.nome.trim(),
        phone: stato.telefono.trim(),
        email: stato.email.trim(),
        cane: stato.cane.trim(),
        taglia: stato.taglia,
        specie: stato.specie,
        servizi: ['appuntamento'],
        giorno: stato.giorno,
        ora: stato.ora,
        inizio: stato.giorno + 'T' + stato.ora + ':00',
        fine: stato.giorno + 'T' + stato.ora + ':00',
        esca: esca.value,
        consenso: true,
      } }),
    }).then(function (risposta) {
      return risposta.json().then(function (corpo) { return { ok: risposta.ok, corpo: corpo } })
    }).then(function (esito) {
      stato.invio = false
      if (esito.ok && esito.corpo && esito.corpo.result && esito.corpo.result.ok) {
        root.replaceChildren()
        var fatto = el('p', 'ok', (esito.corpo.result.emailStato === 'inviata' ? t.okMail : t.ok).replace('{{nome}}', dati.nome || ''))
        fatto.setAttribute('role', 'status')
        root.append(fatto)
        return
      }
      var messaggio = esito.corpo && esito.corpo.error && esito.corpo.error.message
      var avviso = el('p', 'errore', messaggio && messaggio !== 'INTERNAL' ? messaggio : t.ko)
      avviso.setAttribute('role', 'alert')
      form.append(avviso)
      if (bottone) bottone.disabled = false
    }).catch(function () {
      stato.invio = false
      var avviso = el('p', 'errore', t.ko)
      avviso.setAttribute('role', 'alert')
      form.append(avviso)
      if (bottone) bottone.disabled = false
    })
  }
  function disegna() {
    root.replaceChildren()
    root.append(el('h2', '', t.titolo))
    root.append(passi())
    root.append(animale())
    if (!stato.specie) return
    root.append(calendario())
    var fascia = orari()
    if (fascia) root.append(fascia)
    var form = modulo()
    if (form) root.append(form)
  }
  function demo() {
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return null
    if (!/[?&]demo=1(?:&|$)/.test(location.search)) return null
    var oggi = oggiRoma()
    var giorni = {}
    giorni[oggi] = ['16:00', '17:00']
    giorni[aggiungiGiorni(oggi, 1)] = ['09:00', '10:00', '11:00']
    giorni[aggiungiGiorni(oggi, 3)] = ['16:00']
    return giorni
  }
  function carica() {
    var finto = demo()
    if (finto) {
      stato.liberi = finto
      stato.mese = oggiRoma().slice(0, 7)
      disegna()
      return
    }
    fetch('https://europe-west1-groomly-3128b.cloudfunctions.net/postiLiberi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { salonId: dati.salonId, giorno: oggiRoma(), giorni: 42, durataMin: 60 } }),
    }).then(function (risposta) { return risposta.json() }).then(function (corpo) {
      var result = corpo && corpo.result ? corpo.result : {}
      if (result.giorni && typeof result.giorni === 'object') stato.liberi = result.giorni
      else if (Array.isArray(result.orari)) {
        stato.liberi = {}
        if (result.orari.length) stato.liberi[oggiRoma()] = result.orari
      } else {
        stato.errore = true
        stato.liberi = {}
      }
      stato.mese = oggiRoma().slice(0, 7)
      disegna()
    }).catch(function () {
      stato.errore = true
      stato.liberi = {}
      disegna()
    })
  }
  disegna()
  carica()
})()
