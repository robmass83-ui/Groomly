import { oraRoma } from '../lib/disponibilita'
import { LOCALE_INTL, type Lingua } from './lingua'

export type TipoEmail =
  | 'verifica'
  | 'reset'
  | 'invito'
  | 'ricevuta'
  | 'conferma'
  | 'proposta'
  | 'rifiuto'
  | 'liberato'
  | 'scadenza'
  | 'disdetta'
  | 'promemoria'
  | 'pronto'
  | 'auguri'
  | 'recensione'
  | 'attesa'

type TipoCliente = Exclude<TipoEmail, 'verifica' | 'reset' | 'invito'>

export type RuoloSalone = 'soggetto' | 'oggetto' | 'di' | 'a' | 'da' | 'dopoDi'

export type DatiEmail = {
  cliente?: string
  cane?: string
  salone?: string
  ruolo?: 'socio' | 'collaboratore'
  url?: string
  urlRifiuta?: string
  quando?: string
  telefono?: string
  invece?: string
  entro?: string
  silenzio?: string
  scheda?: string
  rispondi?: boolean
  account?: string
}

const SERVIZI = new Set<TipoEmail>(['promemoria', 'pronto', 'auguri', 'recensione', 'attesa'])
const NOTA_RISPOSTA_TIPI = new Set<TipoEmail>(['ricevuta', 'conferma', 'proposta', 'rifiuto', 'scadenza'])
const SENZA_PULSANTE = new Set<TipoEmail>(['ricevuta', 'conferma', 'rifiuto', 'liberato', 'scadenza', 'disdetta', 'promemoria', 'pronto', 'auguri'])

const OGGETTO_VERIFICA: Record<Lingua, string> = {
  it: 'Benvenuto su Groomly, conferma la tua email',
  en: 'Welcome to Groomly, please confirm your email',
  es: 'Bienvenido a Groomly, confirma tu correo',
  fr: 'Bienvenue sur Groomly, confirmez votre e-mail',
  de: 'Willkommen bei Groomly, bitte bestätigen Sie Ihre E-Mail',
}

const OGGETTO_RESET: Record<Lingua, string> = {
  it: 'Reimposta la tua password',
  en: 'Reset your password',
  es: 'Restablece tu contraseña',
  fr: 'Réinitialisez votre mot de passe',
  de: 'Setzen Sie Ihr Passwort zurück',
}

const OGGETTO_INVITO_VUOTO: Record<Lingua, string> = {
  it: 'Sei invitato su Groomly',
  en: 'You’re invited to Groomly',
  es: 'Te invitan a Groomly',
  fr: 'Vous êtes invité sur Groomly',
  de: 'Sie sind zu Groomly eingeladen',
}

const OGGETTO_INVITO: Record<Lingua, (nome: string) => string> = {
  it: (nome) => `${nome} ti invita su Groomly`,
  en: (nome) => `${nome} has invited you to Groomly`,
  es: (nome) => `${nome} te invita a Groomly`,
  fr: (nome) => `${nome} vous invite sur Groomly`,
  de: (nome) => `${nome} lädt Sie zu Groomly ein`,
}

const BOTTONE_ACCOUNT: Record<'verifica' | 'reset' | 'invito', Record<Lingua, string>> = {
  verifica: { it: 'Conferma l’email', en: 'Confirm email', es: 'Confirmar el correo', fr: 'Confirmer l’e-mail', de: 'E-Mail bestätigen' },
  reset: { it: 'Reimposta la password', en: 'Reset password', es: 'Restablecer la contraseña', fr: 'Réinitialiser le mot de passe', de: 'Passwort zurücksetzen' },
  invito: { it: 'Accetta l’invito', en: 'Accept invitation', es: 'Aceptar la invitación', fr: 'Accepter l’invitation', de: 'Einladung annehmen' },
}

const NOTA_RISPOSTA: Record<Lingua, string> = {
  it: 'Hai una domanda? Rispondi a questa email, arriva direttamente al salone.',
  en: 'Any questions? Just reply to this email and it will go straight to the salon.',
  es: '¿Tienes alguna pregunta? Responde a este correo y llegará directamente a la peluquería.',
  fr: 'Une question ? Répondez à cet e-mail, il arrivera directement au salon.',
  de: 'Haben Sie eine Frage? Antworten Sie auf diese E-Mail, sie geht direkt an den Salon.',
}

const NOTA_PAGINA: Record<Lingua, string> = {
  it: 'Puoi inviare una nuova richiesta dalla pagina del salone.',
  en: "You can send a new request from the salon's page.",
  es: 'Puedes enviar una nueva solicitud desde la página de la peluquería.',
  fr: 'Vous pouvez envoyer une nouvelle demande depuis la page du salon.',
  de: 'Über die Seite des Salons können Sie eine neue Anfrage senden.',
}

const SILENZIO: Record<Lingua, string> = {
  it: 'Non voglio più ricevere queste email',
  en: "I don't want to receive these emails any more",
  es: 'No quiero recibir más estos correos',
  fr: 'Je ne souhaite plus recevoir ces e-mails',
  de: 'Ich möchte diese E-Mails nicht mehr erhalten',
}

const CONFERMO: Record<Lingua, string> = { it: 'Confermo', en: 'Confirm', es: 'Confirmo', fr: 'Je confirme', de: 'Bestätigen' }
const NON_POSSO: Record<Lingua, string> = { it: 'Non posso', en: "I can't make it", es: 'No puedo', fr: 'Je ne peux pas', de: 'Ich kann nicht' }
const RECENSIONE_BOTTONE: Record<Lingua, string> = { it: 'Lascia una recensione', en: 'Leave a review', es: 'Dejar una reseña', fr: 'Laisser un avis', de: 'Bewertung schreiben' }
const ATTESA_BOTTONE: Record<Lingua, string> = { it: 'Prenota il posto', en: 'Book this slot', es: 'Reservar el hueco', fr: 'Réserver ce créneau', de: 'Termin buchen' }

const SALONE_VUOTO: Record<RuoloSalone, Record<Lingua, string>> = {
  soggetto: { it: 'il salone', en: 'the salon', es: 'la peluquería', fr: 'le salon', de: 'der Salon' },
  oggetto: { it: 'il salone', en: 'the salon', es: 'la peluquería', fr: 'le salon', de: 'den Salon' },
  di: { it: 'del salone', en: 'of the salon', es: 'de la peluquería', fr: 'du salon', de: 'des Salons' },
  a: { it: 'al salone', en: 'to the salon', es: 'a la peluquería', fr: 'au salon', de: 'an den Salon' },
  da: { it: 'dal salone', en: 'from the salon', es: 'de la peluquería', fr: 'du salon', de: 'vom Salon' },
  dopoDi: { it: 'dal salone', en: 'at the salon', es: 'en la peluquería', fr: 'au salon', de: 'im Salon' },
}

const PREPOSIZIONE_A: Record<Lingua, string> = { it: 'a', en: 'to', es: 'a', fr: 'à', de: 'an' }
const PREPOSIZIONE_DI: Record<Lingua, string> = { it: 'di', en: 'of', es: 'de', fr: 'de', de: 'von' }
const LUOGO: Record<Lingua, { ruolo: RuoloSalone; prep: string }> = {
  it: { ruolo: 'da', prep: 'da' },
  en: { ruolo: 'dopoDi', prep: 'at' },
  es: { ruolo: 'dopoDi', prep: 'en' },
  fr: { ruolo: 'dopoDi', prep: 'chez' },
  de: { ruolo: 'dopoDi', prep: 'bei' },
}

const RUOLI: Record<Lingua, Record<'socio' | 'collaboratore', string>> = {
  it: { socio: 'Socio', collaboratore: 'Collaboratore' },
  en: { socio: 'Partner', collaboratore: 'Team member' },
  es: { socio: 'Socio', collaboratore: 'Colaborador' },
  fr: { socio: 'Associé', collaboratore: 'Collaborateur' },
  de: { socio: 'Teilhaber', collaboratore: 'Mitarbeiter' },
}

const ANIMALE_SENZA_NOME: Record<Lingua, string> = { it: 'Animale', en: 'Pet', es: 'Mascota', fr: 'Animal', de: 'Tier' }

/** Il nome da dare a una scheda quando la richiesta non ne ha nessuno. */
export function nomeAnimaleVuoto(lingua: Lingua): string {
  return ANIMALE_SENZA_NOME[lingua]
}

export function etichettaRuolo(lingua: Lingua, ruolo: 'socio' | 'collaboratore'): string {
  return RUOLI[lingua][ruolo]
}

export function escapaHtml(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function saloneNellaFrase(lingua: Lingua, nome: string, ruolo: RuoloSalone): string {
  const pulito = nome.trim()
  if (pulito) return escapaHtml(pulito)
  return SALONE_VUOTO[ruolo][lingua]
}

function posto(lingua: Lingua, nome: string, ruolo: RuoloSalone, prep: string): string {
  if (nome.trim()) {
    const pezzo = saloneNellaFrase(lingua, nome, ruolo)
    return prep ? `${prep} ${pezzo}` : pezzo
  }
  return saloneNellaFrase(lingua, '', ruolo)
}

/** «da Canespa», «at Canespa», «chez Canespa»; senza nome «dal salone» e simili. */
export function luogoSalone(lingua: Lingua, nome: string): string {
  return posto(lingua, nome, LUOGO[lingua].ruolo, LUOGO[lingua].prep)
}

function maiuscola(testo: string): string {
  return testo.charAt(0).toUpperCase() + testo.slice(1)
}

const CIAO: Record<Lingua, string> = { it: 'Ciao', en: 'Hi', es: 'Hola', fr: 'Bonjour', de: 'Hallo' }

function saluto(lingua: Lingua, cliente: string): string {
  const nome = cliente.trim()
  if (!nome) return `${CIAO[lingua]},`
  return `${CIAO[lingua]} ${escapaHtml(nome)},`
}

const SPECIE_MAIL: Record<Lingua, Record<string, string>> = {
  it: { cane: 'cane', gatto: 'gatto', altro: 'altro animale' },
  en: { cane: 'dog', gatto: 'cat', altro: 'other animal' },
  es: { cane: 'perro', gatto: 'gato', altro: 'otro animal' },
  fr: { cane: 'chien', gatto: 'chat', altro: 'autre animal' },
  de: { cane: 'Hund', gatto: 'Katze', altro: 'anderes Tier' },
}

const TAGLIA_MAIL: Record<Lingua, Record<string, string>> = {
  it: { piccola: 'taglia piccola', media: 'taglia media', grande: 'taglia grande' },
  en: { piccola: 'small size', media: 'medium size', grande: 'large size' },
  es: { piccola: 'talla pequeña', media: 'talla mediana', grande: 'talla grande' },
  fr: { piccola: 'petite taille', media: 'taille moyenne', grande: 'grande taille' },
  de: { piccola: 'klein', media: 'mittelgroß', grande: 'groß' },
}

const PREZZI_MAIL: Record<Lingua, string> = {
  it: 'I prezzi sono indicativi. Possono variare dopo aver visto l’animale, se ci sono nodi o problemi che richiedono più tempo.',
  en: 'Prices are a guide. They can change after we see the animal, if there are mats or problems that need more time.',
  es: 'Los precios son orientativos. Pueden cambiar después de ver al animal, si hay nudos o problemas que pidan más tiempo.',
  fr: 'Les prix sont indicatifs. Ils peuvent changer une fois l’animal vu, en cas de nœuds ou de problèmes qui demandent plus de temps.',
  de: 'Die Preise sind Richtwerte. Sie können sich ändern, sobald wir das Tier gesehen haben, wenn Knoten oder andere Probleme mehr Zeit brauchen.',
}

const DURATA_MAIL: Record<Lingua, (minuti: number, prezzo: string) => string> = {
  it: (minuti, prezzo) => `Durata ${minuti} min · Prezzo indicativo ${prezzo}`,
  en: (minuti, prezzo) => `Duration ${minuti} min · Guide price ${prezzo}`,
  es: (minuti, prezzo) => `Duración ${minuti} min · Precio orientativo ${prezzo}`,
  fr: (minuti, prezzo) => `Durée ${minuti} min · Prix indicatif ${prezzo}`,
  de: (minuti, prezzo) => `Dauer ${minuti} Min. · Richtpreis ${prezzo}`,
}

const TELEFONO_MAIL: Record<Lingua, (telefono: string) => string> = {
  it: (telefono) => `Telefono del salone: ${telefono}`,
  en: (telefono) => `Salon phone: ${telefono}`,
  es: (telefono) => `Teléfono del salón: ${telefono}`,
  fr: (telefono) => `Téléphone du salon : ${telefono}`,
  de: (telefono) => `Telefon des Salons: ${telefono}`,
}

const FORMA_GIORNO: Record<Lingua, (giorno: string, numero: string, mese: string) => string> = {
  it: (giorno, numero, mese) => `${giorno} ${numero} ${mese}`,
  en: (giorno, numero, mese) => `${giorno} ${numero} ${mese}`,
  es: (giorno, numero, mese) => `${giorno} ${numero} de ${mese}`,
  fr: (giorno, numero, mese) => `${giorno} ${numero} ${mese}`,
  de: (giorno, numero, mese) => `${giorno}, ${numero}. ${mese}`,
}

export function giornoMail(lingua: Lingua, data: Date): string {
  const locale = LOCALE_INTL[lingua]
  const parti = new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(data)
  const valore = (tipo: Intl.DateTimeFormatPartTypes) => parti.find((parte) => parte.type === tipo)?.value ?? ''
  return FORMA_GIORNO[lingua](valore('weekday'), valore('day'), valore('month'))
}

const ALLE: Record<Lingua, string> = { it: 'alle', en: 'at', es: 'a las', fr: 'à', de: 'um' }

/** «martedì 4 novembre alle 09:00». */
export function giornoEOra(lingua: Lingua, giorno: string, ora: string): string {
  return `${giorno} ${ALLE[lingua]} ${ora}`
}

const ORA_LIMITE: Record<Lingua, (ora: string) => string> = {
  it: (ora) => `le ${ora}`,
  en: (ora) => ora,
  es: (ora) => `las ${ora}`,
  fr: (ora) => ora,
  de: (ora) => `${ora} Uhr`,
}

/** L'ora dentro «rispondi entro …». */
export function oraLimite(lingua: Lingua, ora: string): string {
  return ORA_LIMITE[lingua](ora)
}

const EURO_DOPO = new Set<Lingua>(['fr', 'de'])

function euro(lingua: Lingua, totale: number): string {
  const testo = Number.isInteger(totale) ? String(totale) : totale.toFixed(2).replace('.', ',')
  return EURO_DOPO.has(lingua) ? `${testo} €` : `€ ${testo}`
}

export function riepilogoRicevuta(lingua: Lingua, dati: {
  nome: string
  cane?: string
  razza?: string
  specie?: string
  taglia?: string
  servizi: readonly string[]
  inizio: Date
  fine: Date
  durataMin: number
  totale: number
  telefono?: string
}): string {
  const animale = [dati.cane, SPECIE_MAIL[lingua][dati.specie ?? ''], TAGLIA_MAIL[lingua][dati.taglia ?? ''], dati.razza]
    .map((voce) => (voce ?? '').trim())
    .filter(Boolean)
    .join(' · ')
  const servizi = dati.servizi.map((voce) => voce.trim()).filter(Boolean).join(', ')
  const quando = Number.isNaN(dati.inizio.getTime())
    ? ''
    : `${giornoMail(lingua, dati.inizio)}, ${oraRoma(dati.inizio)}–${oraRoma(dati.fine)}`
  const durata = DURATA_MAIL[lingua](dati.durataMin, euro(lingua, dati.totale))
  const telefono = (dati.telefono ?? '').trim()
  const contatto = telefono ? TELEFONO_MAIL[lingua](telefono) : ''
  return [dati.nome.trim(), animale, servizi, quando, durata, PREZZI_MAIL[lingua], contatto].filter(Boolean).join('\n')
}

const OGGETTI: Record<Lingua, Record<TipoCliente, (nome: string) => string>> = {
  it: {
    ricevuta: () => 'Abbiamo ricevuto la tua richiesta',
    conferma: (nome) => (nome ? `Appuntamento confermato per ${nome}` : 'Appuntamento confermato'),
    proposta: (nome) => (nome ? `Un nuovo orario per ${nome}` : 'Un nuovo orario'),
    rifiuto: () => 'Aggiornamento sulla tua richiesta',
    liberato: () => 'Il posto è stato liberato',
    scadenza: () => 'La tua richiesta è scaduta',
    disdetta: (nome) => (nome ? `Appuntamento di ${nome} disdetto` : 'Appuntamento disdetto'),
    promemoria: (nome) => (nome ? `Ci vediamo presto, ${nome}!` : 'Ci vediamo presto!'),
    pronto: (nome) => (nome ? `${nome} è pronto!` : 'È pronto'),
    auguri: (nome) => (nome ? `Buon compleanno, ${nome}!` : 'Buon compleanno!'),
    recensione: (nome) => (nome ? `Com’è andata con ${nome}?` : 'Com’è andata?'),
    attesa: (nome) => (nome ? `Si è liberato un posto per ${nome}` : 'Si è liberato un posto'),
  },
  en: {
    ricevuta: () => "We've received your request",
    conferma: (nome) => (nome ? `Appointment confirmed for ${nome}` : 'Appointment confirmed'),
    proposta: (nome) => (nome ? `A new time for ${nome}` : 'A new time'),
    rifiuto: () => 'An update on your request',
    liberato: () => 'The slot has been released',
    scadenza: () => 'Your request has expired',
    disdetta: (nome) => (nome ? `${nome}'s appointment cancelled` : 'Appointment cancelled'),
    promemoria: (nome) => (nome ? `See you soon, ${nome}!` : 'See you soon!'),
    pronto: (nome) => (nome ? `${nome} is ready!` : 'Ready for pick-up'),
    auguri: (nome) => (nome ? `Happy birthday, ${nome}!` : 'Happy birthday!'),
    recensione: (nome) => (nome ? `How did it go with ${nome}?` : 'How did it go?'),
    attesa: (nome) => (nome ? `A slot has opened up for ${nome}` : 'A slot has opened up'),
  },
  es: {
    ricevuta: () => 'Hemos recibido tu solicitud',
    conferma: (nome) => (nome ? `Cita confirmada para ${nome}` : 'Cita confirmada'),
    proposta: (nome) => (nome ? `Un nuevo horario para ${nome}` : 'Un nuevo horario'),
    rifiuto: () => 'Novedades sobre tu solicitud',
    liberato: () => 'El hueco ha quedado libre',
    scadenza: () => 'Tu solicitud ha caducado',
    disdetta: (nome) => (nome ? `Cita de ${nome} cancelada` : 'Cita cancelada'),
    promemoria: (nome) => (nome ? `¡Nos vemos pronto, ${nome}!` : '¡Nos vemos pronto!'),
    pronto: (nome) => (nome ? `¡${nome} ya está listo!` : 'Ya está listo'),
    auguri: (nome) => (nome ? `¡Feliz cumpleaños, ${nome}!` : '¡Feliz cumpleaños!'),
    recensione: (nome) => (nome ? `¿Qué tal le fue a ${nome}?` : '¿Qué tal fue?'),
    attesa: (nome) => (nome ? `Se ha liberado un hueco para ${nome}` : 'Se ha liberado un hueco'),
  },
  fr: {
    ricevuta: () => 'Nous avons bien reçu votre demande',
    conferma: (nome) => (nome ? `Rendez-vous confirmé pour ${nome}` : 'Rendez-vous confirmé'),
    proposta: (nome) => (nome ? `Un nouvel horaire pour ${nome}` : 'Un nouvel horaire'),
    rifiuto: () => 'Des nouvelles de votre demande',
    liberato: () => 'Le créneau a été libéré',
    scadenza: () => 'Votre demande a expiré',
    disdetta: (nome) => (nome ? `Rendez-vous de ${nome} annulé` : 'Rendez-vous annulé'),
    promemoria: (nome) => (nome ? `À bientôt, ${nome} !` : 'À bientôt !'),
    pronto: (nome) => (nome ? `${nome} vous attend !` : 'Tout est prêt'),
    auguri: (nome) => (nome ? `Joyeux anniversaire, ${nome} !` : 'Joyeux anniversaire !'),
    recensione: (nome) => (nome ? `Comment ça s’est passé pour ${nome} ?` : 'Comment ça s’est passé ?'),
    attesa: (nome) => (nome ? `Un créneau s’est libéré pour ${nome}` : 'Un créneau s’est libéré'),
  },
  de: {
    ricevuta: () => 'Wir haben Ihre Anfrage erhalten',
    conferma: (nome) => (nome ? `Termin für ${nome} bestätigt` : 'Termin bestätigt'),
    proposta: (nome) => (nome ? `Neue Uhrzeit für ${nome}` : 'Neue Uhrzeit'),
    rifiuto: () => 'Neuigkeiten zu Ihrer Anfrage',
    liberato: () => 'Der Termin wurde freigegeben',
    scadenza: () => 'Ihre Anfrage ist abgelaufen',
    disdetta: (nome) => (nome ? `Termin von ${nome} storniert` : 'Termin storniert'),
    promemoria: (nome) => (nome ? `Bis bald, ${nome}!` : 'Bis bald!'),
    pronto: (nome) => (nome ? `${nome} ist fertig!` : 'Alles fertig'),
    auguri: (nome) => (nome ? `Alles Gute zum Geburtstag, ${nome}!` : 'Alles Gute zum Geburtstag!'),
    recensione: (nome) => (nome ? `Wie war es mit ${nome}?` : 'Wie war es?'),
    attesa: (nome) => (nome ? `Ein Termin ist frei geworden für ${nome}` : 'Ein Termin ist frei geworden'),
  },
}

/** I pezzi già pronti per le frasi: valori escapati, salone con la sua preposizione. */
type PezziFrase = {
  ciao: string
  cane: string
  quando: string
  invece: string
  entro: string
  tel: string
  rispondi: boolean
  chi: string
  oggetto: string
  a: string
  di: string
  qui: string
}

const CORPI: Record<Lingua, Record<TipoCliente, (p: PezziFrase) => string>> = {
  it: {
    ricevuta: (p) => `${p.ciao} grazie per aver scelto ${p.chi}. La richiesta${p.cane ? ` per ${p.cane}` : ''} è arrivata: ti scriviamo appena il salone risponde.`,
    conferma: (p) => {
      const app = p.cane && p.quando ? `l’appuntamento di ${p.cane}, ${p.quando}` : p.cane ? `l’appuntamento di ${p.cane}` : p.quando ? `l’appuntamento, ${p.quando}` : 'l’appuntamento'
      return `${p.ciao} buone notizie: ${p.chi} ha confermato ${app}. Ti aspettiamo! Se hai un imprevisto, avvisa il salone il prima possibile: così il posto può andare a qualcun altro.`
    },
    proposta: (p) => {
      const accogli = [p.cane, p.quando].filter(Boolean).join(' ')
      const chiesto = p.invece
        ? `L’orario che avevi chiesto (${p.invece}) purtroppo non è disponibile`
        : 'L’orario che avevi chiesto purtroppo non è disponibile'
      const ma = accogli ? `, ma ${p.chi} può accogliere ${accogli}` : ''
      const limite = p.entro ? ` Ti chiediamo di rispondere entro ${p.entro}: dopo, il posto verrà liberato.` : ''
      return `${p.ciao} grazie per la richiesta. ${chiesto}${ma}.${limite}`
    },
    rifiuto: (p) => `${p.ciao} ci dispiace: questa volta ${p.chi} non riesce ad accogliere la richiesta${p.cane ? ` per ${p.cane}` : ''}. Puoi inviarne una nuova per un altro giorno, sarà un piacere ricevervi.`,
    liberato: (p) => `${p.ciao} l’orario proposto${p.cane ? ` per ${p.cane}` : ''} non è più riservato. Se vuoi fissare un altro appuntamento, invia una nuova richiesta ${p.a}: ti aspettiamo.`,
    scadenza: (p) => `${p.ciao} ci dispiace: ${p.chi} non è riuscito a confermare la tua richiesta${p.cane ? ` per ${p.cane}` : ''}${p.quando ? ` per ${p.quando}` : ''}. Contattalo direttamente${p.tel ? ` al ${p.tel}` : ''} per fissare un appuntamento.`,
    disdetta: (p) => {
      const altro = p.rispondi
        ? 'Quando vuoi fissarne un altro, invia una nuova richiesta o rispondi a questa email.'
        : 'Quando vuoi fissarne un altro, invia una nuova richiesta.'
      return `${p.ciao} l’appuntamento${p.cane ? ` di ${p.cane}` : ''} ${p.qui} è stato disdetto. ${altro} A presto.`
    },
    promemoria: (p) => `${p.ciao} ${p.chi} ti ricorda il prossimo appuntamento${p.cane ? ` di ${p.cane}` : ''}${p.quando ? `, ${p.quando}` : ''}. Se non riesci a venire, avvisa il salone, così il posto può andare a qualcun altro. A presto!`,
    pronto: (p) => {
      const finito = p.cane
        ? `abbiamo finito: ${p.cane} è pronto per tornare a casa e puoi passare a prenderlo.`
        : 'abbiamo finito.'
      return `${p.ciao} ${finito} Grazie per averlo affidato ${p.a}.`
    },
    auguri: (p) => `${p.ciao} oggi è un giorno speciale: tutto lo staff ${p.di} fa tanti auguri${p.cane ? ` a ${p.cane}` : ''}. Speriamo di rivedervi presto.`,
    recensione: (p) => {
      const coda = p.rispondi ? ' Se invece qualcosa non ti ha convinto, rispondi a questa email: ci teniamo a saperlo.' : ''
      return `${p.ciao} grazie per aver scelto ${p.chi}. Se sei soddisfatto, una recensione su Google ci aiuta tanto e richiede un minuto.${coda}`
    },
    attesa: (p) => `${p.ciao} buone notizie: ${p.qui} si è liberato un posto${p.cane ? ` in un orario che fa per ${p.cane}` : ''}. Se ti va, tocca il pulsante per prenotarlo: i posti liberi vanno via in fretta.`,
  },
  en: {
    ricevuta: (p) => `${p.ciao} thank you for choosing ${p.chi}. Your request${p.cane ? ` for ${p.cane}` : ''} has arrived: we'll let you know as soon as the salon replies.`,
    conferma: (p) => {
      const app = p.cane && p.quando ? `${p.cane}'s appointment, ${p.quando}` : p.cane ? `${p.cane}'s appointment` : p.quando ? `the appointment, ${p.quando}` : 'the appointment'
      return `${p.ciao} good news: ${p.chi} has confirmed ${app}. We look forward to seeing you! If anything comes up, please let the salon know as soon as possible so the slot can go to someone else.`
    },
    proposta: (p) => {
      const accogli = [p.cane, p.quando].filter(Boolean).join(' ')
      const chiesto = p.invece
        ? `Unfortunately the time you asked for (${p.invece}) isn't available`
        : "Unfortunately the time you asked for isn't available"
      const ma = accogli ? `, but ${p.chi} can see ${accogli}` : ''
      const limite = p.entro ? ` Please reply by ${p.entro}: after that, the slot will be released.` : ''
      return `${p.ciao} thank you for your request. ${chiesto}${ma}.${limite}`
    },
    rifiuto: (p) => `${p.ciao} we're sorry: this time ${p.chi} isn't able to accept the request${p.cane ? ` for ${p.cane}` : ''}. You're welcome to send a new one for another day, it would be a pleasure to see you.`,
    liberato: (p) => `${p.ciao} the proposed time${p.cane ? ` for ${p.cane}` : ''} is no longer held. If you'd like to book another appointment, just send a new request ${p.a}: we look forward to seeing you.`,
    scadenza: (p) => `${p.ciao} we're sorry: ${p.chi} wasn't able to confirm your request${p.cane ? ` for ${p.cane}` : ''}${p.quando ? ` for ${p.quando}` : ''}. Please contact the salon directly${p.tel ? ` on ${p.tel}` : ''} to arrange an appointment.`,
    disdetta: (p) => {
      const altro = p.rispondi
        ? "Whenever you'd like to book another, send a new request or reply to this email."
        : "Whenever you'd like to book another, send a new request."
      const app = p.cane ? `${p.cane}'s appointment` : 'the appointment'
      return `${p.ciao} ${app} ${p.qui} has been cancelled. ${altro} See you soon.`
    },
    promemoria: (p) => {
      const app = p.cane ? `${p.cane}'s next appointment` : 'the next appointment'
      return `${p.ciao} ${p.chi} would like to remind you of ${app}${p.quando ? ` on ${p.quando}` : ''}. If you can't make it, please let the salon know so the slot can go to someone else. See you soon!`
    },
    pronto: (p) => {
      const finito = p.cane
        ? `we're all done: ${p.cane} is ready to go home and you can come and pick them up.`
        : "we're all done."
      return `${p.ciao} ${finito} Thank you for trusting ${p.chi}.`
    },
    auguri: (p) => {
      const wish = p.cane ? ` wishes ${p.cane} a very happy birthday` : ' wishes a very happy birthday'
      return `${p.ciao} today is a special day: everyone ${p.qui}${wish}. We hope to see you both again soon.`
    },
    recensione: (p) => {
      const coda = p.rispondi ? " If something wasn't quite right, just reply to this email: we'd really like to know." : ''
      return `${p.ciao} thank you for choosing ${p.chi}. If you're happy with our work, a Google review helps us a lot and only takes a minute.${coda}`
    },
    attesa: (p) => `${p.ciao} good news: a slot has opened up ${p.qui}${p.cane ? ` at a time that suits ${p.cane}` : ''}. If you'd like it, tap the button to book: free slots go quickly.`,
  },
  es: {
    ricevuta: (p) => `${p.ciao} gracias por elegir ${p.chi}. Tu solicitud${p.cane ? ` para ${p.cane}` : ''} ha llegado: te escribiremos en cuanto la peluquería responda.`,
    conferma: (p) => {
      const app = p.cane && p.quando ? `la cita de ${p.cane}, ${p.quando}` : p.cane ? `la cita de ${p.cane}` : p.quando ? `la cita, ${p.quando}` : 'la cita'
      return `${p.ciao} buenas noticias: ${p.chi} ha confirmado ${app}. ¡Te esperamos! Si te surge algún imprevisto, avisa a la peluquería lo antes posible: así el hueco podrá ser para otra persona.`
    },
    proposta: (p) => {
      const chiesto = p.invece
        ? `Lamentablemente el horario que pediste (${p.invece}) no está disponible`
        : 'Lamentablemente el horario que pediste no está disponible'
      const conCane = [p.cane ? `a ${p.cane}` : '', p.quando].filter(Boolean).join(' ')
      const ma = conCane ? `, pero ${p.chi} puede atender ${conCane}` : ''
      const limite = p.entro ? ` Te pedimos que respondas antes de ${p.entro}: después, el hueco quedará libre.` : ''
      return `${p.ciao} gracias por tu solicitud. ${chiesto}${ma}.${limite}`
    },
    rifiuto: (p) => `${p.ciao} lo sentimos: esta vez ${p.chi} no puede aceptar la solicitud${p.cane ? ` para ${p.cane}` : ''}. Puedes enviar una nueva para otro día, será un placer recibiros.`,
    liberato: (p) => `${p.ciao} el horario propuesto${p.cane ? ` para ${p.cane}` : ''} ya no está reservado. Si quieres pedir otra cita, envía una nueva solicitud ${p.a}: te esperamos.`,
    scadenza: (p) => `${p.ciao} lo sentimos: ${p.chi} no ha podido confirmar tu solicitud${p.cane ? ` para ${p.cane}` : ''}${p.quando ? ` para ${p.quando}` : ''}. Contacta directamente con la peluquería${p.tel ? ` en el ${p.tel}` : ''} para fijar una cita.`,
    disdetta: (p) => {
      const altro = p.rispondi
        ? 'Cuando quieras pedir otra, envía una nueva solicitud o responde a este correo.'
        : 'Cuando quieras pedir otra, envía una nueva solicitud.'
      return `${p.ciao} la cita${p.cane ? ` de ${p.cane}` : ''} ${p.qui} ha sido cancelada. ${altro} Hasta pronto.`
    },
    promemoria: (p) => `${p.ciao} ${p.chi} te recuerda la próxima cita${p.cane ? ` de ${p.cane}` : ''}${p.quando ? `, ${p.quando}` : ''}. Si no puedes venir, avisa a la peluquería para que el hueco pueda ser para otra persona. ¡Hasta pronto!`,
    pronto: (p) => {
      const finito = p.cane
        ? `hemos terminado: ${p.cane} ya puede volver a casa y puedes pasar a recogerlo.`
        : 'hemos terminado.'
      return `${p.ciao} ${finito} Gracias por confiar ${p.qui}.`
    },
    auguri: (p) => `${p.ciao} hoy es un día especial: todo el equipo ${p.di} le desea un muy feliz cumpleaños${p.cane ? ` a ${p.cane}` : ''}. Esperamos volver a veros pronto.`,
    recensione: (p) => {
      const coda = p.rispondi ? ' Si algo no te convenció, responde a este correo: nos importa saberlo.' : ''
      return `${p.ciao} gracias por elegir ${p.chi}. Si estás contento con nuestro trabajo, una reseña en Google nos ayuda mucho y solo lleva un minuto.${coda}`
    },
    attesa: (p) => `${p.ciao} buenas noticias: ${p.qui} se ha liberado un hueco${p.cane ? ` en un horario que le viene bien a ${p.cane}` : ''}. Si te interesa, toca el botón para reservarlo: los huecos libres vuelan.`,
  },
  fr: {
    ricevuta: (p) => `${p.ciao} merci d’avoir choisi ${p.chi}. Votre demande${p.cane ? ` pour ${p.cane}` : ''} est bien arrivée : nous vous écrirons dès que le salon aura répondu.`,
    conferma: (p) => {
      const app = p.cane && p.quando ? `le rendez-vous de ${p.cane}, ${p.quando}` : p.cane ? `le rendez-vous de ${p.cane}` : p.quando ? `le rendez-vous, ${p.quando}` : 'le rendez-vous'
      return `${p.ciao} bonne nouvelle : ${p.chi} a confirmé ${app}. Nous vous attendons ! En cas d’imprévu, prévenez le salon dès que possible : le créneau pourra ainsi servir à quelqu’un d’autre.`
    },
    proposta: (p) => {
      const accogli = [p.cane, p.quando].filter(Boolean).join(' ')
      const chiesto = p.invece
        ? `Malheureusement, l’horaire demandé (${p.invece}) n’est pas disponible`
        : 'Malheureusement, l’horaire demandé n’est pas disponible'
      const ma = accogli ? `, mais ${p.chi} peut accueillir ${accogli}` : ''
      const limite = p.entro ? ` Merci de répondre avant ${p.entro} : passé ce délai, le créneau sera libéré.` : ''
      return `${p.ciao} merci pour votre demande. ${chiesto}${ma}.${limite}`
    },
    rifiuto: (p) => `${p.ciao} nous sommes désolés : cette fois, ${p.chi} ne peut pas accepter la demande${p.cane ? ` pour ${p.cane}` : ''}. Vous pouvez en envoyer une nouvelle pour un autre jour, ce sera un plaisir de vous accueillir.`,
    liberato: (p) => `${p.ciao} l’horaire proposé${p.cane ? ` pour ${p.cane}` : ''} n’est plus réservé. Si vous souhaitez un autre rendez-vous, envoyez une nouvelle demande ${p.a} : nous vous attendons.`,
    scadenza: (p) => `${p.ciao} nous sommes désolés : ${p.chi} n’a pas pu confirmer votre demande${p.cane ? ` pour ${p.cane}` : ''}${p.quando ? ` pour ${p.quando}` : ''}. Contactez directement le salon${p.tel ? ` au ${p.tel}` : ''} pour fixer un rendez-vous.`,
    disdetta: (p) => {
      const altro = p.rispondi
        ? 'Si vous souhaitez en fixer un autre, envoyez une nouvelle demande ou répondez à cet e-mail.'
        : 'Si vous souhaitez en fixer un autre, envoyez une nouvelle demande.'
      return `${p.ciao} le rendez-vous${p.cane ? ` de ${p.cane}` : ''} ${p.qui} a été annulé. ${altro} À bientôt.`
    },
    promemoria: (p) => `${p.ciao} ${p.chi} vous rappelle le prochain rendez-vous${p.cane ? ` de ${p.cane}` : ''}${p.quando ? `, ${p.quando}` : ''}. Si vous ne pouvez pas venir, prévenez le salon : le créneau pourra ainsi servir à quelqu’un d’autre. À bientôt !`,
    pronto: (p) => {
      const finito = p.cane ? `c’est terminé : vous pouvez venir chercher ${p.cane}.` : 'c’est terminé.'
      return `${p.ciao} ${finito} Merci d’avoir fait confiance ${p.a}.`
    },
    auguri: (p) => `${p.ciao} aujourd’hui est un jour spécial : toute l’équipe ${p.di} souhaite un joyeux anniversaire${p.cane ? ` à ${p.cane}` : ''}. Nous espérons vous revoir bientôt.`,
    recensione: (p) => {
      const coda = p.rispondi ? ' Si quelque chose ne vous a pas convenu, répondez à cet e-mail : nous tenons à le savoir.' : ''
      return `${p.ciao} merci d’avoir choisi ${p.chi}. Si vous êtes satisfait, un avis sur Google nous aide beaucoup et ne prend qu’une minute.${coda}`
    },
    attesa: (p) => `${p.ciao} bonne nouvelle : un créneau s’est libéré ${p.qui}${p.cane ? ` à un horaire qui convient à ${p.cane}` : ''}. Si cela vous intéresse, touchez le bouton pour le réserver : les créneaux libres partent vite.`,
  },
  de: {
    ricevuta: (p) => `${p.ciao} vielen Dank, dass Sie sich für ${p.oggetto} entschieden haben. Ihre Anfrage${p.cane ? ` für ${p.cane}` : ''} ist angekommen: Wir melden uns, sobald der Salon geantwortet hat.`,
    conferma: (p) => {
      const app = p.cane && p.quando ? `den Termin von ${p.cane}, ${p.quando},` : p.cane ? `den Termin von ${p.cane}` : p.quando ? `den Termin, ${p.quando},` : 'den Termin'
      return `${p.ciao} gute Nachrichten: ${maiuscola(p.chi)} hat ${app} bestätigt. Wir freuen uns auf Sie! Falls etwas dazwischenkommt, sagen Sie dem Salon bitte so früh wie möglich Bescheid, damit jemand anderes den Termin nutzen kann.`
    },
    proposta: (p) => {
      const accogli = [p.cane, p.quando ? `am ${p.quando}` : ''].filter(Boolean).join(' ')
      const chiesto = p.invece
        ? `Leider ist die gewünschte Uhrzeit (${p.invece}) nicht verfügbar`
        : 'Leider ist die gewünschte Uhrzeit nicht verfügbar'
      const ma = accogli ? `, aber ${p.chi} kann ${accogli} empfangen` : ''
      const limite = p.entro ? ` Bitte antworten Sie bis ${p.entro}: Danach wird der Termin freigegeben.` : ''
      return `${p.ciao} vielen Dank für Ihre Anfrage. ${chiesto}${ma}.${limite}`
    },
    rifiuto: (p) => `${p.ciao} es tut uns leid: Dieses Mal kann ${p.chi} die Anfrage${p.cane ? ` für ${p.cane}` : ''} nicht annehmen. Sie können gern eine neue für einen anderen Tag senden, wir freuen uns auf Sie.`,
    liberato: (p) => `${p.ciao} die vorgeschlagene Uhrzeit${p.cane ? ` für ${p.cane}` : ''} ist nicht mehr reserviert. Wenn Sie einen anderen Termin möchten, senden Sie einfach eine neue Anfrage ${p.a}: Wir freuen uns auf Sie.`,
    scadenza: (p) => `${p.ciao} es tut uns leid: ${maiuscola(p.chi)} konnte Ihre Anfrage${p.cane ? ` für ${p.cane}` : ''}${p.quando ? ` für ${p.quando}` : ''} nicht bestätigen. Bitte wenden Sie sich direkt an den Salon${p.tel ? ` unter ${p.tel}` : ''}, um einen Termin zu vereinbaren.`,
    disdetta: (p) => {
      const altro = p.rispondi
        ? 'Wenn Sie einen neuen Termin möchten, senden Sie eine neue Anfrage oder antworten Sie auf diese E-Mail.'
        : 'Wenn Sie einen neuen Termin möchten, senden Sie eine neue Anfrage.'
      return `${p.ciao} der Termin${p.cane ? ` von ${p.cane}` : ''} ${p.qui} wurde storniert. ${altro} Bis bald.`
    },
    promemoria: (p) => `${p.ciao} ${p.chi} erinnert Sie an den nächsten Termin${p.cane ? ` von ${p.cane}` : ''}${p.quando ? `, ${p.quando}` : ''}. Falls Sie nicht kommen können, sagen Sie dem Salon bitte Bescheid, damit jemand anderes den Termin nutzen kann. Bis bald!`,
    pronto: (p) => {
      const finito = p.cane ? `wir sind fertig: Sie können ${p.cane} jetzt abholen.` : 'wir sind fertig.'
      return `${p.ciao} ${finito} Vielen Dank für Ihr Vertrauen in ${p.oggetto}.`
    },
    auguri: (p) => `${p.ciao} heute ist ein besonderer Tag: Das ganze Team ${p.di} wünscht${p.cane ? ` ${p.cane}` : ''} alles Gute zum Geburtstag. Wir hoffen, Sie bald wiederzusehen.`,
    recensione: (p) => {
      const coda = p.rispondi ? ' Falls etwas nicht gepasst hat, antworten Sie einfach auf diese E-Mail: Das möchten wir gern wissen.' : ''
      return `${p.ciao} vielen Dank, dass Sie sich für ${p.oggetto} entschieden haben. Wenn Sie zufrieden sind, hilft uns eine Bewertung bei Google sehr und dauert nur eine Minute.${coda}`
    },
    attesa: (p) => `${p.ciao} gute Nachrichten: ${maiuscola(p.qui)} ist ein Termin frei geworden${p.cane ? `, der für ${p.cane} passt` : ''}. Wenn Sie möchten, tippen Sie auf die Schaltfläche, um ihn zu buchen: Freie Termine sind schnell weg.`,
  },
}

function corpoCliente(
  lingua: Lingua,
  tipo: TipoCliente,
  raw: { cliente: string; cane: string; salone: string; quando: string; telefono: string; invece: string; entro: string; rispondi: boolean },
): string {
  return CORPI[lingua][tipo]({
    ciao: saluto(lingua, raw.cliente),
    cane: escapaHtml(raw.cane.trim()),
    quando: escapaHtml(raw.quando.trim()),
    invece: escapaHtml(raw.invece.trim()),
    entro: escapaHtml(raw.entro.trim()),
    tel: escapaHtml(raw.telefono.trim()),
    rispondi: raw.rispondi,
    chi: posto(lingua, raw.salone, 'soggetto', ''),
    oggetto: posto(lingua, raw.salone, 'oggetto', ''),
    a: posto(lingua, raw.salone, 'a', PREPOSIZIONE_A[lingua]),
    di: posto(lingua, raw.salone, 'di', PREPOSIZIONE_DI[lingua]),
    qui: luogoSalone(lingua, raw.salone),
  })
}

function avvolgi(lingua: Lingua, titolo: string, corpo: string, scheda: string, riga: string, pulsanti: string, nota: string, silenzio: string): string {
  const notaHtml = nota ? `<p style="margin:0;font-size:14px;line-height:1.5;color:#6B7A8C">${nota}</p>` : ''
  return `<!doctype html><html lang="${lingua}"><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td align="center" style="padding:0 0 18px"><img src="https://groomlyapp.it/groomly-logo-email.png" alt="Groomly" width="200" style="display:block;border:0;width:200px;max-width:70%;height:auto"></td></tr>
<tr><td style="background:#ffffff;border:1px solid #dfe8ef;border-radius:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="height:6px;background:#4A9FCB;background-image:linear-gradient(90deg,#8ADBD9,#4A9FCB);font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 0"><h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;font-weight:800;color:#2C4560">${titolo}</h1>
<p style="margin:0;font-size:16px;line-height:1.5;color:#4b5a6b">${corpo}</p>${scheda}${riga}</td></tr>
${pulsanti}<tr><td style="padding:8px 28px 28px">${notaHtml}${silenzio}</td></tr>
</table></td></tr>
<tr><td align="center" style="padding:18px 12px 0;font-size:12px;line-height:1.5;color:#8a97a6">Groomly · groomlyapp.it</td></tr>
</table></td></tr></table>
</body></html>`
}

const POSTO_LIBERO: Record<Lingua, { titolo: string; frase: string; fretta: string; link: string }> = {
  it: {
    titolo: 'Si è liberato un posto',
    frase: 'Controlla il calendario della toelettatura per la disponibilità.',
    fretta: 'Affrettati, prima di perdere questa possibilità.',
    link: 'Controlla il calendario',
  },
  en: {
    titolo: 'A place has opened up',
    frase: 'Check the salon calendar for availability.',
    fretta: 'Hurry, before you lose this chance.',
    link: 'Check the calendar',
  },
  es: {
    titolo: 'Se ha liberado un sitio',
    frase: 'Mira el calendario de la peluquería para ver si sigue libre.',
    fretta: 'Date prisa, antes de perder esta posibilidad.',
    link: 'Mirar el calendario',
  },
  fr: {
    titolo: 'Un créneau s’est libéré',
    frase: 'Consultez l’agenda du salon pour voir les disponibilités.',
    fretta: 'Faites vite, avant de perdre cette occasion.',
    link: 'Consulter l’agenda',
  },
  de: {
    titolo: 'Ein Termin ist frei geworden',
    frase: 'Prüfen Sie die Verfügbarkeit im Kalender des Salons.',
    fretta: 'Beeilen Sie sich, bevor diese Möglichkeit weg ist.',
    link: 'Kalender ansehen',
  },
}

const DISISCRIVITI: Record<Lingua, string> = {
  it: 'Disiscriviti',
  en: 'Unsubscribe',
  es: 'Darse de baja',
  fr: 'Se désabonner',
  de: 'Abmelden',
}

export const TITOLO_RISPOSTA: Record<Lingua, string> = {
  it: 'Risposta da Groomly',
  en: 'Reply from Groomly',
  es: 'Respuesta de Groomly',
  fr: 'Réponse de Groomly',
  de: 'Antwort von Groomly',
}

export const PER_CONTINUARE: Record<Lingua, string> = {
  it: 'Per continuare, scrivi a info@groomlyapp.it',
  en: 'To continue, write to info@groomlyapp.it',
  es: 'Para continuar, escribe a info@groomlyapp.it',
  fr: 'Pour continuer, écrivez à info@groomlyapp.it',
  de: 'Für Rückfragen schreiben Sie an info@groomlyapp.it',
}

export function fraseDisiscriviti(lingua: Lingua): string {
  return DISISCRIVITI[lingua]
}

export function fraseSilenzio(lingua: Lingua): string {
  return SILENZIO[lingua]
}

export function mailPostoLibero(input: {
  lingua: Lingua
  nomeSalone: string
  quando: string
  url: string
}): { oggetto: string; testo: string } {
  const voci = POSTO_LIBERO[input.lingua]
  const intestazione = [voci.titolo, input.nomeSalone.trim(), input.quando.trim()].filter(Boolean)
  const testo = [
    intestazione.join('\n'),
    `${voci.frase}\n${voci.fretta}`,
    `${voci.link}${input.lingua === 'fr' ? ' :' : ':'} ${input.url}`,
  ].join('\n\n')
  return { oggetto: voci.titolo, testo }
}

function oggettoAccount(lingua: Lingua, tipo: 'verifica' | 'reset' | 'invito', salone: string): string {
  if (tipo === 'verifica') return OGGETTO_VERIFICA[lingua]
  if (tipo === 'reset') return OGGETTO_RESET[lingua]
  const nome = salone.trim()
  if (!nome) return OGGETTO_INVITO_VUOTO[lingua]
  return OGGETTO_INVITO[lingua](nome)
}

const CORPO_VERIFICA: Record<Lingua, string> = {
  it: 'Ciao e benvenuto! Manca solo un passaggio: tocca il pulsante per confermare il tuo indirizzo, poi torna all’app e inizia a lavorare.',
  en: 'Hi and welcome! Just one more step: tap the button to confirm your address, then go back to the app and get started.',
  es: '¡Hola y bienvenido! Solo falta un paso: toca el botón para confirmar tu dirección, luego vuelve a la app y empieza a trabajar.',
  fr: 'Bonjour et bienvenue ! Plus qu’une étape : touchez le bouton pour confirmer votre adresse, puis revenez dans l’app pour commencer.',
  de: 'Hallo und willkommen! Nur noch ein Schritt: Tippen Sie auf die Schaltfläche, um Ihre Adresse zu bestätigen, und kehren Sie dann zur App zurück.',
}

const CORPO_RESET: Record<Lingua, (account: string) => string> = {
  it: (account) => `Ciao, abbiamo ricevuto una richiesta per reimpostare la password ${account ? `dell’account ${account}` : 'dell’account'}. Tocca il pulsante per sceglierne una nuova. Se non sei stato tu, ignora pure questa email: la password resta quella di prima.`,
  en: (account) => `Hi, we received a request to reset the password for ${account ? `the account ${account}` : 'the account'}. Tap the button to choose a new one. If this wasn't you, you can safely ignore this email: your password will stay the same.`,
  es: (account) => `Hola, hemos recibido una solicitud para restablecer la contraseña de ${account ? `la cuenta ${account}` : 'la cuenta'}. Toca el botón para elegir una nueva. Si no has sido tú, puedes ignorar este correo: tu contraseña seguirá siendo la misma.`,
  fr: (account) => `Bonjour, nous avons reçu une demande de réinitialisation du mot de passe ${account ? `du compte ${account}` : 'du compte'}. Touchez le bouton pour en choisir un nouveau. Si ce n’est pas vous, ignorez simplement cet e-mail : votre mot de passe ne changera pas.`,
  de: (account) => `Hallo, wir haben eine Anfrage erhalten, das Passwort ${account ? `für das Konto ${account}` : 'für das Konto'} zurückzusetzen. Tippen Sie auf die Schaltfläche, um ein neues zu wählen. Wenn Sie das nicht waren, ignorieren Sie diese E-Mail einfach: Ihr Passwort bleibt unverändert.`,
}

const COME_RUOLO: Record<Lingua, string> = { it: 'come', en: 'as', es: 'como', fr: 'en tant que', de: 'als' }

const CORPO_INVITO: Record<Lingua, (nome: string, come: string) => string> = {
  it: (nome, come) => `Ciao! ${nome} ti ha invitato a far parte del team${come}. Tocca il pulsante ed entra con questo stesso indirizzo email. Buon lavoro!`,
  en: (nome, come) => `Hi! ${nome} has invited you to join the team${come}. Tap the button and sign in with this same email address. Enjoy working together!`,
  es: (nome, come) => `¡Hola! ${nome} te ha invitado a unirte al equipo${come}. Toca el botón y entra con esta misma dirección de correo. ¡Buen trabajo!`,
  fr: (nome, come) => `Bonjour ! ${maiuscola(nome)} vous a invité à rejoindre l’équipe${come}. Touchez le bouton et connectez-vous avec cette même adresse e-mail. Bon travail !`,
  de: (nome, come) => `Hallo! ${maiuscola(nome)} hat Sie eingeladen, dem Team${come} beizutreten. Tippen Sie auf die Schaltfläche und melden Sie sich mit derselben E-Mail-Adresse an. Viel Erfolg!`,
}

function corpoInvito(lingua: Lingua, salone: string, ruolo: string): string {
  const nome = saloneNellaFrase(lingua, salone, 'soggetto')
  return CORPO_INVITO[lingua](nome, ruolo ? ` ${COME_RUOLO[lingua]} ${lingua === 'fr' ? ruolo.toLowerCase() : ruolo}` : '')
}

function emailAccount(lingua: Lingua, tipo: 'verifica' | 'reset' | 'invito', dati: DatiEmail): { oggetto: string; html: string } {
  const ruolo = dati.ruolo ? etichettaRuolo(lingua, dati.ruolo) : ''
  const account = escapaHtml((dati.account ?? '').trim())
  const salone = dati.salone ?? ''
  const oggetto = oggettoAccount(lingua, tipo, salone)
  const corpo = tipo === 'verifica' ? CORPO_VERIFICA[lingua] : tipo === 'reset' ? CORPO_RESET[lingua](account) : corpoInvito(lingua, salone, ruolo)
  const url = dati.url ?? 'https://groomlyapp.it/azione/'
  const stileSi = 'display:inline-block;background:#2E7FB0;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:10px'
  const pulsanti = `<tr><td align="center" style="padding:22px 28px 8px"><a href="${escapaHtml(url)}" style="${stileSi}">${BOTTONE_ACCOUNT[tipo][lingua]}</a></td></tr>\n`
  return {
    oggetto,
    html: avvolgi(lingua, escapaHtml(oggetto), corpo, '', '', pulsanti, '', ''),
  }
}

export function emailMessaggio(
  lingua: Lingua,
  tipo: TipoEmail,
  dati: DatiEmail = {},
): { oggetto: string; html: string } {
  if (tipo === 'verifica' || tipo === 'reset' || tipo === 'invito') return emailAccount(lingua, tipo, dati)
  const cliente = dati.cliente ?? ''
  const cane = dati.cane ?? ''
  const salone = dati.salone ?? ''
  const quando = dati.quando ?? ''
  const telefono = dati.telefono ?? ''
  const invece = dati.invece ?? ''
  const entro = dati.entro ?? ''
  const rispondi = dati.rispondi === true
  const oggetto = OGGETTI[lingua][tipo](cane.trim())
  const corpo = corpoCliente(lingua, tipo, { cliente, cane, salone, quando, telefono, invece, entro, rispondi })
  const scheda = (dati.scheda ?? '').trim()
    ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#2C4560">${escapaHtml(dati.scheda ?? '').trim().replaceAll('\n', '<br>')}</p>`
    : ''
  const pezziRiga = [salone.trim() ? escapaHtml(salone.trim()) : '', cane.trim() ? escapaHtml(cane.trim()) : ''].filter(Boolean)
  const riga = pezziRiga.length
    ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#2C4560">${pezziRiga.join(' · ')}</p>`
    : ''
  const stileSi = 'display:inline-block;background:#2E7FB0;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:10px'
  const stileNo = 'display:inline-block;background:#ffffff;color:#9E2F2A;text-decoration:none;font-weight:700;font-size:16px;padding:12px 26px;border:2px solid #9E2F2A;border-radius:10px;margin-left:12px'
  const ancora = (href: string, stile: string, etichetta: string) => `<a href="${escapaHtml(href)}" style="${stile}">${etichetta}</a>`
  let pulsanti = ''
  if (!SENZA_PULSANTE.has(tipo) && dati.url) {
    const etichetta = tipo === 'proposta' ? CONFERMO[lingua] : tipo === 'recensione' ? RECENSIONE_BOTTONE[lingua] : ATTESA_BOTTONE[lingua]
    const secondo = tipo === 'proposta' && dati.urlRifiuta ? ancora(dati.urlRifiuta, stileNo, NON_POSSO[lingua]) : ''
    pulsanti = `<tr><td align="center" style="padding:22px 28px 8px">${ancora(dati.url, stileSi, etichetta)}${secondo}</td></tr>\n`
  }
  const nota = tipo === 'liberato'
    ? NOTA_PAGINA[lingua]
    : NOTA_RISPOSTA_TIPI.has(tipo) && rispondi
      ? NOTA_RISPOSTA[lingua]
      : ''
  const hrefSilenzio = (dati.silenzio ?? '').trim()
  const silenzio = SERVIZI.has(tipo) && hrefSilenzio
    ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.5"><a href="${escapaHtml(hrefSilenzio)}" style="color:#6B7A8C">${SILENZIO[lingua]}</a></p>`
    : ''
  return { oggetto, html: avvolgi(lingua, escapaHtml(oggetto), corpo, scheda, riga, pulsanti, nota, silenzio) }
}
