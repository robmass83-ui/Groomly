import { campiMancanti, settimanaPiena } from './listaAttesa'

// La pagina pubblica (`hosting/s/pagina.js`) è JavaScript semplice e non importa TypeScript:
// ripete a mano questi due controlli. Qui vivono le regole che i test tengono ferme.

/** Il pulsante «Lista d’attesa» sta su una riga Lun–Dom solo se nessun giorno di quella settimana ha orari. */
export function mostraPulsante(giorniConOrari: readonly string[], settimana: { inizio: string, fine: string }): boolean {
  return settimanaPiena(giorniConOrari, settimana)
}

/** Dal modulo della lista si chiede solo ciò che ancora manca. Razza e foto non ci sono mai. */
export function campiDaChiedere(gia: { nome?: string, phone?: string, email?: string, nomeCane?: string }): Array<'nome' | 'phone' | 'email' | 'nomeCane'> {
  return campiMancanti(gia)
}
