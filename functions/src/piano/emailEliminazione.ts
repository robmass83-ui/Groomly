export function emailEliminazione(nome: string): { oggetto: string; html: string } {
  const salone = nome.trim() || 'Groomly'
  const sicuro = salone.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const oggetto = 'Account Groomly eliminato'
  const html = `<!doctype html><html lang="it"><body style="background:#f4f7fb;font-family:sans-serif;color:#123">
<img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="180">
<h1 style="font-size:28px;color:#123">${oggetto}</h1>
<p>L’account di ${sicuro} è stato eliminato, insieme ai dati del salone gestiti da Groomly.</p>
<p>I file che avevi salvato sul telefono o sul tuo Google Drive restano tuoi.</p>
<p>Se non sei stato tu, scrivi a <a href="mailto:info@groomlyapp.it">info@groomlyapp.it</a>.</p>
</body></html>`
  return { oggetto, html }
}
