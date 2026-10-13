import type { PriceIconKey } from '../../assets/icons/icons'
import type { DogSize } from '../../types/models'
import type { ExtraItem, PriceItem, PriceKind, PriceSheet, SheetSectionId } from '../../types/priceSheet'

const ICONE_VOCE: Record<string, PriceIconKey> = {
  'Bagno': 'bagno',
  'Bagno + tosatura': 'bagno_taglio',
  'Bagno + sistemazione': 'bagno_sistemazione',
  'Pelo corto': 'pelo_corto',
  'Pelo lungo': 'pelo_lungo',
  'Taglio unghie': 'unghie',
}

function voce(id: string, nome: string, prezzo: number | null, tipo: PriceKind = 'da'): PriceItem {
  const item: PriceItem = {
    id,
    nome,
    iconKey: ICONE_VOCE[nome] ?? 'bagno',
    tipo: prezzo == null ? 'valutazione' : tipo,
  }
  if (prezzo != null) item.prezzo = prezzo
  return item
}

function razza(id: string, taglia: DogSize, nome: string, voci: PriceItem[]) {
  return { id, taglia, nome, voci }
}

const SEZIONI: { id: SheetSectionId; visibile: boolean }[] = [
  { id: 'piccola', visibile: true },
  { id: 'media', visibile: true },
  { id: 'grande', visibile: true },
  { id: 'bagnoTosatura', visibile: true },
  { id: 'extra', visibile: true },
  { id: 'info', visibile: true },
  { id: 'avviso', visibile: true },
  { id: 'compresi', visibile: true },
  { id: 'saluto', visibile: true },
]

export function seedPriceSheet(business: { name: string; phone: string; address: string }): PriceSheet {
  const extraUnghie: ExtraItem = { ...voce('extra-unghie', 'Taglio unghie', 5, 'da'), sotto: [] }
  const extraShampoo: ExtraItem = {
    id: 'extra-shampoo',
    nome: 'Shampoo dermatologico e antiparassitario',
    iconKey: 'dermatologico',
    tipo: 'fisso',
    sotto: [
      { id: 'extra-shampoo-mini', nome: 'Taglia mini', tipo: 'fisso', prezzo: 3 },
      { id: 'extra-shampoo-pm', nome: 'Taglia piccola/media', tipo: 'fisso', prezzo: 4 },
      { id: 'extra-shampoo-gr', nome: 'Taglia grande', tipo: 'fisso', prezzo: 5 },
    ],
  }

  return {
    version: 1,
    intestazione: {
      titolo: 'TOELETTATURA',
      sottotitolo: 'LISTINO',
      nome: business.name || 'I Pelosetti',
      descrizione: 'Servizio di toelettatura',
      indirizzo: business.address || 'corso Vitt. Emanuele 4/c',
      telefono: business.phone || '349 0989700',
      colore: '#B8285E',
    },
    razze: [
      razza('york', 'piccola', 'Yorkshire', [
        voce('york-bagno', 'Bagno', 25),
        voce('york-bt', 'Bagno + tosatura', 35),
        voce('york-bs', 'Bagno + sistemazione', 30),
      ]),
      razza('maltese', 'piccola', 'Maltese / Shih Tzu / Barboncino / Maltipoo', [
        voce('maltese-bagno', 'Bagno', 30),
        voce('maltese-bt', 'Bagno + tosatura', 40),
        voce('maltese-bs', 'Bagno + sistemazione', 35),
      ]),
      razza('jack', 'piccola', 'Jack Russell', [voce('jack-bagno', 'Bagno', 23)]),
      razza('chihuahua', 'piccola', 'Chihuahua / Pinscher', [
        voce('chihuahua-corto', 'Pelo corto', 18),
        voce('chihuahua-lungo', 'Pelo lungo', 20),
        voce('chihuahua-bs', 'Bagno + sistemazione', 25),
        voce('chihuahua-bt', 'Bagno + tosatura', null),
      ]),
      razza('volpino', 'piccola', 'Volpino / Pomerania', [
        voce('volpino-bagno', 'Bagno', 30),
        voce('volpino-bs', 'Bagno + sistemazione', 35),
      ]),
      razza('bassotto-corto', 'piccola', 'Bassotto pelo corto', [voce('bassotto-corto-bagno', 'Bagno', 20)]),
      razza('bassotto-lungo', 'piccola', 'Bassotto pelo lungo', [voce('bassotto-lungo-bagno', 'Bagno', 23)]),
      razza('cocker', 'media', 'Cocker Inglese', [
        voce('cocker-bagno', 'Bagno', 35),
        voce('cocker-bt', 'Bagno + tosatura', 50),
        voce('cocker-bs', 'Bagno + sistemazione', 40),
      ]),
      razza('cavalier', 'media', 'Cavalier King', [
        voce('cavalier-bagno', 'Bagno', 30),
        voce('cavalier-bs', 'Bagno + sistemazione', 35),
      ]),
      razza('beagle', 'media', 'Beagle', [voce('beagle-bagno', 'Bagno', 28)]),
      razza('bulldog-fr', 'media', 'Bulldog Francese / Carlino', [voce('bulldog-fr-bagno', 'Bagno', 25)]),
      razza('bulldog-in', 'media', 'Bulldog Inglese', [voce('bulldog-in-bagno', 'Bagno', 30)]),
      razza('border', 'media', 'Border Collie', [voce('border-bagno', 'Bagno', 35)]),
      razza('fonnese', 'media', 'Fonnese', [voce('fonnese-bagno', 'Bagno', 40)]),
      razza('amstaff', 'media', 'Amstaff / Pitbull / Boxer', [voce('amstaff-bagno', 'Bagno', 30)]),
      razza('sharpei', 'media', 'Shar Pei', [voce('sharpei-bagno', 'Bagno', 35)]),
      razza('shiba', 'media', 'Shiba Inu', [voce('shiba-bagno', 'Bagno', 30)]),
      razza('akita', 'media', 'Akita Inu', [voce('akita-bagno', 'Bagno', 50)]),
      razza('labrador', 'grande', 'Labrador Retriever', [voce('labrador-bagno', 'Bagno', 35)]),
      razza('golden', 'grande', 'Golden Retriever', [voce('golden-bagno', 'Bagno', 45)]),
      razza('pastore', 'grande', 'Pastore Tedesco', [voce('pastore-bagno', 'Bagno', 45)]),
      razza('husky', 'grande', 'Husky', [voce('husky-bagno', 'Bagno', 45)]),
      razza('malamute', 'grande', 'Malamute', [voce('malamute-bagno', 'Bagno', 50)]),
      razza('chow', 'grande', 'Chow Chow', [voce('chow-bagno', 'Bagno', 50)]),
      razza('samoiedo', 'grande', 'Samoiedo', [voce('samoiedo-bagno', 'Bagno', 60)]),
      razza('maremmano', 'grande', 'Maremmano', [voce('maremmano-bagno', 'Bagno', 50)]),
      razza('rottweiler', 'grande', 'Rottweiler', [voce('rottweiler-bagno', 'Bagno', 40)]),
      razza('corso', 'grande', 'Cane Corso', [voce('corso-bagno', 'Bagno', 40)]),
    ],
    noteTaglia: {
      piccola: '',
      media: '',
      grande: 'Tosatura a partire da 55 €\nma su valutazione del tipo di cane, mantello e problematiche.',
    },
    bagnoTosatura: {
      titolo: 'Bagno + tosatura',
      sottotitolo: '(indicativo)',
      voci: [
        { id: 'bt-piccola', nome: 'Taglia piccola', tipo: 'da', prezzo: 35 },
        { id: 'bt-media', nome: 'Taglia media', tipo: 'da', prezzo: 50 },
        { id: 'bt-grande', nome: 'Taglia grande', tipo: 'da', prezzo: 55 },
      ],
    },
    extra: {
      titolo: 'Servizi extra',
      voci: [extraUnghie, extraShampoo],
    },
    compresi: {
      titolo: 'Nel servizio bagno sono compresi:',
      voci: [
        { id: 'compresi-unghie', iconKey: 'unghie', testo: 'Taglio unghie' },
        { id: 'compresi-orecchie', iconKey: 'orecchie', testo: 'Pulizia orecchie' },
        { id: 'compresi-occhi', iconKey: 'occhi', testo: 'Pulizia occhi' },
      ],
    },
    info: {
      titolo: 'Informazioni importanti',
      intro: 'I prezzi indicati sono da considerarsi a partire da e possono aumentare in base a:',
      punti: [
        'presenza di nodi o feltri',
        'condizioni del mantello che richiede lavorazioni extra (muta)',
        'comportamento del cane (agitato, difficile da gestire)',
        'tempo necessario per completare il servizio',
      ],
      chiusura: 'In questi casi verrà applicato un supplemento proporzionato al lavoro richiesto.',
    },
    avviso: {
      titolo: 'Non si accettano cani infestati da pulci o zecche',
      intro: 'Per il benessere di tutti gli animali presenti in toelettatura:',
      punti: [
        'non vengono accettati cani con infestazioni in corso di pulci o zecche',
        'è consigliato effettuare preventivamente un trattamento antiparassitario a casa',
        'il servizio di toelettatura potrà essere eseguito successivamente',
      ],
    },
    saluto: 'Grazie per la fiducia!',
    sezioni: SEZIONI,
    opzioni: { scriviAPartireDa: true, formato: 'A4', tipoFile: 'pdf' },
    updatedAt: new Date().toISOString(),
  }
}
