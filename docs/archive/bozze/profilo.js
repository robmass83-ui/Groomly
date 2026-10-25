const I = '../../src/assets/icons/svg/'
    const LOGO = '../../src/assets/brand/groomly-logo-testata.svg'
    const phone = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
    const cal = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
    const wa = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.25-1.93 1.33-.5.07-1.12.1-1.81-.11-.41-.13-.95-.31-1.63-.61-2.87-1.24-4.74-4.13-4.88-4.32-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.1 1-2.39.26-.29.57-.36.76-.36h.55c.17 0 .4-.07.63.48.24.57.81 1.97.88 2.11.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.41.5-.14.14-.28.29-.12.56.16.27.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.25 1.39.28.14.44.12.6-.07.17-.19.7-.81.89-1.09.19-.28.38-.23.63-.14.26.09 1.64.77 1.92.91.28.14.47.21.54.33.07.12.07.68-.17 1.36z"/></svg>'
    const pencil = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'
    const more = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>'
    const BREED = 'Maltese / Shih Tzu / Barboncino / Maltipoo'
    const NOTE = 'Preferisce essere asciugata a mano. Tosaura cucciolo sul corpo, coda a pompon. Non usare profumo.'
    const FACTS = [['Specie', 'Cane'], ['Razza', BREED], ['Sesso', 'Femmina'], ['Peso', '8,5 kg'], ['Taglia', 'Piccola'], ['Cliente', 'Mensile · ogni 4'], ['Durata media', '1h15']]
    const PRICES = [
      ['Bagno', '€ 28', '45 min', I + 'service-bagno.svg'],
      ['Taglio / tosatura', '€ 35', '60 min', I + 'service-taglio.svg'],
      ['Bagno + taglio', '€ 55', '90 min', I + 'service-bagno-taglio.svg'],
    ]
    const PEOPLE = [
      ['Giulia Rossi', '333 1204567', 'Proprietaria', 'Principale'],
      ['Marco Rossi', '347 8801122', 'Famiglia', ''],
    ]
    const FIELDS = [['Microchip', '380260001234567'], ['Allergie', 'pollo, manzo']]

    function masthead() {
      return `<header class="top"><img class="logo" alt="Groomly" src="${LOGO}"><h1>Scheda</h1><button type="button" class="ghost" aria-label="Modifica">${pencil}</button><button type="button" class="ghost" aria-label="Menu">${more}</button></header>`
    }
    function flags() {
      return `<span class="flag warn"><img alt="" src="${I}temperament-agitato.svg">Agitato</span><span class="flag sen"><img alt="" src="${I}temperament-anziano.svg">Anziano</span><span class="flag tea"><img alt="" src="${I}cliente-mensile.svg">Mensile</span>`
    }
    function shots(n) {
      return [1, 2, 3, 4].map((i) => `<img alt="Foto ${i}" src="${I}avatar-placeholder.svg">`).join('') + `<button type="button" class="more" aria-label="Altre foto">+1</button>`
    }

    function rivista() {
      return `<div class="scheda t1">${masthead()}
        <section class="id">
          <div>
            <p class="kicker">Cane</p>
            <h2 class="name">Luna</h2>
            <p class="breed wrap">${BREED}</p>
            <p class="quiet">10 anni · Giulia Rossi</p>
            <p class="quiet">333 1204567</p>
          </div>
          <img class="ava" alt="" src="${I}avatar-placeholder.svg">
        </section>
        <div class="tools">
          <button type="button" aria-label="Chiama">${phone} Chiama</button>
          <button type="button" aria-label="WhatsApp">${wa} WhatsApp</button>
        </div>
        <div class="flags">${flags()}</div>
        <button type="button" class="book">${cal} Fissa appuntamento</button>
        <div class="facts" role="group" aria-label="Dati">${FACTS.map(([k, v]) => `<div><span>${k}</span><b class="wrap">${v}</b></div>`).join('')}</div>
        <div class="alert"><b>Morde</b><p class="wrap">Museruola obbligatoria se resta sul tavolo. Non avvicinare il phon al muso.</p></div>
        <h3>Note</h3><p class="prose wrap">${NOTE}</p>
        <h3>Prezzi personalizzati</h3>
        ${PRICES.map(([name, price, dur]) => `<div class="price"><span class="wrap">${name}<small>${dur}</small></span><b>${price}</b></div>`).join('')}
        <button type="button" class="next"><strong>Prossimo: oggi 15:30</strong><br>Bagno, Taglio / tosatura<br><span class="quiet">1h 45</span></button>
        <p class="tags">Pelo riccio · Sensibile · Ipoallergenico</p>
        <div class="facts">${FIELDS.map(([k, v]) => `<div><span>${k}</span><b class="wrap">${v}</b></div>`).join('')}</div>
        <h3>Contatti</h3>
        ${PEOPLE.map(([name, tel, role, primary]) => `<div class="who"><div><b>${name}</b><div class="quiet">${tel} · ${role}${primary ? ' · ' + primary : ''}</div></div><button type="button" class="ico dial round" aria-label="Chiama ${name}">${phone}</button></div>`).join('')}
        <h3>Galleria</h3><div class="shots">${shots()}</div>
        <h3>Storico · 3</h3>
        <div class="visit"><span class="rail"></span><div><div class="when">12 ott 2026</div><b>Bagno, Taglio / tosatura</b><div class="quiet wrap">€ 55 · tosatrice, forbici · 1h10 · shampoo delicato · Stile cucciolo</div><div class="quiet">Aggiunto nodi sul collo · ▲ € 5</div></div></div>
        <div class="visit"><span class="rail"></span><div><div class="when">1 set 2026</div><b>Bagno</b><div class="quiet">€ 28 · 50m</div></div></div>
        <div class="visit"><span class="rail"></span><div><div class="when">1 ago 2026</div><b class="gone">Bagno</b><div style="color:var(--bad)">Non venuto</div></div></div>
      </div>`
    }

    function nido() {
      const facts = [['Specie', 'Cane'], ['Sesso', 'Femmina'], ['Peso', '8,5 kg'], ['Taglia', 'Piccola'], ['Razza', BREED, 'wide'], ['Cliente', 'Mensile · ogni 4', 'half'], ['Durata media', '1h15', 'half']]
      return `<div class="scheda t2">${masthead()}
        <section class="nest">
          <div class="hero"><img class="ava" alt="" src="${I}avatar-placeholder.svg"><div><h2 class="name">Luna</h2><p class="breed wrap">${BREED}</p><p class="quiet">10 anni</p><p class="quiet">Giulia Rossi</p><p class="quiet">333 1204567</p></div></div>
          <div class="flags">${flags()}</div>
          <div class="actions"><button type="button" class="dial" aria-label="Chiama">${phone} Chiama</button><button type="button" class="wa" aria-label="WhatsApp">${wa} WhatsApp</button></div>
          <button type="button" class="book">${cal} Fissa appuntamento</button>
          <div class="facts" role="group" aria-label="Dati">${facts.map(([k, v, w]) => `<div class="fact ${w || ''}"><span>${k}</span><b class="wrap">${v}</b></div>`).join('')}</div>
        </section>
        <div class="alert"><b>Morde</b><p class="wrap">Museruola obbligatoria se resta sul tavolo. Non avvicinare il phon al muso.</p></div>
        <section class="card"><h3>Note</h3><p class="prose wrap">${NOTE}</p></section>
        <section class="card"><h3>Prezzi personalizzati</h3>${PRICES.map(([name, price, dur, icon]) => `<div class="price"><span class="bubble"><img alt="" src="${icon}"></span><span class="grow wrap"><b>${name}</b><div class="quiet">${dur}</div></span><b>${price}</b></div>`).join('')}</section>
        <button type="button" class="next"><strong>Prossimo: oggi 15:30</strong><div>Bagno, Taglio / tosatura</div><div>1h 45</div></button>
        <div class="tags"><span class="tag">Pelo riccio</span><span class="tag">Sensibile</span><span class="tag">Ipoallergenico</span></div>
        <section class="card">${FIELDS.map(([k, v]) => `<div class="field"><span>${k}</span><b class="wrap">${v}</b></div>`).join('')}</section>
        <section class="card"><h3>Contatti</h3>${PEOPLE.map(([name, tel, role, primary]) => `<div class="who"><span class="initial">${name[0]}</span><span class="grow"><b>${name}</b><div class="quiet">${tel} · ${role}${primary ? ' · ' + primary : ''}</div></span><button type="button" class="ico dial round" aria-label="Chiama ${name}">${phone}</button></div>`).join('')}</section>
        <section class="card"><h3>Galleria</h3><div class="shots">${shots()}</div></section>
        <section class="card history">
          <button type="button" class="burst" aria-expanded="false" aria-label="Storico">
            <span class="burst-body">
              <h3>Storico · 3</h3>
              <div class="visit latest"><div class="when">12 ott 2026</div><b>Bagno, Taglio / tosatura</b><div class="quiet wrap">€ 55 · tosatrice, forbici · 1h10 · shampoo delicato · Stile cucciolo</div><div class="quiet">Aggiunto nodi sul collo · ▲ € 5</div></div>
              <span class="more-visits">Altre 2 visite</span>
            </span>
            <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>
          <div class="burst-rest">
            <div class="visit"><div class="when">12 ott 2026</div><b>Bagno, Taglio / tosatura</b><div class="quiet wrap">€ 55 · tosatrice, forbici · 1h10 · shampoo delicato · Stile cucciolo</div><div class="quiet">Aggiunto nodi sul collo · ▲ € 5</div></div>
            <div class="visit"><div class="when">1 set 2026</div><b>Bagno</b><div class="quiet">€ 28 · 50m</div></div>
            <div class="visit"><div class="when">1 ago 2026</div><b class="gone">Bagno</b><div style="color:var(--bad)">Non venuto</div></div>
          </div>
        </section>
      </div>`
    }

    function quaderno() {
      return `<div class="scheda t3">${masthead()}
        <article class="sheet">
          <img class="stamp" alt="" src="${I}avatar-placeholder.svg">
          <div class="kicker" style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--pri-ink)">Scheda</div>
          <h2 class="name">Luna</h2>
          <p class="breed wrap">${BREED}</p>
          <p class="quiet">10 anni · Giulia Rossi · 333 1204567</p>
          <div class="flags">${flags()}</div>
          <div class="tools">
            <button type="button" class="ico dial" aria-label="Chiama">${phone}</button>
            <button type="button" class="ico wa" aria-label="WhatsApp">${wa}</button>
          </div>
          <button type="button" class="book">${cal} Fissa appuntamento</button>
          <div role="group" aria-label="Dati" style="margin-top:10px">${FACTS.map(([k, v]) => `<div class="row"><span>${k}</span><b class="wrap">${v}</b></div>`).join('')}</div>
          <div class="alert"><b>Morde</b><p class="wrap">Museruola obbligatoria se resta sul tavolo. Non avvicinare il phon al muso.</p></div>
          <h3>Note</h3><p class="prose wrap">${NOTE}</p>
          <h3>Prezzi personalizzati</h3>
          ${PRICES.map(([name, price, dur]) => `<div class="price"><span class="wrap">${name}<div class="quiet">${dur}</div></span><b>${price}</b></div>`).join('')}
          <button type="button" class="next"><b>Prossimo: oggi 15:30</b><div>Bagno, Taglio / tosatura</div><div class="quiet">1h 45</div></button>
          <p class="tags">Pelo riccio · Sensibile · Ipoallergenico</p>
          ${FIELDS.map(([k, v]) => `<div class="row"><span>${k}</span><b class="wrap">${v}</b></div>`).join('')}
          <h3>Contatti</h3>
          ${PEOPLE.map(([name, tel, role, primary]) => `<div class="who"><div class="grow"><b>${name}</b><div class="quiet">${tel} · ${role}${primary ? ' · ' + primary : ''}</div></div><button type="button" class="ico dial round" aria-label="Chiama ${name}">${phone}</button></div>`).join('')}
          <h3>Galleria</h3><div class="shots">${shots()}</div>
          <h3>Storico · 3</h3>
          <div class="visit"><div class="when">12 ott 2026</div><b>Bagno, Taglio / tosatura</b><div class="quiet wrap">€ 55 · tosatrice, forbici · 1h10 · shampoo delicato · Stile cucciolo</div><div class="quiet">Aggiunto nodi sul collo · ▲ € 5</div></div>
          <div class="visit"><div class="when">1 set 2026</div><b>Bagno</b><div class="quiet">€ 28 · 50m</div></div>
          <div class="visit"><div class="when">1 ago 2026</div><b class="gone">Bagno</b><div style="color:var(--bad)">Non venuto</div></div>
        </article>
      </div>`
    }

    function bacheca() {
      return `<div class="scheda t4">${masthead()}
        <section class="board">
          <div class="id">
            <img class="ava" alt="" src="${I}avatar-placeholder.svg">
            <div>
              <h2 class="name">Luna</h2>
              <p class="breed wrap">${BREED}</p>
              <p class="quiet">10 anni</p>
              <p class="quiet">Giulia Rossi</p>
              <p class="quiet">333 1204567</p>
              <div class="flags">${flags()}</div>
              <div class="actions">
                <button type="button" class="ico dial round" aria-label="Chiama">${phone}</button>
                <button type="button" class="ico wa round" aria-label="WhatsApp">${wa}</button>
              </div>
            </div>
          </div>
          <button type="button" class="book">${cal} Fissa appuntamento</button>
          <div class="facts" role="group" aria-label="Dati">
            <div class="fact"><span>Specie</span><b>Cane</b></div>
            <div class="fact"><span>Sesso</span><b>Femmina</b></div>
            <div class="fact"><span>Peso</span><b>8,5 kg</b></div>
            <div class="fact"><span>Taglia</span><b>Piccola</b></div>
            <div class="fact wide"><span>Razza</span><b class="wrap">${BREED}</b></div>
            <div class="fact half"><span>Cliente</span><b>Mensile · ogni 4</b></div>
            <div class="fact half"><span>Durata media</span><b>1h15</b></div>
          </div>
        </section>
        <section class="slab s-bad"><b>Morde</b><p class="wrap">Museruola obbligatoria se resta sul tavolo. Non avvicinare il phon al muso.</p></section>
        <section class="slab s-note"><h3>Note</h3><p class="prose wrap">${NOTE}</p></section>
        <section class="slab s-money"><h3>Prezzi personalizzati</h3>${PRICES.map(([name, price, dur]) => `<div class="price"><span class="wrap">${name}<div style="font-size:12px;opacity:.8">${dur}</div></span><b>${price}</b></div>`).join('')}</section>
        <button type="button" class="slab s-next"><h3 style="color:#d5def0">Prossimo</h3><b>oggi 15:30</b><div>Bagno, Taglio / tosatura</div><div>1h 45</div></button>
        <div class="tags"><span class="tag">Pelo riccio</span><span class="tag">Sensibile</span><span class="tag">Ipoallergenico</span></div>
        <section class="slab s-field">${FIELDS.map(([k, v]) => `<div class="field"><span>${k}</span><b class="wrap">${v}</b></div>`).join('')}</section>
        <section class="slab s-people"><h3>Contatti</h3>${PEOPLE.map(([name, tel, role, primary]) => `<div class="who"><div><b>${name}</b><div style="font-size:13px;color:var(--tx3)">${tel} · ${role}${primary ? ' · ' + primary : ''}</div></div><button type="button" class="ico dial round" aria-label="Chiama ${name}">${phone}</button></div>`).join('')}</section>
        <section class="slab s-photo"><h3>Galleria</h3><div class="shots">${shots()}</div></section>
        <section class="slab s-time"><h3>Storico · 3</h3>
          <div class="visit"><div class="when">12 ott 2026</div><b>Bagno, Taglio / tosatura</b><div class="wrap" style="font-size:13px;color:var(--tx2)">€ 55 · tosatrice, forbici · 1h10 · shampoo delicato · Stile cucciolo</div><div style="font-size:13px;color:var(--tx3)">Aggiunto nodi sul collo · ▲ € 5</div></div>
          <div class="visit"><div class="when">1 set 2026</div><b>Bagno</b><div style="font-size:13px;color:var(--tx2)">€ 28 · 50m</div></div>
          <div class="visit"><div class="when">1 ago 2026</div><b class="gone">Bagno</b><div style="color:var(--bad)">Non venuto</div></div>
        </section>
      </div>`
    }

    function cruscotto() {
      return `<div class="scheda t5">${masthead()}
        <section class="hero">
          <div class="row">
            <img class="ava" alt="" src="${I}avatar-placeholder.svg">
            <div style="min-width:0;flex:1">
              <h2 class="name">Luna</h2>
              <p class="breed wrap">${BREED}</p>
              <p class="quiet">10 anni · Giulia Rossi</p>
              <p class="quiet">333 1204567</p>
            </div>
          </div>
          <div class="actions">
            <button type="button" class="ico round" aria-label="Chiama">${phone}</button>
            <button type="button" class="ico round" aria-label="WhatsApp">${wa}</button>
          </div>
          <div class="flags">${flags()}</div>
          <button type="button" class="book">${cal} Fissa appuntamento</button>
        </section>
        <section class="panel">
          <div class="facts" role="group" aria-label="Dati">
            ${[['Specie', 'Cane'], ['Sesso', 'Femmina'], ['Peso', '8,5 kg'], ['Taglia', 'Piccola'], ['Razza', BREED, 'wide'], ['Cliente', 'Mensile · ogni 4', 'half'], ['Durata media', '1h15', 'half']].map(([k, v, w]) => `<div class="fact ${w || ''}"><span>${k}</span><b class="wrap">${v}</b></div>`).join('')}
          </div>
          <div class="alert"><b>Morde</b><p class="wrap">Museruola obbligatoria se resta sul tavolo. Non avvicinare il phon al muso.</p></div>
        </section>
        <h3>Note</h3>
        <div class="line"><p class="prose wrap">${NOTE}</p></div>
        <h3>Prezzi personalizzati</h3>
        ${PRICES.map(([name, price, dur]) => `<div class="line"><span class="wrap">${name}<div style="font-size:12px;color:var(--tx3)">${dur}</div></span><b>${price}</b></div>`).join('')}
        <button type="button" class="next"><b style="color:var(--pri)">Prossimo: oggi 15:30</b><div>Bagno, Taglio / tosatura</div><div style="color:var(--tx3)">1h 45</div></button>
        <div class="tags"><span class="tag">Pelo riccio</span><span class="tag">Sensibile</span><span class="tag">Ipoallergenico</span></div>
        ${FIELDS.map(([k, v]) => `<div class="line"><span style="color:var(--tx3)">${k}</span><b class="wrap">${v}</b></div>`).join('')}
        <h3>Contatti</h3>
        ${PEOPLE.map(([name, tel, role, primary]) => `<div class="line"><span><b>${name}</b><div style="font-size:13px;color:var(--tx3)">${tel} · ${role}${primary ? ' · ' + primary : ''}</div></span><button type="button" class="ico dial round" aria-label="Chiama ${name}">${phone}</button></div>`).join('')}
        <h3>Galleria</h3><div class="shots">${shots()}</div>
        <h3>Storico · 3</h3>
        <div class="line" style="display:block"><div class="when">12 ott 2026</div><b>Bagno, Taglio / tosatura</b><div class="wrap" style="font-size:13px;color:var(--tx2)">€ 55 · tosatrice, forbici · 1h10 · shampoo delicato · Stile cucciolo</div><div style="font-size:13px;color:var(--tx3)">Aggiunto nodi sul collo · ▲ € 5</div></div>
        <div class="line" style="display:block"><div class="when">1 set 2026</div><b>Bagno</b><div style="font-size:13px;color:var(--tx2)">€ 28 · 50m</div></div>
        <div class="line" style="display:block"><div class="when">1 ago 2026</div><b class="gone">Bagno</b><div style="color:var(--bad)">Non venuto</div></div>
      </div>`
    }

    const options = {
      1: ['1 · Rivista. Poca carta, tanto carattere: nome enorme, elenchi a righe, storico come una linea del tempo.', rivista],
      2: ['2 · Nido. Tutto morbido e rotondo. La scheda è un nido bianco, le sezioni sono carte separate.', nido],
      3: ['3 · Quaderno. Carta calda, margine rosso, righe tratteggiate. Sembra il quaderno del salone.', quaderno],
      4: ['4 · Bacheca. Ogni blocco ha un colore suo: identità, allerta, prezzi, prossimo, persone.', bacheca],
      5: ['5 · Cruscotto. Testa blu con le azioni, sotto il pannello di lavoro. Fatto per usarlo in fretta.', cruscotto],
    }

    function show(id) {
      const [text, render] = options[id]
      document.getElementById('blurb').textContent = text + ' Stesse informazioni, stesso ordine. Telefono 390 × 844.'
      document.getElementById('screen').innerHTML = render()
      document.getElementById('screen').scrollTop = 0
      document.querySelectorAll('.switcher button').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.id === id ? 'true' : 'false')
      })
      history.replaceState(null, '', '#' + id)
    }
    document.getElementById('screen').addEventListener('click', (event) => {
      const burst = event.target.closest('.burst')
      if (!burst) return
      const card = burst.closest('.history')
      const open = card.classList.toggle('open')
      burst.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
    document.querySelector('.switcher').addEventListener('click', (event) => {
      const button = event.target.closest('button')
      if (button) show(button.dataset.id)
    })
    const initial = (location.hash || '#1').slice(1)
    show(initial in options ? initial : '1')
