import type { Lingua } from './lingua'

type Riga = { it: string } & Partial<Record<Lingua, string>>

const ERRORI: Record<string, Riga> = {
  nome_preso: { it: 'Nome già preso', en: 'Name already taken', es: 'Nombre ya usado', fr: 'Nom déjà pris', de: 'Name schon vergeben' },
  scegli_cane: { it: 'Scegli un cane', en: 'Choose a dog', es: 'Elige un perro', fr: 'Choisissez un chien', de: 'Wählen Sie einen Hund' },
  email_valida: { it: 'Inserisci un’email valida', en: 'Enter a valid email address', es: 'Introduce un correo válido', fr: 'Saisissez une adresse e-mail valide', de: 'Geben Sie eine gültige E-Mail-Adresse ein' },
  invio: { it: 'Invio non riuscito', en: 'Couldn’t send', es: 'No se ha podido enviar', fr: 'Envoi impossible', de: 'Senden fehlgeschlagen' },
  solo_inglese: { it: 'Solo italiano', en: 'English only' },
  solo_italiano: { it: 'Solo italiano' },
  generico: { it: 'Qualcosa non ha funzionato', en: 'Something went wrong', es: 'Algo no ha funcionado', fr: 'Une erreur est survenue', de: 'Etwas ist schiefgelaufen' },
}

export function fraseErrore(lingua: Lingua, codice: string, valori: ValoriErrore = {}): string {
  const riga = ERRORI[codice] ?? (ERRORI_SERVER as Record<string, Riga>)[codice] ?? ERRORI.generico
  const frase = riga[lingua] || riga.en || riga.it
  return frase.replace(/\{\{(\w+)\}\}/g, (segnaposto, nome: string) => (nome in valori ? String(valori[nome]) : segnaposto))
}

// Lingue T5
// I codici che le functions mettono in `details.codice`. Contratto: docs/superpowers/specs/2026-11-04-lingue-server-design.md.
export type ValoriErrore = Record<string, string | number>

const ERRORI_SERVER = {
  accesso_richiesto: { it: 'Accesso richiesto', en: 'Please sign in', es: 'Inicia sesión', fr: 'Connexion requise', de: 'Anmeldung erforderlich' },
  accesso_negato: { it: 'Accesso negato', en: 'Access denied', es: 'Acceso denegado', fr: 'Accès refusé', de: 'Zugriff verweigert' },
  email_non_confermata: { it: 'Conferma prima la tua email', en: 'Please confirm your email first', es: 'Confirma primero tu correo', fr: 'Confirmez d’abord votre e-mail', de: 'Bitte bestätigen Sie zuerst Ihre E-Mail' },
  richiesta_non_valida: { it: 'Richiesta non valida', en: 'Invalid request', es: 'Solicitud no válida', fr: 'Demande non valide', de: 'Ungültige Anfrage' },
  riconferma_richiesta: { it: 'Conferma la password per continuare', en: 'Confirm your password to continue', es: 'Confirma tu contraseña para continuar', fr: 'Confirmez votre mot de passe pour continuer', de: 'Bestätigen Sie Ihr Passwort, um fortzufahren' },
  autore_assente: { it: 'L’account di chi ha scritto non esiste più', en: 'The account of the person who wrote no longer exists', es: 'La cuenta de quien escribió ya no existe', fr: 'Le compte de la personne qui a écrit n’existe plus', de: 'Das Konto der Person, die geschrieben hat, gibt es nicht mehr' },
  invio_in_corso: { it: 'Invio ancora in corso', en: 'Still sending', es: 'Envío aún en curso', fr: 'Envoi toujours en cours', de: 'Versand läuft noch' },
  email_limite: { it: 'Limite di email di oggi raggiunto', en: 'Today’s email limit has been reached', es: 'Se ha alcanzado el límite de correos de hoy', fr: 'La limite d’e-mails du jour est atteinte', de: 'Das heutige E-Mail-Limit ist erreicht' },
  troppe_richieste: { it: 'Troppe richieste', en: 'Too many requests', es: 'Demasiadas solicitudes', fr: 'Trop de demandes', de: 'Zu viele Anfragen' },
  attendi_riprova: { it: 'Aspetta un momento e riprova', en: 'Wait a moment and try again', es: 'Espera un momento y vuelve a intentarlo', fr: 'Patientez un instant et réessayez', de: 'Bitte warten Sie kurz und versuchen Sie es erneut' },
  dispositivo_non_valido: { it: 'Dispositivo non valido', en: 'Invalid device', es: 'Dispositivo no válido', fr: 'Appareil non valide', de: 'Ungültiges Gerät' },
  riga_assente: { it: 'Riga assente', en: 'Entry not found', es: 'Línea no encontrada', fr: 'Ligne introuvable', de: 'Eintrag nicht gefunden' },
  ricerca_non_riuscita: { it: 'Ricerca non riuscita', en: 'Search failed', es: 'No se ha podido buscar', fr: 'La recherche a échoué', de: 'Suche fehlgeschlagen' },
  troppe_ricerche: { it: 'Troppe ricerche oggi', en: 'Too many searches today', es: 'Demasiadas búsquedas hoy', fr: 'Trop de recherches aujourd’hui', de: 'Heute zu viele Suchanfragen' },

  prenotazioni_spente: { it: 'Prenotazioni spente', en: 'Bookings are turned off', es: 'Las reservas están desactivadas', fr: 'Les réservations sont désactivées', de: 'Buchungen sind deaktiviert' },
  orario_non_disponibile: { it: 'Orario non disponibile', en: 'Time not available', es: 'Horario no disponible', fr: 'Horaire non disponible', de: 'Uhrzeit nicht verfügbar' },
  servizio_non_valido: { it: 'Servizio non valido', en: 'Invalid service', es: 'Servicio no válido', fr: 'Prestation non valide', de: 'Ungültige Leistung' },
  foto_non_valida: { it: 'Foto non valida', en: 'Invalid photo', es: 'Foto no válida', fr: 'Photo non valide', de: 'Ungültiges Foto' },
  prezzo_non_accettato: { it: 'Conferma di aver letto che il prezzo è indicativo', en: 'Please confirm you have read that the price is an estimate', es: 'Confirma que has leído que el precio es orientativo', fr: 'Confirmez avoir lu que le prix est indicatif', de: 'Bitte bestätigen Sie, dass der Preis ein Richtwert ist' },
  razza_obbligatoria: { it: 'Razza obbligatoria', en: 'Breed is required', es: 'La raza es obligatoria', fr: 'La race est obligatoire', de: 'Rasse ist erforderlich' },
  animale_non_accettato: { it: 'Questo salone non accetta questo animale', en: 'This salon doesn’t accept this animal', es: 'Esta peluquería no acepta este animal', fr: 'Ce salon n’accepte pas cet animal', de: 'Dieser Salon nimmt dieses Tier nicht an' },
  consenso_mancante: { it: 'Serve il consenso', en: 'Your consent is required', es: 'Hace falta tu consentimiento', fr: 'Votre consentement est nécessaire', de: 'Ihre Einwilligung ist erforderlich' },
  nome_non_valido: { it: 'Nome non valido', en: 'Invalid name', es: 'Nombre no válido', fr: 'Nom non valide', de: 'Ungültiger Name' },
  telefono_non_valido: { it: 'Telefono non valido', en: 'Invalid phone number', es: 'Teléfono no válido', fr: 'Téléphone non valide', de: 'Ungültige Telefonnummer' },
  email_obbligatoria: { it: 'Email obbligatoria', en: 'Email is required', es: 'El correo es obligatorio', fr: 'L’e-mail est obligatoire', de: 'E-Mail ist erforderlich' },
  pagina_assente: { it: 'Pagina assente', en: 'Page not found', es: 'Página no encontrada', fr: 'Page introuvable', de: 'Seite nicht gefunden' },
  email_disiscritta: { it: 'Il cliente ha chiesto di non ricevere email', en: 'The client asked not to receive emails', es: 'El cliente ha pedido no recibir correos', fr: 'Le client a demandé à ne pas recevoir d’e-mails', de: 'Der Kunde möchte keine E-Mails erhalten' },
  link_non_valido: { it: 'Link non valido', en: 'Invalid link', es: 'Enlace no válido', fr: 'Lien non valide', de: 'Ungültiger Link' },
  cane_assente: { it: 'Cane assente', en: 'Pet not found', es: 'Mascota no encontrada', fr: 'Animal introuvable', de: 'Tier nicht gefunden' },

  richiesta_assente: { it: 'Richiesta assente', en: 'Request not found', es: 'Solicitud no encontrada', fr: 'Demande introuvable', de: 'Anfrage nicht gefunden' },
  prova_non_disponibile: { it: 'Prova non disponibile', en: 'Trial not available', es: 'Prueba no disponible', fr: 'Essai non disponible', de: 'Testphase nicht verfügbar' },
  piano_vip_attivo: { it: 'Il piano VIP resta attivo', en: 'The VIP plan stays active', es: 'El plan VIP sigue activo', fr: 'La formule VIP reste active', de: 'Der VIP-Tarif bleibt aktiv' },
  motivo_piano: { it: 'Scrivi il motivo, da 1 a 400 caratteri', en: 'Write the reason, 1 to 400 characters', es: 'Escribe el motivo, de 1 a 400 caracteres', fr: 'Indiquez le motif, de 1 à 400 caractères', de: 'Geben Sie den Grund an, 1 bis 400 Zeichen' },
  account_non_eliminabile: { it: 'Questo account non si può eliminare', en: 'This account can’t be deleted', es: 'Esta cuenta no se puede eliminar', fr: 'Ce compte ne peut pas être supprimé', de: 'Dieses Konto kann nicht gelöscht werden' },
  salone_non_eliminabile: { it: 'Questa toelettatura non si può eliminare', en: 'This grooming salon can’t be deleted', es: 'Esta peluquería no se puede eliminar', fr: 'Ce salon de toilettage ne peut pas être supprimé', de: 'Dieser Hundesalon kann nicht gelöscht werden' },

  pro_non_attivo: { it: 'Pro non è attivo', en: 'Plus is not active', es: 'Plus no está activo', fr: 'Plus n’est pas actif', de: 'Plus ist nicht aktiv' },
  posti_esauriti: { it: 'Posti esauriti', en: 'No seats left', es: 'No quedan plazas', fr: 'Plus de places disponibles', de: 'Keine Plätze mehr frei' },
  email_gia_nel_salone: { it: 'Questa email è già nel salone', en: 'This email is already in the salon', es: 'Este correo ya está en la peluquería', fr: 'Cet e-mail est déjà dans le salon', de: 'Diese E-Mail ist bereits im Salon' },
  email_non_invitabile: { it: 'Questa email non si può invitare', en: 'This email can’t be invited', es: 'Este correo no se puede invitar', fr: 'Cet e-mail ne peut pas être invité', de: 'Diese E-Mail kann nicht eingeladen werden' },
  invito_non_valido: { it: 'Invito non valido', en: 'Invalid invitation', es: 'Invitación no válida', fr: 'Invitation non valide', de: 'Ungültige Einladung' },
  invito_scaduto: { it: 'Invito scaduto', en: 'Invitation expired', es: 'Invitación caducada', fr: 'Invitation expirée', de: 'Einladung abgelaufen' },
  invito_altra_email: { it: 'Questo invito è per un’altra email', en: 'This invitation is for another email', es: 'Esta invitación es para otro correo', fr: 'Cette invitation concerne un autre e-mail', de: 'Diese Einladung gilt für eine andere E-Mail' },
  invito_conferma_email: { it: 'Conferma la tua email per accettare l’invito', en: 'Confirm your email to accept the invitation', es: 'Confirma tu correo para aceptar la invitación', fr: 'Confirmez votre e-mail pour accepter l’invitation', de: 'Bestätigen Sie Ihre E-Mail, um die Einladung anzunehmen' },
  invito_account_con_salone: { it: 'Questo account ha già un salone', en: 'This account already has a salon', es: 'Esta cuenta ya tiene una peluquería', fr: 'Ce compte a déjà un salon', de: 'Dieses Konto hat bereits einen Salon' },
  invito_aggiorna_app: { it: "Aggiorna l'app per accettare l'invito", en: 'Update the app to accept the invitation', es: 'Actualiza la app para aceptar la invitación', fr: 'Mettez à jour l’app pour accepter l’invitation', de: 'Aktualisieren Sie die App, um die Einladung anzunehmen' },
  invito_non_in_sospeso: { it: 'Invito non più in sospeso', en: 'This invitation is no longer pending', es: 'Esta invitación ya no está pendiente', fr: 'Cette invitation n’est plus en attente', de: 'Diese Einladung ist nicht mehr offen' },
  revoca_titolare: { it: 'Non puoi revocare il titolare', en: 'You can’t remove the owner', es: 'No puedes revocar al titular', fr: 'Vous ne pouvez pas retirer le gérant', de: 'Der Inhaber kann nicht entfernt werden' },

  beta_risposta_non_valida: { it: 'Risposta non valida: riprova', en: 'Invalid answer: try again', es: 'Respuesta no válida: inténtalo de nuevo', fr: 'Réponse non valide : réessayez', de: 'Ungültige Antwort: Bitte erneut versuchen' },
  beta_solo_titolare: { it: 'Solo il titolare può rispondere all’invito', en: 'Only the owner can answer the invitation', es: 'Solo el titular puede responder a la invitación', fr: 'Seul le gérant peut répondre à l’invitation', de: 'Nur der Inhaber kann auf die Einladung antworten' },
  beta_invito_non_valido: { it: 'Questo invito non è più valido', en: 'This invitation is no longer valid', es: 'Esta invitación ya no es válida', fr: 'Cette invitation n’est plus valide', de: 'Diese Einladung ist nicht mehr gültig' },
  beta_invito_scaduto: { it: 'Questo invito è scaduto', en: 'This invitation has expired', es: 'Esta invitación ha caducado', fr: 'Cette invitation a expiré', de: 'Diese Einladung ist abgelaufen' },
  beta_gia_vip: { it: 'Hai già il piano Salon omaggio: l’invito non serve', en: 'You already have the free Salon plan: you don’t need the invitation', es: 'Ya tienes el plan Salon de regalo: no necesitas la invitación', fr: 'Vous avez déjà la formule Salon offerte : l’invitation n’est pas nécessaire', de: 'Sie haben den Salon-Tarif bereits geschenkt: Die Einladung ist nicht nötig' },
  beta_gia_piano: { it: 'Hai già un piano attivo: l’invito non serve', en: 'You already have an active plan: you don’t need the invitation', es: 'Ya tienes un plan activo: no necesitas la invitación', fr: 'Vous avez déjà une formule active : l’invitation n’est pas nécessaire', de: 'Sie haben bereits einen aktiven Tarif: Die Einladung ist nicht nötig' },
  beta_feedback_non_valido: { it: 'Controlla le risposte e riprova', en: 'Check your answers and try again', es: 'Revisa las respuestas y vuelve a intentarlo', fr: 'Vérifiez vos réponses et réessayez', de: 'Prüfen Sie Ihre Antworten und versuchen Sie es erneut' },
  beta_feedback_ruolo: { it: 'Il feedback lo mandano il titolare o il socio', en: 'Feedback is sent by the owner or a partner', es: 'La opinión la envían el titular o el socio', fr: 'L’avis est envoyé par le gérant ou un associé', de: 'Feedback senden der Inhaber oder ein Teilhaber' },
  beta_feedback_solo_beta: { it: 'Il feedback è per chi ha provato la beta', en: 'Feedback is for those who tried the beta', es: 'La opinión es para quien ha probado la beta', fr: 'L’avis est réservé à ceux qui ont essayé la bêta', de: 'Feedback ist für alle, die die Beta getestet haben' },
  beta_feedback_limite: { it: 'Hai già mandato 5 feedback oggi: riprova domani', en: 'You’ve already sent 5 feedbacks today: try again tomorrow', es: 'Hoy ya has enviado 5 opiniones: vuelve a intentarlo mañana', fr: 'Vous avez déjà envoyé 5 avis aujourd’hui : réessayez demain', de: 'Sie haben heute bereits 5-mal Feedback gesendet: Versuchen Sie es morgen erneut' },

  impostazione_non_valida: { it: 'Impostazione non valida', en: 'Invalid setting', es: 'Ajuste no válido', fr: 'Réglage non valide', de: 'Ungültige Einstellung' },
  testo_troppo_lungo: { it: 'Testo troppo lungo', en: 'Text too long', es: 'Texto demasiado largo', fr: 'Texte trop long', de: 'Text zu lang' },
  valore_non_valido: { it: 'Valore non valido', en: 'Invalid value', es: 'Valor no válido', fr: 'Valeur non valide', de: 'Ungültiger Wert' },
  durata_non_valida: { it: 'Durata non valida', en: 'Invalid duration', es: 'Duración no válida', fr: 'Durée non valide', de: 'Ungültige Dauer' },
  salone_non_trovato: { it: 'Salone non trovato', en: 'Salon not found', es: 'Peluquería no encontrada', fr: 'Salon introuvable', de: 'Salon nicht gefunden' },
  beta_non_in_corso: { it: 'La beta non è in corso', en: 'The beta is not running', es: 'La beta no está en curso', fr: 'La bêta n’est pas en cours', de: 'Die Beta läuft nicht' },
  beta_gia_finita: { it: 'La beta è già finita', en: 'The beta has already ended', es: 'La beta ya ha terminado', fr: 'La bêta est déjà terminée', de: 'Die Beta ist bereits beendet' },
  beta_massimo_giorni: { it: 'Al massimo 365 giorni da oggi', en: 'At most 365 days from today', es: 'Como máximo 365 días desde hoy', fr: '365 jours maximum à partir d’aujourd’hui', de: 'Höchstens 365 Tage ab heute' },
  beta_niente_da_revocare: { it: 'Niente da revocare', en: 'Nothing to revoke', es: 'Nada que revocar', fr: 'Rien à révoquer', de: 'Nichts zu widerrufen' },
  controllo_non_superato: { it: 'Controllo non superato', en: 'Check not passed', es: 'Control no superado', fr: 'Contrôle non réussi', de: 'Prüfung nicht bestanden' },
  abbonamenti_gia_attivi: { it: 'Abbonamenti già attivi', en: 'Subscriptions already active', es: 'Suscripciones ya activas', fr: 'Abonnements déjà actifs', de: 'Abos bereits aktiv' },
  annuncio_giorni_minimi: { it: 'Almeno {{n}} giorni dopo oggi', en: 'At least {{n}} days from today', es: 'Al menos {{n}} días después de hoy', fr: 'Au moins {{n}} jours après aujourd’hui', de: 'Mindestens {{n}} Tage nach heute' },
  scrivi_parola: { it: 'Scrivi {{parola}}', en: 'Type {{parola}}', es: 'Escribe {{parola}}', fr: 'Saisissez {{parola}}', de: 'Geben Sie {{parola}} ein' },
} as const satisfies Record<string, Record<Lingua, string>>

/** I codici che il server può mandare: quelli nuovi e i tre che `ERRORI` aveva già. */
export type CodiceErrore = keyof typeof ERRORI_SERVER | 'email_valida' | 'invio' | 'nome_preso'

export const CODICI_SERVER = [...Object.keys(ERRORI_SERVER), 'email_valida', 'invio', 'nome_preso'] as CodiceErrore[]

/** Le decisioni condivise col client (`src/lib`) rispondono con la frase italiana: qui si ritrova il suo codice. */
export function codiceDaMessaggio(messaggio: string): CodiceErrore | null {
  return CODICI_SERVER.find((codice) => fraseErrore('it', codice) === messaggio) ?? null
}

/** Il codice di un errore di callable. Null per gli errori senza codice: rete, `INTERNAL`, functions vecchie. */
export function codiceErroreServer(errore: unknown): { codice: string; valori?: ValoriErrore } | null {
  const dettagli = errore && typeof errore === 'object' && 'details' in errore ? errore.details : null
  if (!dettagli || typeof dettagli !== 'object' || !('codice' in dettagli) || typeof dettagli.codice !== 'string') return null
  const valori = 'valori' in dettagli && dettagli.valori && typeof dettagli.valori === 'object' ? dettagli.valori as ValoriErrore : undefined
  return { codice: dettagli.codice, ...(valori ? { valori } : {}) }
}
