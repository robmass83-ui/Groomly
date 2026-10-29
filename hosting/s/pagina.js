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
      servizio: 'Servizio',
      prezzi: 'I prezzi sono indicativi. Possono variare dopo aver visto l’animale, se ci sono nodi o problemi che richiedono più tempo.',
      totale: 'Totale indicativo {{n}} €',
      giorno: 'Giorno',
      carico: 'Sto controllando i giorni liberi del salone…',
      vuoto: 'In queste settimane non ci sono orari liberi.',
      errore: 'Non riesco a leggere gli orari.',
      riprova: 'Riprova',
      prima: 'Mese precedente', dopo: 'Mese successivo',
      libero: 'orari disponibili', chiuso: 'nessun orario',
      orariDi: 'Orari',
      dati: 'I tuoi dati',
      nome: 'Il tuo nome', telefono: 'Cellulare', email: 'Email', caneNome: 'Nome dell’animale', razza: 'Razza',
      foto: 'Foto dell’animale',
      fotoAiuto: 'Puoi aggiungerne fino a 3.',
      fotoAggiungi: 'Aggiungi foto',
      fotoTogli: 'Togli foto {{n}}',
      fotoAlt: 'Foto {{n}} dell’animale',
      fotoPreparo: 'Sto preparando le foto…',
      consenso: 'Ho letto l’informativa privacy e accetto che il salone riceva questi dati.',
      privacy: 'Informativa',
      torna: 'Torna alla prenotazione',
      invia: 'Invia la richiesta',
      nota: 'Questa è una richiesta, non ancora una prenotazione: il salone la valuterà e ti risponderà via email.',
      fotoNota: { cane: 'La foto del cane', gatto: 'La foto del gatto', altro: 'La foto dell’animale' },
      ok: 'Grazie, richiesta inviata a {{nome}}. Non è ancora una prenotazione: la risposta arriverà a {{email}} (dai un’occhiata anche allo spam). Se il salone conferma il giorno e l’ora che hai chiesto, quella email vale come conferma. Se propone un altro orario, troverai i pulsanti per accettare o rifiutare e il tempo per rispondere: senza risposta, il posto verrà liberato.',
      okSenza: 'Richiesta inviata a {{nome}}. Non è ancora una prenotazione.',
      ko: 'Invio non riuscito. Riprova.',
      spente: 'Questo salone non accetta prenotazioni online. Puoi chiamare il numero qui sopra.',
      problemi: 'Controlla questi campi',
      nomeKo: 'Scrivi il tuo nome.',
      telKo: 'Scrivi un cellulare.',
      emailKo: 'Scrivi un’email valida.',
      caneKo: 'Scrivi il nome dell’animale.',
      razzaKo: 'Scrivi la razza.',
      fotoKo: 'Questa foto non si può usare. Scegline un’altra.',
      fotoTroppe: 'Puoi allegare al massimo 3 foto.',
      consensoKo: 'Serve il consenso per inviare la richiesta.',
      specie: { cane: 'Cane', gatto: 'Gatto', altro: 'Altro' },
      taglie: { piccola: 'taglia piccola', media: 'taglia media', grande: 'taglia grande' },
      lista: 'Lista d’attesa',
      liberoDomanda: 'Il posto è ancora libero. Vuoi confermare?',
      conferma: 'Conferma',
      rifiuta: 'Rifiuta',
      occupato: 'Il posto è già stato occupato.',
      restaDomanda: 'Vuoi restare in lista d’attesa per un possibile prossimo buco?',
      resto: 'Sì, resto',
      esco: 'No',
      inAgenda: 'Sei in agenda. Il salone ti aspetta.',
      inLista: 'Resti in lista.',
      uscito: 'Sei uscito dalla lista.',
      iscritto: 'Sei in lista. Se si libera un posto ti arriva una mail.',
      linkKo: 'Questo link non è più valido.',
      listaSpenta: 'La lista d’attesa non è attiva.',
      tante: 'Ci sono già troppe richieste. Riprova più tardi.',
    },
    en: {
      titolo: 'Book an appointment',
      passi: ['Pet', 'Day', 'Time', 'Details'],
      animale: 'Type of pet',
      cane: 'Dog', gatto: 'Cat', altro: 'Other',
      taglia: 'Size', piccola: 'Small', media: 'Medium', grande: 'Large',
      poi: 'Choose the type of pet, then the days when the salon has room.',
      tagliaManca: 'Choose the size to open the times.',
      servizio: 'Service',
      prezzi: 'Prices are a guide. They can change after we see the animal, if there are mats or problems that need more time.',
      totale: 'Indicative total {{n}} €',
      giorno: 'Day',
      carico: 'Checking the salon’s free days…',
      vuoto: 'There are no free times in these weeks.',
      errore: 'The times could not be loaded.',
      riprova: 'Try again',
      prima: 'Previous month', dopo: 'Next month',
      libero: 'times available', chiuso: 'no times',
      orariDi: 'Times',
      dati: 'Your details',
      nome: 'Your name', telefono: 'Mobile', email: 'Email', caneNome: 'Pet’s name', razza: 'Breed',
      foto: 'Photo of the pet',
      fotoAiuto: 'You can add up to 3.',
      fotoAggiungi: 'Add a photo',
      fotoTogli: 'Remove photo {{n}}',
      fotoAlt: 'Photo {{n}} of the pet',
      fotoPreparo: 'Preparing the photos…',
      consenso: 'I have read the privacy notice and agree the salon receives these details.',
      privacy: 'Privacy notice',
      torna: 'Back to the booking',
      invia: 'Send the request',
      nota: 'This is a request, not a booking yet: the salon will review it and reply by email.',
      fotoNota: { cane: 'The dog’s photo', gatto: 'The cat’s photo', altro: 'The pet’s photo' },
      ok: "Thank you, your request has been sent to {{nome}}. This isn't a booking yet: the reply will arrive at {{email}} (please check your spam folder too). If the salon confirms the day and time you asked for, that email is your confirmation. If they suggest a different time, you'll find buttons to accept or decline and the deadline to reply: without a reply, the slot will be released.",
      okSenza: 'Request sent to {{nome}}. This is not a booking yet.',
      ko: 'The request was not sent. Try again.',
      spente: 'This salon is not taking online bookings. You can call the number above.',
      problemi: 'Check these fields',
      nomeKo: 'Write your name.',
      telKo: 'Write a mobile number.',
      emailKo: 'Write a valid email.',
      caneKo: 'Write the pet’s name.',
      razzaKo: 'Write the breed.',
      fotoKo: 'This photo cannot be used. Choose another one.',
      fotoTroppe: 'You can attach up to 3 photos.',
      consensoKo: 'Consent is needed to send the request.',
      specie: { cane: 'Dog', gatto: 'Cat', altro: 'Other' },
      taglie: { piccola: 'small', media: 'medium', grande: 'large' },
      lista: 'Waiting list',
      liberoDomanda: 'The place is still free. Do you want to confirm?',
      conferma: 'Confirm',
      rifiuta: 'Decline',
      occupato: 'The place has already been taken.',
      restaDomanda: 'Do you want to stay on the waiting list for a possible next opening?',
      resto: 'Yes, I’ll stay',
      esco: 'No',
      inAgenda: 'You are booked. The salon is expecting you.',
      inLista: 'You stay on the list.',
      uscito: 'You have left the list.',
      iscritto: 'You are on the list. If a place opens, you will get an email.',
      linkKo: 'This link is no longer valid.',
      listaSpenta: 'The waiting list is not on.',
      tante: 'There are already too many requests. Try again later.',
    },
    es: {
      titolo: 'Reserva una cita',
      passi: ['Animal', 'Día', 'Hora', 'Datos'],
      animale: 'Tipo de animal',
      cane: 'Perro', gatto: 'Gato', altro: 'Otro',
      taglia: 'Tamaño', piccola: 'Pequeño', media: 'Mediano', grande: 'Grande',
      poi: 'Elige el tipo de animal y verás los días en los que el salón tiene sitio.',
      tagliaManca: 'Elige el tamaño para abrir los horarios.',
      servizio: 'Servicio',
      prezzi: 'Los precios son orientativos. Pueden cambiar después de ver al animal, si hay nudos o problemas que pidan más tiempo.',
      totale: 'Total orientativo {{n}} €',
      giorno: 'Día',
      carico: 'Estoy mirando los días libres del salón…',
      vuoto: 'En estas semanas no hay horarios libres.',
      errore: 'No consigo leer los horarios.',
      riprova: 'Reintentar',
      prima: 'Mes anterior', dopo: 'Mes siguiente',
      libero: 'horarios disponibles', chiuso: 'sin horario',
      orariDi: 'Horarios',
      dati: 'Tus datos',
      nome: 'Tu nombre', telefono: 'Móvil', email: 'Email', caneNome: 'Nombre del animal', razza: 'Raza',
      foto: 'Foto del animal',
      fotoAiuto: 'Puedes añadir hasta 3.',
      fotoAggiungi: 'Añadir foto',
      fotoTogli: 'Quitar foto {{n}}',
      fotoAlt: 'Foto {{n}} del animal',
      fotoPreparo: 'Estoy preparando las fotos…',
      consenso: 'He leído la información de privacidad y acepto que el salón reciba estos datos.',
      privacy: 'Privacidad',
      torna: 'Volver a la reserva',
      invia: 'Enviar la solicitud',
      nota: 'Esto es una solicitud, todavía no una reserva: la peluquería la revisará y te responderá por correo.',
      fotoNota: { cane: 'La foto del perro', gatto: 'La foto del gato', altro: 'La foto del animal' },
      ok: 'Gracias, tu solicitud se ha enviado a {{nome}}. Todavía no es una reserva: la respuesta llegará a {{email}} (revisa también la carpeta de spam). Si la peluquería confirma el día y la hora que pediste, ese correo es la confirmación. Si propone otro horario, encontrarás los botones para aceptar o rechazar y el plazo para responder: si no respondes, el hueco quedará libre.',
      okSenza: 'Solicitud enviada a {{nome}}. Todavía no es una reserva.',
      ko: 'No se ha enviado. Reintenta.',
      spente: 'Este salón no acepta reservas online. Puedes llamar al número de arriba.',
      problemi: 'Revisa estos campos',
      nomeKo: 'Escribe tu nombre.',
      telKo: 'Escribe un móvil.',
      emailKo: 'Escribe un email válido.',
      caneKo: 'Escribe el nombre del animal.',
      razzaKo: 'Escribe la raza.',
      fotoKo: 'Esta foto no se puede usar. Elige otra.',
      fotoTroppe: 'Puedes adjuntar como máximo 3 fotos.',
      consensoKo: 'Hace falta el consentimiento para enviar la solicitud.',
      specie: { cane: 'Perro', gatto: 'Gato', altro: 'Otro' },
      taglie: { piccola: 'tamaño pequeño', media: 'tamaño mediano', grande: 'tamaño grande' },
      lista: 'Lista de espera',
      liberoDomanda: 'El sitio sigue libre. ¿Quieres confirmar?',
      conferma: 'Confirmar',
      rifiuta: 'Rechazar',
      occupato: 'El sitio ya está ocupado.',
      restaDomanda: '¿Quieres seguir en la lista de espera por si se libera otro hueco?',
      resto: 'Sí, me quedo',
      esco: 'No',
      inAgenda: 'Ya estás en la agenda. La peluquería te espera.',
      inLista: 'Sigues en la lista.',
      uscito: 'Has salido de la lista.',
      iscritto: 'Estás en la lista. Si se libera un sitio, te llega un correo.',
      linkKo: 'Este enlace ya no es válido.',
      listaSpenta: 'La lista de espera no está activa.',
      tante: 'Ya hay demasiadas solicitudes. Inténtalo más tarde.',
    },
  }[lang]
  var locale = lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
  function specieAmmesse() {
    var base = ['cane', 'gatto', 'altro']
    if (!Array.isArray(dati.specie)) return base
    var scelte = base.filter(function (id) { return dati.specie.indexOf(id) !== -1 })
    return scelte.length ? scelte : base
  }
  var ammesse = specieAmmesse()
  function parametriPosto(giorno, ora) {
    if (typeof giorno !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(giorno)) return null
    if (typeof ora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(ora)) return null
    return { giorno: giorno, ora: ora }
  }
  var queryPosto = new URLSearchParams(location.search)
  var posto = parametriPosto(queryPosto.get('giorno'), queryPosto.get('ora'))
  var stato = {
    specie: '', taglia: '', principale: '', extra: [], giorno: posto ? posto.giorno : '', ora: posto ? posto.ora : '',
    nome: '', telefono: '', email: '', cane: '', razza: '', consenso: false,
    foto: [], fotoErrore: '', fotoCarico: false,
    mese: '', liberi: null, errore: false, invio: false,
    lista: { aperta: false, invio: false, fatto: false },
  }
  var URL_FUNZIONI = 'https://europe-west1-groomly-3128b.cloudfunctions.net/'
  var ORIZZONTE = 42
  var giornoLink = ''
  var giornoLinkUsato = false
  var tokenAttesa = ''

  avviaLink()

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
  function mostra(nodo) {
    if (nodo && nodo.scrollIntoView) nodo.scrollIntoView({ behavior: ridotto() ? 'auto' : 'smooth', block: 'nearest' })
  }
  function el(tag, classe, testo) {
    var nodo = document.createElement(tag)
    if (classe) nodo.className = classe
    if (testo) nodo.textContent = testo
    return nodo
  }
  function svg(d) {
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
    d.forEach(function (tratto) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', tratto)
      icona.append(path)
    })
    return icona
  }
  var icone = {
    cane: [
      'M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5',
      'M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309',
      'M8 14v.5',
      'M16 14v.5',
      'M11.25 16.25h1.5L12 17z',
    ],
    gatto: [
      'M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.2.43-2.37 1-3.44 0 0-1.82-6.42-.42-7 1.39-.58 4.64.26 6.42 2.26.65-.17 1.33-.26 2-.26z',
      'M6.2 9.2 7.4 6.2 9.2 8.6',
      'M17.8 9.2 16.6 6.2 14.8 8.6',
      'M9 13.6c.45-.7 1.15-.7 1.6 0',
      'M13.4 13.6c.45-.7 1.15-.7 1.6 0',
      'M11.25 16.25h1.5L12 17z',
      'M7.2 14.2H3.4',
      'M7.4 15.6H4',
      'M16.8 14.2H20.6',
      'M16.6 15.6H20',
    ],
    altro: ['M12 10.5c-1.2-2-2.2-3-3.2-3C6.6 7.5 5 9.2 5 11.4 5 14.4 8 17 12 19.5 16 17 19 14.4 19 11.4c0-2.2-1.6-3.9-3.8-3.9-1 0-2 1-3.2 3z'],
  }
  function passoAttivo() {
    if (!stato.specie || !stato.taglia || !stato.principale) return 0
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
    if (icona) {
      var disegno = svg(icone[icona])
      disegno.setAttribute('stroke-width', '2')
      bottone.append(disegno)
    }
    bottone.append(document.createTextNode(etichetta))
    bottone.addEventListener('click', function () {
      var prima = stato[gruppo]
      stato[gruppo] = valore
      if (gruppo === 'specie') stato.ora = ''
      if (gruppo === 'taglia' && prima !== valore) {
        azzeraOrario()
        disegna()
        carica()
        return
      }
      disegna()
    })
    return bottone
  }
  function animale() {
    var box = el('div')
    var specie = el('fieldset')
    specie.append(el('legend', '', t.animale))
    var griglia = el('div', 'scelte specie')
    ;[['cane', t.cane], ['gatto', t.gatto], ['altro', t.altro]].filter(function (voce) {
      return ammesse.indexOf(voce[0]) !== -1
    }).forEach(function (voce) {
      griglia.append(scelta('specie', voce[0], voce[1], voce[0]))
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
  function leggiCatalogo() {
    var nodoCatalogo = document.getElementById('catalogo')
    if (!nodoCatalogo) return []
    try {
      var letto = JSON.parse(nodoCatalogo.textContent || '[]')
      return Array.isArray(letto) ? letto : []
    } catch (errore) {
      return []
    }
  }
  var catalogo = leggiCatalogo()
  function vocePerId(id) {
    for (var i = 0; i < catalogo.length; i += 1) {
      if (catalogo[i] && catalogo[i].id === id) return catalogo[i]
    }
    return null
  }
  function numeroTaglia(voce, campo) {
    if (!voce || !voce[campo] || !stato.taglia) return 0
    var n = voce[campo][stato.taglia]
    return typeof n === 'number' ? n : 0
  }
  function serviziScelti() {
    var ids = []
    if (stato.principale) ids.push(stato.principale)
    stato.extra.forEach(function (id) {
      if (ids.indexOf(id) === -1) ids.push(id)
    })
    return ids
  }
  function durataScelta() {
    if (!stato.principale || !vocePerId(stato.principale)) return 0
    var somma = 0
    serviziScelti().forEach(function (id) { somma += numeroTaglia(vocePerId(id), 'minuti') })
    return somma
  }
  function totaleScelto() {
    var somma = 0
    serviziScelti().forEach(function (id) { somma += numeroTaglia(vocePerId(id), 'prezzo') })
    return somma
  }
  function rigaServizio(voce) {
    return voce.nome + ' · ' + numeroTaglia(voce, 'minuti') + ' min · ' + numeroTaglia(voce, 'prezzo') + ' €'
  }
  function azzeraOrario() {
    stato.giorno = ''
    stato.ora = ''
    stato.liberi = null
    stato.errore = false
  }
  function aggiungiVoce(box, voce) {
    var label = el('label', 'voce-servizio')
    var input = document.createElement('input')
    input.value = voce.id
    if (voce.kind === 'principale') {
      input.type = 'radio'
      input.name = 'principale'
      input.checked = stato.principale === voce.id
      input.addEventListener('change', function () {
        if (stato.principale === voce.id) return
        stato.principale = voce.id
        azzeraOrario()
        disegna()
        carica()
      })
    } else {
      input.type = 'checkbox'
      input.name = 'extra'
      input.checked = stato.extra.indexOf(voce.id) !== -1
      input.addEventListener('change', function () {
        if (input.checked) {
          if (stato.extra.indexOf(voce.id) === -1) stato.extra.push(voce.id)
        } else {
          stato.extra = stato.extra.filter(function (id) { return id !== voce.id })
        }
        azzeraOrario()
        disegna()
        carica()
      })
    }
    label.append(input, document.createTextNode(rigaServizio(voce)))
    box.append(label)
  }
  function bloccoServizi() {
    var box = el('fieldset', 'servizi')
    box.append(el('legend', '', t.servizio))
    catalogo.filter(function (voce) { return voce && voce.kind === 'principale' }).forEach(function (voce) { aggiungiVoce(box, voce) })
    catalogo.filter(function (voce) { return voce && voce.kind === 'extra' }).forEach(function (voce) { aggiungiVoce(box, voce) })
    box.append(el('p', 'totale', t.totale.replace('{{n}}', String(totaleScelto()))))
    box.append(el('p', 'nota', t.prezzi))
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
      if (attesaAccesa()) box.append(bottoneLista(null))
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
      var base = new Date(Date.UTC(2026, 0, 5 + i))
      dow.append(el('span', '', new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(base)))
    }
    var griglia = el('div', 'griglia')
    griglia.setAttribute('role', 'group')
    griglia.setAttribute('aria-label', titolo.textContent || t.giorno)
    var celle = celleMese(pezzi[0], pezzi[1])
    var giorniAperti = giorniConOrari()
    var oggi = oggiRoma()
    var limite = aggiungiGiorni(oggi, ORIZZONTE - 1)
    celle.forEach(function (iso, indice) {
      if (!iso) {
        griglia.append(el('span', 'vuoto'))
      } else {
        var aperti = stato.liberi[iso] || []
        var bottone = el('button', aperti.length ? 'giorno aperto' : 'giorno', iso.slice(8))
        bottone.type = 'button'
        bottone.disabled = aperti.length === 0
        bottone.setAttribute('aria-pressed', stato.giorno === iso ? 'true' : 'false')
        bottone.setAttribute('aria-label', etichettaGiorno(iso) + ', ' + (aperti.length ? t.libero : t.chiuso))
        bottone.addEventListener('click', function () {
          if (!stato.taglia) {
            var sceltaTaglia = root.querySelector('.taglie')
            if (sceltaTaglia && sceltaTaglia.scrollIntoView) sceltaTaglia.scrollIntoView({ behavior: ridotto() ? 'auto' : 'smooth', block: 'nearest' })
            return
          }
          if (stato.giorno !== iso) stato.ora = ''
          stato.giorno = iso
          disegna()
          mostra(document.getElementById('orari-giorno'))
        })
        griglia.append(bottone)
      }
      // Alla fine di ogni riga Lun–Dom del mese: se la settimana è piena, un pulsante a tutta larghezza, fuori dalle celle dei giorni.
      if (attesaAccesa() && (indice % 7 === 6 || indice === celle.length - 1)) {
        var primo = celle.slice(indice - (indice % 7), indice + 1).filter(Boolean)[0]
        var settimana = settimanaDi(primo)
        // Una settimana già finita, o oltre i giorni che il sito ha guardato, non è «piena»: non si sa niente.
        if (settimana.fine >= oggi && settimana.inizio <= limite && mostraPulsante(giorniAperti, settimana)) griglia.append(bottoneLista(settimana))
      }
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
    var wrap = el('div')
    wrap.className = 'campo'
    var label = el('label', '', etichetta)
    label.htmlFor = id
    var input = document.createElement('input')
    input.id = id
    input.type = tipo
    input.autocomplete = auto
    input.value = valore
    if (id === 'razza') input.maxLength = 80
    input.addEventListener('input', function () { stato[id] = input.value })
    wrap.append(label, input)
    return wrap
  }
  function comprimiFoto(file, fatto) {
    var url = URL.createObjectURL(file)
    var img = new Image()
    img.onload = function () {
      var lato = 960
      var qualita = 0.72
      function fine(data) {
        URL.revokeObjectURL(url)
        fatto(data)
      }
      function prova() {
        var scala = Math.min(1, lato / Math.max(img.width, img.height, 1))
        var canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scala))
        canvas.height = Math.max(1, Math.round(img.height * scala))
        var ctx = canvas.getContext('2d')
        if (!ctx) { fine(null); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        var data
        try { data = canvas.toDataURL('image/jpeg', qualita) } catch (errore) { fine(null); return }
        if (data.length <= 160000) { fine(data); return }
        if (qualita > 0.5) { qualita = 0.5; prova(); return }
        if (lato > 640) { lato = 640; qualita = 0.55; prova(); return }
        fine(null)
      }
      prova()
    }
    img.onerror = function () {
      URL.revokeObjectURL(url)
      fatto(null)
    }
    img.src = url
  }
  function fotoCampo() {
    var wrap = el('div', 'campo')
    wrap.id = 'foto'
    var label = el('label', '', t.foto)
    label.htmlFor = 'foto-file'
    var aiuto = el('p', 'aiuto', t.fotoAiuto)
    var input = document.createElement('input')
    input.id = 'foto-file'
    input.className = 'file-nascosto'
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.addEventListener('change', function () {
      var scelti = Array.prototype.slice.call(input.files || [])
      input.value = ''
      var posti = 3 - stato.foto.length
      if (scelti.length > posti) stato.fotoErrore = t.fotoTroppe
      var coda = scelti.slice(0, Math.max(0, posti))
      if (coda.length === 0) { disegna(); return }
      stato.fotoCarico = true
      disegna()
      var indice = 0
      function prossimo() {
        if (indice >= coda.length) {
          stato.fotoCarico = false
          disegna()
          return
        }
        comprimiFoto(coda[indice], function (data) {
          if (data) stato.foto.push(data)
          else stato.fotoErrore = t.fotoKo
          indice += 1
          prossimo()
        })
      }
      prossimo()
    })
    var riga = el('div', 'foto-riga')
    stato.foto.forEach(function (data, indice) {
      var box = el('div', 'foto-anteprima')
      var immagine = document.createElement('img')
      immagine.src = data
      immagine.alt = t.fotoAlt.replace('{{n}}', String(indice + 1))
      var togli = el('button', 'foto-togli')
      togli.type = 'button'
      togli.setAttribute('aria-label', t.fotoTogli.replace('{{n}}', String(indice + 1)))
      var cestino = svg([
        'M3 6h18',
        'M8 6V4h8v2',
        'M19 6l-1 14H6L5 6',
        'M10 11v6',
        'M14 11v6',
      ])
      cestino.setAttribute('width', '22')
      cestino.setAttribute('height', '22')
      togli.append(cestino)
      togli.addEventListener('click', function () {
        stato.foto.splice(indice, 1)
        stato.fotoErrore = ''
        disegna()
      })
      box.append(immagine, togli)
      riga.append(box)
    })
    wrap.append(label, aiuto, riga, input)
    if (stato.foto.length < 3 && !stato.fotoCarico) {
      var scegli = el('label', 'scegli-foto', t.fotoAggiungi)
      scegli.htmlFor = 'foto-file'
      wrap.append(scegli)
    }
    if (stato.fotoCarico) wrap.append(el('p', 'aiuto', t.fotoPreparo))
    if (stato.fotoErrore) {
      var errore = el('p', 'errore foto-avviso', stato.fotoErrore)
      errore.id = 'foto-errore'
      errore.setAttribute('role', 'alert')
      wrap.append(errore)
    }
    return wrap
  }
  function modulo() {
    if (!stato.ora) return null
    var form = el('form')
    form.id = 'dati-richiesta'
    form.noValidate = true
    form.append(el('h3', '', t.dati))
    var nomi = serviziScelti().map(function (id) {
      var voce = vocePerId(id)
      return voce ? voce.nome : ''
    }).filter(Boolean)
    var riepilogo = [t.specie[stato.specie], t.taglie[stato.taglia]].concat(nomi, [etichettaGiorno(stato.giorno), stato.ora]).filter(Boolean).join(' · ')
    form.append(el('p', 'testo', riepilogo))
    form.append(campo('nome', t.nome, 'text', stato.nome, 'name'))
    form.append(campo('telefono', t.telefono, 'tel', stato.telefono, 'tel'))
    form.append(campo('email', t.email, 'email', stato.email, 'email'))
    form.append(campo('cane', t.caneNome, 'text', stato.cane, 'off'))
    form.append(campo('razza', t.razza, 'text', stato.razza, 'off'))
    form.append(fotoCampo())
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
    check.addEventListener('change', function () { stato.consenso = check.checked })
    consenso.append(check, document.createTextNode(' ' + t.consenso + ' '))
    form.append(consenso)
    var informativa = el('button', '', t.privacy)
    informativa.type = 'button'
    informativa.id = 'informativa'
    informativa.style.cssText = 'background:none;border:0;padding:0;margin:8px 0 0;color:var(--link);font:inherit;text-decoration:underline;cursor:pointer'
    informativa.addEventListener('click', apriInformativa)
    form.append(informativa)
    var fraseFoto = (t.fotoNota && t.fotoNota[stato.specie]) || t.fotoNota.altro
    form.append(el('p', 'nota', t.nota.replace('{{foto}}', fraseFoto)))
    var invia = el('button', 'invia', t.invia)
    invia.type = 'submit'
    invia.disabled = stato.invio || stato.fotoCarico
    form.append(invia)
    form.addEventListener('submit', function (evento) {
      evento.preventDefault()
      inviaRichiesta(form, esca)
    })
    return form
  }
  function problemi(form) {
    var voci = []
    if (stato.nome.trim().length < 2) voci.push(['nome', t.nomeKo])
    if (stato.telefono.replace(/\D/g, '').length < 6) voci.push(['telefono', t.telKo])
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stato.email.trim())) voci.push(['email', t.emailKo])
    if (stato.cane.trim().length < 1) voci.push(['cane', t.caneKo])
    if (stato.razza.trim().length < 2) voci.push(['razza', t.razzaKo])
    if (!stato.consenso) voci.push(['consenso', t.consensoKo])
    form.querySelectorAll('.errore:not(.foto-avviso),.somma').forEach(function (nodo) { nodo.remove() })
    form.querySelectorAll('.non-valido').forEach(function (nodo) { nodo.classList.remove('non-valido') })
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
    if (stato.invio || stato.fotoCarico || problemi(form)) return
    stato.invio = true
    var bottone = form.querySelector('.invia')
    if (bottone) bottone.disabled = true
    var ids = serviziScelti()
    var voci = []
    ids.forEach(function (id) {
      var voce = vocePerId(id)
      if (!voce) return
      voci.push({
        id: voce.id,
        nome: voce.nome,
        kind: voce.kind,
        minuti: numeroTaglia(voce, 'minuti'),
        prezzo: numeroTaglia(voce, 'prezzo'),
      })
    })
    fetch(URL_FUNZIONI + 'inviaRichiesta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {
        salonId: dati.salonId,
        nome: stato.nome.trim(),
        phone: stato.telefono.trim(),
        email: stato.email.trim(),
        cane: stato.cane.trim(),
        razza: stato.razza.trim(),
        foto: stato.foto.slice(),
        taglia: stato.taglia,
        specie: stato.specie,
        servizi: ids,
        voci: voci,
        totaleIndicativo: totaleScelto(),
        durataMin: durataScelta(),
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
        var modello = esito.corpo.result.emailStato === 'inviata' ? t.ok : t.okSenza
        var fatto = el('p', 'esito', modello.replace('{{nome}}', dati.nome || '').replace('{{email}}', stato.email || ''))
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
  function chiudiInformativa() {
    var foglio = document.getElementById('foglio-privacy')
    if (foglio) foglio.remove()
  }
  function apriInformativa() {
    if (document.getElementById('foglio-privacy')) return
    history.pushState({ informativa: true }, '')
    var foglio = document.createElement('div')
    foglio.id = 'foglio-privacy'
    foglio.style.cssText = 'position:fixed;inset:0;z-index:30;background:#fff;display:flex;flex-direction:column;padding:12px'
    var torna = el('button', '', t.torna)
    torna.type = 'button'
    torna.id = 'torna-prenotazione'
    torna.style.cssText = 'align-self:flex-start;min-height:48px;border:0;background:none;color:var(--link);font:inherit;font-weight:700;cursor:pointer;padding:0'
    torna.addEventListener('click', function () {
      chiudiInformativa()
      if (history.state && history.state.informativa) history.back()
    })
    var frame = document.createElement('iframe')
    frame.title = t.privacy
    frame.style.cssText = 'flex:1;width:100%;border:0;margin-top:8px'
    frame.addEventListener('load', function () {
      var doc = null
      try { doc = frame.contentDocument } catch (errore) { doc = null }
      if (!doc) return
      doc.addEventListener('click', function (evento) {
        var nodo = evento.target
        if (nodo && nodo.nodeType === 3) nodo = nodo.parentNode
        var ancora = nodo && nodo.closest ? nodo.closest('a') : null
        if (!ancora || !ancora.href) return
        evento.preventDefault()
        var url
        try { url = new URL(ancora.href) } catch (errore) { return }
        if (url.origin === location.origin) return
        if (url.protocol !== 'mailto:' && url.protocol !== 'http:' && url.protocol !== 'https:') return
        window.open(ancora.href, '_blank', 'noopener,noreferrer')
      }, true)
    })
    frame.src = '/privacy/?lang=' + lang
    foglio.append(torna, frame)
    document.body.append(foglio)
  }
  window.addEventListener('popstate', function () {
    chiudiInformativa()
  })
  // --- Lista d’attesa -------------------------------------------------------------------------------------------
  // Queste regole stanno anche in src/lib/listaAttesa.ts (settimanaDi, settimanaPiena, campiMancanti), dove hanno i test.
  // Qui sono ripetute a mano perché la pagina non importa TypeScript: hosting/s/paginaAttesa.test.ts tiene d’occhio la pagina.
  function attesaAccesa() {
    return dati.attesa === true
  }
  function settimanaDi(giorno) {
    var pezzi = giorno.split('-').map(Number)
    var dow = new Date(Date.UTC(pezzi[0], pezzi[1] - 1, pezzi[2])).getUTCDay()
    var lunedi = aggiungiGiorni(giorno, dow === 0 ? -6 : 1 - dow)
    return { inizio: lunedi, fine: aggiungiGiorni(lunedi, 6) }
  }
  function mostraPulsante(giorniConOrari, settimana) {
    return !giorniConOrari.some(function (g) { return g >= settimana.inizio && g <= settimana.fine })
  }
  function campiDaChiedere(gia) {
    var fuori = []
    if (!gia.nome) fuori.push('nome')
    if (!gia.phone) fuori.push('phone')
    if (!gia.email) fuori.push('email')
    if (!gia.nomeCane) fuori.push('nomeCane')
    return fuori
  }
  function giorniConOrari() {
    var mappa = stato.liberi || {}
    return Object.keys(mappa).filter(function (giorno) { return (mappa[giorno] || []).length > 0 })
  }
  function meseIniziale() {
    var oggiMese = oggiRoma().slice(0, 7)
    if (!giornoLink) return oggiMese
    var mese = giornoLink.slice(0, 7)
    var chiavi = Object.keys(stato.liberi || {}).sort()
    if (chiavi.length === 0) return oggiMese
    return mese >= chiavi[0].slice(0, 7) && mese <= chiavi[chiavi.length - 1].slice(0, 7) ? mese : oggiMese
  }
  /** Scegliere animale, taglia e servizio azzera il giorno: la prima volta che i giorni arrivano, il calendario torna sul giorno dell’offerta. */
  function apriSulGiornoLink() {
    if (!giornoLink || giornoLinkUsato || stato.giorno || !stato.liberi) return
    if ((stato.liberi[giornoLink] || []).length === 0) return
    giornoLinkUsato = true
    stato.giorno = giornoLink
  }
  function etichettaSettimana(settimana) {
    var formato = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' })
    function data(iso) {
      var pezzi = iso.split('-').map(Number)
      return formato.format(new Date(Date.UTC(pezzi[0], pezzi[1] - 1, pezzi[2])))
    }
    return data(settimana.inizio) + ' – ' + data(settimana.fine)
  }
  function bottoneLista(settimana) {
    var bottone = el('button', 'lista-riga', t.lista)
    bottone.type = 'button'
    if (settimana) bottone.setAttribute('aria-label', t.lista + ', ' + etichettaSettimana(settimana))
    bottone.addEventListener('click', function () {
      stato.lista.aperta = true
      stato.lista.fatto = false
      disegna()
      mostra(document.getElementById('lista-attesa'))
    })
    return bottone
  }
  var CAMPI_LISTA = {
    nome: { id: 'lista-nome', chiave: 'nome', etichetta: 'nome', tipo: 'text', auto: 'name', errore: 'nomeKo' },
    phone: { id: 'lista-telefono', chiave: 'telefono', etichetta: 'telefono', tipo: 'tel', auto: 'tel', errore: 'telKo' },
    email: { id: 'lista-email', chiave: 'email', etichetta: 'email', tipo: 'email', auto: 'email', errore: 'emailKo' },
    nomeCane: { id: 'lista-cane', chiave: 'cane', etichetta: 'caneNome', tipo: 'text', auto: 'off', errore: 'caneKo' },
  }
  function valoreValido(campoLista) {
    var valore = String(stato[campoLista.chiave] || '')
    if (campoLista.chiave === 'nome') return valore.trim().length >= 2
    if (campoLista.chiave === 'telefono') return valore.replace(/\D/g, '').length >= 6
    if (campoLista.chiave === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore.trim())
    return valore.trim().length >= 1
  }
  function giaScritti() {
    var gia = {}
    Object.keys(CAMPI_LISTA).forEach(function (nome) {
      gia[nome] = valoreValido(CAMPI_LISTA[nome]) ? String(stato[CAMPI_LISTA[nome].chiave]).trim() : ''
    })
    return gia
  }
  function campoLista(nome) {
    var voce = CAMPI_LISTA[nome]
    var wrap = el('div', 'campo')
    var label = el('label', '', t[voce.etichetta])
    label.htmlFor = voce.id
    var input = document.createElement('input')
    input.id = voce.id
    input.type = voce.tipo
    input.autocomplete = voce.auto
    input.value = stato[voce.chiave]
    input.addEventListener('input', function () { stato[voce.chiave] = input.value })
    wrap.append(label, input)
    return wrap
  }
  function moduloLista() {
    if (!stato.lista.aperta) return null
    if (stato.lista.fatto) {
      var fatto = el('p', 'esito', t.iscritto)
      fatto.id = 'lista-attesa'
      fatto.setAttribute('role', 'status')
      return fatto
    }
    var form = el('form')
    form.id = 'lista-attesa'
    form.noValidate = true
    form.append(el('h3', '', t.lista))
    var chiesti = campiDaChiedere(giaScritti())
    chiesti.forEach(function (nome) { form.append(campoLista(nome)) })
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
    check.id = 'lista-consenso'
    check.checked = stato.consenso
    check.addEventListener('change', function () { stato.consenso = check.checked })
    consenso.append(check, document.createTextNode(' ' + t.consenso + ' '))
    form.append(consenso)
    var informativa = el('button', '', t.privacy)
    informativa.type = 'button'
    informativa.style.cssText = 'background:none;border:0;padding:0;margin:8px 0 0;color:var(--link);font:inherit;text-decoration:underline;cursor:pointer'
    informativa.addEventListener('click', apriInformativa)
    form.append(informativa)
    var invia = el('button', 'invia', t.lista)
    invia.type = 'submit'
    invia.disabled = stato.lista.invio
    form.append(invia)
    form.addEventListener('submit', function (evento) {
      evento.preventDefault()
      iscriviti(form, chiesti, esca)
    })
    return form
  }
  function problemiLista(form, chiesti) {
    var voci = []
    chiesti.forEach(function (nome) {
      if (!valoreValido(CAMPI_LISTA[nome])) voci.push([CAMPI_LISTA[nome].id, t[CAMPI_LISTA[nome].errore]])
    })
    if (!stato.consenso) voci.push(['lista-consenso', t.consensoKo])
    form.querySelectorAll('.errore').forEach(function (nodo) { nodo.remove() })
    voci.forEach(function (voce) {
      var errore = el('p', 'errore', voce[1])
      errore.setAttribute('role', 'alert')
      var campoNodo = document.getElementById(voce[0])
      var wrap = campoNodo ? campoNodo.closest('.campo') || campoNodo.parentElement : form
      wrap.append(errore)
    })
    return voci.length > 0
  }
  function iscriviti(form, chiesti, esca) {
    if (stato.lista.invio || problemiLista(form, chiesti)) return
    stato.lista.invio = true
    var bottone = form.querySelector('.invia')
    if (bottone) bottone.disabled = true
    function guasto(messaggio) {
      stato.lista.invio = false
      var avviso = el('p', 'errore', messaggio)
      avviso.setAttribute('role', 'alert')
      form.append(avviso)
      if (bottone) bottone.disabled = false
    }
    fetch(URL_FUNZIONI + 'iscrivitiAttesa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {
        salonId: dati.salonId,
        nome: stato.nome.trim(),
        phone: stato.telefono.trim(),
        email: stato.email.trim(),
        nomeCane: stato.cane.trim(),
        specie: stato.specie,
        taglia: stato.taglia,
        servizioIds: serviziScelti(),
        esca: esca.value,
        consenso: true,
      } }),
    }).then(function (risposta) { return risposta.json() }).then(function (corpo) {
      var esito = corpo && corpo.result ? corpo.result : {}
      if (esito.ok === true) {
        stato.lista.invio = false
        stato.lista.fatto = true
        disegna()
        mostra(document.getElementById('lista-attesa'))
        return
      }
      guasto(esito.errore === 'spento' ? t.listaSpenta : esito.errore === 'consenso' ? t.consensoKo : esito.errore === 'tante' ? t.tante : t.ko)
    }).catch(function () { guasto(t.ko) })
  }

  // Il link della mail porta qui con ?attesa=<token>: la pagina chiede com’è il posto e fa scegliere.
  function bloccoLink() {
    var blocco = document.getElementById('attesa-link')
    if (blocco) return blocco
    blocco = el('section', 'scheda')
    blocco.id = 'attesa-link'
    root.parentNode.insertBefore(blocco, root)
    return blocco
  }
  function messaggioLink(testo, avviso) {
    var blocco = bloccoLink()
    blocco.replaceChildren(el('h2', '', t.lista))
    var riga = el('p', avviso ? 'errore' : 'esito', testo)
    riga.setAttribute('role', avviso ? 'alert' : 'status')
    blocco.append(riga)
  }
  function chiamaAttesa(azione) {
    return fetch(URL_FUNZIONI + 'confermaAttesa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { salonId: dati.salonId, token: tokenAttesa, azione: azione } }),
    }).then(function (risposta) { return risposta.json() }).then(function (corpo) {
      return corpo && corpo.result ? corpo.result : null
    }).catch(function () { return null })
  }
  function schermataLink(giorno, ora, motivo) {
    var blocco = bloccoLink()
    blocco.replaceChildren(el('h2', '', t.lista))
    if (parametriPosto(giorno, ora)) blocco.append(el('p', 'testo', etichettaGiorno(giorno) + ' · ' + ora))
    // Come schermataAttesa in src/lib/listaAttesa.ts: solo «libero» offre la conferma.
    var conferma = motivo === 'libero'
    var azioni = conferma
      ? [[t.conferma, 'conferma'], [t.rifiuta, 'rifiuta']]
      : [[t.resto, 'resta'], [t.esco, 'esci']]
    if (conferma) {
      blocco.append(el('p', 'testo', t.liberoDomanda))
    } else {
      blocco.append(el('p', 'testo', t.occupato), el('p', 'testo', t.restaDomanda))
    }
    var riga = el('div', 'azioni-attesa')
    var bottoni = azioni.map(function (voce, indice) {
      var bottone = el('button', indice === 0 ? 'invia' : 'invia secondario', voce[0])
      bottone.type = 'button'
      bottone.setAttribute('data-azione', voce[1])
      bottone.addEventListener('click', function () {
        bottoni.forEach(function (altro) { altro.disabled = true })
        blocco.querySelectorAll('.errore').forEach(function (nodo) { nodo.remove() })
        chiamaAttesa(voce[1]).then(function (risultato) {
          if (!esitoLink(risultato, giorno, ora)) {
            bottoni.forEach(function (altro) { altro.disabled = false })
            var avviso = el('p', 'errore', t.ko)
            avviso.setAttribute('role', 'alert')
            blocco.append(avviso)
          }
        })
      })
      return bottone
    })
    bottoni.forEach(function (bottone) { riga.append(bottone) })
    blocco.append(riga)
  }
  /** Mostra l’esito di una scelta. Falso solo se la risposta non si è capita: allora si può riprovare. */
  function esitoLink(risultato, giorno, ora) {
    if (!risultato) return false
    if (risultato.ok !== true) {
      messaggioLink(risultato.errore === 'spento' ? t.listaSpenta : t.linkKo, true)
      return true
    }
    // «rifiuta» e «resta» sul posto già preso rispondono «visto»: l’iscritto resta in lista comunque.
    if (risultato.esito === 'confermato') messaggioLink(t.inAgenda, false)
    else if (risultato.esito === 'occupato') schermataLink(giorno, ora, 'occupato')
    else if (risultato.esito === 'uscito') messaggioLink(t.uscito, false)
    else if (risultato.esito === 'rifiutato' || risultato.esito === 'restato' || risultato.esito === 'visto') messaggioLink(t.inLista, false)
    else return false
    return true
  }
  function avviaLink() {
    var token = queryPosto.get('attesa')
    if (!token || !dati.salonId) return
    if (dati.attesa !== true) { messaggioLink(t.listaSpenta, true); return }
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) { messaggioLink(t.linkKo, true); return }
    tokenAttesa = token
    chiamaAttesa('leggi').then(function (risultato) {
      if (!risultato) { messaggioLink(t.ko, true); return }
      if (risultato.ok !== true || risultato.esito !== 'visto') {
        if (!esitoLink(risultato, '', '')) messaggioLink(t.ko, true)
        return
      }
      var luogo = parametriPosto(risultato.giorno, risultato.ora)
      if (luogo) {
        giornoLink = luogo.giorno
        stato.giorno = luogo.giorno
        stato.mese = luogo.giorno.slice(0, 7)
      }
      schermataLink(luogo ? luogo.giorno : '', luogo ? luogo.ora : '', risultato.motivo)
      if (stato.liberi !== null) {
        stato.mese = meseIniziale()
        apriSulGiornoLink()
        disegna()
      }
    })
  }

  function disegna() {
    root.replaceChildren()
    root.append(el('h2', '', t.titolo))
    root.append(passi())
    root.append(animale())
    if (!stato.specie || !stato.taglia) return
    root.append(bloccoServizi())
    if (durataScelta() <= 0) return
    root.append(calendario())
    var fascia = orari()
    if (fascia) root.append(fascia)
    var form = modulo()
    if (form) root.append(form)
    var lista = attesaAccesa() ? moduloLista() : null
    if (lista) root.append(lista)
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
  function confermaPosto() {
    if (!posto || !stato.liberi) return
    var lista = stato.liberi[posto.giorno] || []
    if (lista.indexOf(posto.ora) === -1) {
      if (stato.giorno === posto.giorno && stato.ora === posto.ora) stato.ora = ''
      return
    }
    stato.giorno = posto.giorno
    stato.ora = posto.ora
    stato.mese = posto.giorno.slice(0, 7)
  }
  var giroLiberi = 0
  function carica() {
    var durata = durataScelta()
    var giro = giroLiberi + 1
    giroLiberi = giro
    if (durata <= 0) return
    var finto = demo()
    if (finto) {
      if (giro !== giroLiberi) return
      stato.liberi = finto
      stato.mese = meseIniziale()
      confermaPosto()
      apriSulGiornoLink()
      disegna()
      return
    }
    fetch(URL_FUNZIONI + 'postiLiberi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { salonId: dati.salonId, giorno: oggiRoma(), giorni: ORIZZONTE, durataMin: durata } }),
    }).then(function (risposta) { return risposta.json() }).then(function (corpo) {
      if (giro !== giroLiberi) return
      var result = corpo && corpo.result ? corpo.result : {}
      if (result.giorni && typeof result.giorni === 'object') stato.liberi = result.giorni
      else if (Array.isArray(result.orari)) {
        stato.liberi = {}
        if (result.orari.length) stato.liberi[oggiRoma()] = result.orari
      } else {
        stato.errore = true
        stato.liberi = {}
      }
      stato.mese = meseIniziale()
      confermaPosto()
      apriSulGiornoLink()
      disegna()
    }).catch(function () {
      if (giro !== giroLiberi) return
      stato.errore = true
      stato.liberi = {}
      disegna()
    })
  }
  disegna()
  carica()
})()
