const nodo = document.getElementById('profilo')
const dati = nodo ? JSON.parse(nodo.textContent || '{}') : {}
const main = document.querySelector('main')
if (!main || dati.prenotabile !== true) {
  const nota = document.createElement('p')
  nota.textContent = 'Gestito con Groomly'
  main?.querySelector('.card')?.append(nota)
} else {
  const passi = ['Servizio', 'Cane', 'Quando', 'I tuoi dati']
  const box = document.createElement('article')
  box.className = 'card'
  const stato = { passo: 0, servizi: ['appuntamento'], taglia: 'media', giorno: '', ora: '' }
  function disegna() {
    box.replaceChildren()
    const riga = document.createElement('div')
    riga.className = 'passi'
    passi.forEach((nome, indice) => {
      const chip = document.createElement('span')
      chip.textContent = nome
      if (indice === stato.passo) chip.className = 'ora'
      riga.append(chip)
    })
    box.append(riga)
    if (stato.passo === 0) {
      const bottone = document.createElement('button')
      bottone.type = 'button'
      bottone.className = 'chip'
      bottone.textContent = 'Appuntamento'
      bottone.setAttribute('aria-pressed', 'true')
      bottone.addEventListener('click', () => { stato.passo = 1; disegna() })
      box.append(bottone)
    } else if (stato.passo === 1) {
      const nome = document.createElement('input')
      nome.placeholder = 'Nome del cane'
      nome.setAttribute('aria-label', 'Nome del cane')
      box.append(nome)
      ;['piccola', 'media', 'grande'].forEach((taglia) => {
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.className = 'chip'
        chip.textContent = taglia
        chip.addEventListener('click', () => { stato.taglia = taglia; stato.cane = nome.value; stato.passo = 2; disegna() })
        box.append(chip)
      })
    } else if (stato.passo === 2) {
      const chiedi = document.createElement('button')
      chiedi.type = 'button'
      chiedi.textContent = 'Vedi orari di domani'
      chiedi.addEventListener('click', () => {
        const domani = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
        fetch('https://europe-west1-groomly-3128b.cloudfunctions.net/postiLiberi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { salonId: dati.salonId, giorno: domani, durataMin: 60 } }),
        }).then((risposta) => risposta.json()).then((corpo) => {
          const orari = corpo.result?.orari ?? []
          orari.forEach((ora) => {
            const chip = document.createElement('button')
            chip.type = 'button'
            chip.className = 'chip'
            chip.textContent = ora
            chip.addEventListener('click', () => { stato.giorno = domani; stato.ora = ora; stato.passo = 3; disegna() })
            box.append(chip)
          })
          if (orari.length === 0) {
            const vuoto = document.createElement('p')
            vuoto.textContent = 'Nessun orario in questo giorno.'
            box.append(vuoto)
          }
        }).catch(() => undefined)
      })
      box.append(chiedi)
    } else {
      const form = document.createElement('form')
      ;['Nome', 'Cellulare', 'Email'].forEach((etichetta) => {
        const campo = document.createElement('input')
        campo.required = true
        campo.setAttribute('aria-label', etichetta)
        campo.placeholder = etichetta
        form.append(campo)
      })
      const esca = document.createElement('input')
      esca.name = 'esca'
      esca.tabIndex = -1
      esca.autocomplete = 'off'
      esca.style.position = 'absolute'
      esca.style.left = '-9999px'
      form.append(esca)
      const invia = document.createElement('button')
      invia.type = 'submit'
      invia.textContent = 'Invia'
      form.append(invia)
      form.addEventListener('submit', (evento) => {
        evento.preventDefault()
        const campi = form.querySelectorAll('input')
        const inizio = `${stato.giorno}T${stato.ora.length === 5 ? stato.ora : '09:00'}:00`
        fetch('https://europe-west1-groomly-3128b.cloudfunctions.net/inviaRichiesta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: {
            salonId: dati.salonId,
            nome: campi[0].value,
            phone: campi[1].value,
            email: campi[2].value,
            cane: stato.cane || 'Cane',
            taglia: stato.taglia,
            servizi: ['appuntamento'],
            inizio,
            fine: inizio,
            esca: esca.value,
          } }),
        }).then((risposta) => risposta.json()).then((corpo) => {
          box.replaceChildren()
          const fatto = document.createElement('p')
          fatto.textContent = corpo.result?.ok
            ? `Richiesta inviata a ${dati.nome}. Ti arriverà un’email.`
            : (corpo.error?.message || 'Invio non riuscito')
          box.append(fatto)
        }).catch(() => undefined)
      })
      box.append(form)
    }
  }
  disegna()
  main.append(box)
}
