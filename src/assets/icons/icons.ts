// Groomly – manifest icone illustrate (sticker).
// Copia la cartella `svg/` in `src/assets/icons/` e importa da qui.
// Le icone di interfaccia (home, calendario, cerca, ecc.) NON sono qui: usare `lucide-react`.

import bravo from './svg/temperament-bravo.svg';
import agitato from './svg/temperament-agitato.svg';
import mordace from './svg/temperament-mordace.svg';
import anziano from './svg/temperament-anziano.svg';
import mensile from './svg/cliente-mensile.svg';
import bagno from './svg/service-bagno.svg';
import taglio from './svg/service-taglio.svg';
import bagnoTaglio from './svg/service-bagno-taglio.svg';
import nodi from './svg/service-nodi.svg';
import dermatologico from './svg/service-dermatologico.svg';
import antiparassitario from './svg/service-antiparassitario.svg';
import bagnoSistemazione from './svg/service-bagno-sistemazione.svg';
import peloCorto from './svg/service-pelo-corto.svg';
import peloLungo from './svg/service-pelo-lungo.svg';
import unghie from './svg/service-unghie.svg';
import orecchie from './svg/service-orecchie.svg';
import occhi from './svg/service-occhi.svg';
import tosatrice from './svg/tool-tosatrice.svg';
import shampoo from './svg/product-shampoo.svg';
import profumo from './svg/product-profumo.svg';
import avatarPlaceholder from './svg/avatar-placeholder.svg';
import avatarCat from './svg/avatar-cat.svg';
import avatarGeneric from './svg/avatar-generic.svg';

/** Carattere del cane. `tone` = token colore usato per chip/sfondi tenui. */
export const TEMPERAMENT_ICONS = {
  bravo:   { src: bravo,   label: 'schedaBravo',   tone: 'ok'   },
  agitato: { src: agitato, label: 'schedaAgitato', tone: 'warn' },
  mordace: { src: mordace, label: 'schedaMordace', tone: 'bad'  },
} as const;

/** Flag aggiuntivi (si sommano al carattere). */
export const FLAG_ICONS = {
  anziano: { src: anziano, label: 'schedaAnziano', tone: 'sen' },
  mensile: { src: mensile, label: 'schedaMensile', tone: 'tea' },
} as const;

/** Servizi di default (chiave = `iconKey` nel catalogo servizi). */
export const SERVICE_ICONS = {
  bagno:            { src: bagno,            label: 'icoBagno' },
  taglio:           { src: taglio,           label: 'icoTaglio' },
  bagno_taglio:     { src: bagnoTaglio,      label: 'icoBagnoTaglio' },
  nodi:             { src: nodi,             label: 'icoNodi' },
  dermatologico:    { src: dermatologico,    label: 'icoDermatologico' },
  antiparassitario: { src: antiparassitario, label: 'icoAntiparassitario' },
} as const;

export const PRICE_ICONS = {
  ...SERVICE_ICONS,
  bagno_sistemazione: { src: bagnoSistemazione, label: 'icoBagnoSistemazione' },
  pelo_corto: { src: peloCorto, label: 'icoPeloCorto' },
  pelo_lungo: { src: peloLungo, label: 'icoPeloLungo' },
  unghie: { src: unghie, label: 'icoUnghie' },
  orecchie: { src: orecchie, label: 'icoOrecchie' },
  occhi: { src: occhi, label: 'icoOcchi' },
  shampoo: { src: shampoo, label: 'icoShampoo' },
  tosatrice: { src: tosatrice, label: 'icoTosatrice' },
} as const;

/** Strumenti e prodotti (storico trattamenti). */
export const TOOL_ICONS = {
  tosatrice: { src: tosatrice, label: 'icoLama' },
  shampoo:   { src: shampoo,   label: 'icoShampoo' },
  profumo:   { src: profumo,   label: 'icoProfumo' },
} as const;

export const AVATAR_PLACEHOLDER = avatarPlaceholder;

/** Segnaposto senza foto, per specie: cane (default), gatto, altro. */
export const SPECIES_AVATARS = {
  cane:  avatarPlaceholder,
  gatto: avatarCat,
  altro: avatarGeneric,
} as const;

export function avatarForSpecies(species?: 'cane' | 'gatto' | 'altro'): string {
  return species ? SPECIES_AVATARS[species] : avatarPlaceholder;
}

export type TemperamentKey = keyof typeof TEMPERAMENT_ICONS;
export type FlagKey = keyof typeof FLAG_ICONS;
export type ServiceIconKey = keyof typeof SERVICE_ICONS;
export type PriceIconKey = keyof typeof PRICE_ICONS;
export type ToolIconKey = keyof typeof TOOL_ICONS;
