# Glossario delle lingue di Groomly

Le parole da usare sempre uguali in tutta l'app, nelle email, nelle pagine pubbliche e nelle policy. Le colonne inglese e spagnolo riportano ciò che l'app usa già. Un termine nuovo si aggiunge qui, nella stessa modifica che lo usa. Progetto: `docs/superpowers/specs/2026-11-04-cinque-lingue-design.md`.

## Tono

- **Italiano, inglese, spagnolo:** come oggi, si dà del tu.
- **Francese:** *vous* ovunque, frasi brevi e dirette. Spazio insecabile prima di `: ; ? ! %` e dentro le virgolette « ».
- **Tedesco:** *Sie* ovunque, con maiuscola. Virgolette „ “. Niente parole composte inutilmente lunghe se esiste una forma più corta: i pulsanti devono stare a 320 px.
- Le frasi seguono il senso dell'italiano, non la sua forma. Mai traduzione parola per parola.
- Formati: francese `1 234,56 €`, tedesco `1.234,56 €`, data francese `4 novembre 2026`, tedesca `4. November 2026`, ora a 24 ore in entrambe.

## Nomi che non si traducono

Groomly, Go, Plus, Salon, VIP, WhatsApp, Google, Drive, Play.

## Persone e attività

| Italiano | Inglese | Spagnolo | Francese | Tedesco |
|---|---|---|---|---|
| Toelettatura (l'attività) | Grooming salon | Peluquería | Salon de toilettage | Hundesalon |
| Toelettatura (il lavoro) | Grooming | Peluquería | Toilettage | Fellpflege |
| Toelettatore | Groomer | Peluquero canino | Toiletteur | Hundefriseur |
| Salone | Salon | Salón | Salon | Salon |
| Titolare | Owner | Titular | Gérant | Inhaber |
| Socio | Partner | Socio | Associé | Teilhaber |
| Collaboratore | Staff member | Colaborador | Collaborateur | Mitarbeiter |
| Cliente | Client | Cliente | Client | Kunde |
| Team | Team | Equipo | Équipe | Team |

## Animali

| Italiano | Inglese | Spagnolo | Francese | Tedesco |
|---|---|---|---|---|
| Animale | Pet | Mascota | Animal | Tier |
| Animali | Pets | Mascotas | Animaux | Tiere |
| Cane | Dog | Perro | Chien | Hund |
| Gatto | Cat | Gato | Chat | Katze |
| Razza | Breed | Raza | Race | Rasse |
| Taglia | Size | Tamaño | Taille | Größe |
| Mantello | Coat | Pelaje | Pelage | Fell |
| Nodi | Knots | Nudos | Nœuds | Knoten |
| Feltri | Matting | Enredos apelmazados | Bourres | Verfilzungen |
| Muta | Shedding | Muda | Mue | Fellwechsel |
| Bagno | Bath | Baño | Bain | Bad |
| Tosatura | Trim | Corte | Tonte | Schur |
| Stripping | Stripping | Stripping | Épilation | Trimmen |

## App

| Italiano | Inglese | Spagnolo | Francese | Tedesco |
|---|---|---|---|---|
| Appuntamento | Appointment | Cita | Rendez-vous | Termin |
| Agenda | Diary | Agenda | Agenda | Kalender |
| Mensili | Monthly | Mensuales | Mensuels | Monatlich |
| Listino | Price list | Lista de precios | Tarifs | Preisliste |
| Incassi | Earnings | Ingresos | Recettes | Einnahmen |
| Archivio | Archive | Archivo | Archives | Archiv |
| Lista d'attesa | Waiting list | Lista de espera | Liste d'attente | Warteliste |
| Promemoria | Reminder | Recordatorio | Rappel | Erinnerung |
| Prenotazione | Booking | Reserva | Réservation | Buchung |
| Richiesta | Request | Solicitud | Demande | Anfrage |
| Disdetta | Cancellation | Cancelación | Annulation | Stornierung |
| Avvisi | Alerts | Avisos | Alertes | Hinweise |
| Backup | Backup | Copia | Sauvegarde | Backup |
| Servizio | Service | Servicio | Prestation | Leistung |
| Impostazioni | Settings | Ajustes | Réglages | Einstellungen |
| Abbonamento | Subscription | Suscripción | Abonnement | Abo |
| Piano | Plan | Plan | Formule | Tarif |
| Prova | Trial | Prueba | Essai | Testphase |
| Scheda | Record | Ficha | Fiche | Profil |
| Statistiche | Statistics | Estadísticas | Statistiques | Statistik |

Le forme maschili in francese e tedesco (`Gérant`, `Inhaber`, `Kunde`) sono quelle dell'etichetta breve. Nelle frasi si preferisce una forma neutra quando esiste.

## Aggiunte del francese

Termini nati traducendo `fr.ts`. La colonna tedesca si completa con T3.

| Italiano | Inglese | Spagnolo | Francese |
|---|---|---|---|
| Trattamento | Treatment | Tratamiento | Soin |
| Servizio Plus, Servizio Salon (livello del piano) | Plus service | Servicio Plus | Service Plus |
| Disdire un abbonamento | Cancel | Cancelar | Résilier |
| Non venuto | No-show | No vino | Absent |
| Completato (visita) | Completed | Completado | Terminé |
| Chiudere (una visita) | Close | Cerrar | Clôturer |
| Fissare (un appuntamento) | Book | Reservar | Fixer; *da fissare* è *à planifier* |
| Richiamo | Recall | Aviso | Relance |
| Auguri | Greetings | Felicitación | Vœux |
| Pagella | Grooming card | Informe | Bulletin de toilettage |
| Impegno (in agenda) | Commitment | Compromiso | Engagement |
| Partita IVA | VAT number | NIF / CIF | Numéro de TVA |
| Codice fiscale | Tax code | Código fiscal | Numéro fiscal |
| Beta | Beta | Beta | Bêta |
| Feedback (beta) | Feedback | Opinión | Avis; nell'Admin Manager *retours* |

In francese si scrive *e-mail*, al maschile. I pulsanti usano l'infinito (*Enregistrer*), le istruzioni l'imperativo con *vous* (*Saisissez*). L'apostrofo è sempre ’.
## Tedesco: termini aggiunti da T3

Usati in `src/i18n/de.ts`. Le altre lingue restano come sono.

| Italiano | Tedesco | Nota |
|---|---|---|
| Proprietario (dell'animale) | Besitzer | `Inhaber` è solo il titolare del salone |
| Visita | Besuch | |
| Trattamento | Behandlung | Il servizio resta `Leistung` |
| Mensile (la visita) | Monatstermin | Il cane: `Monatshund`. Il cliente: `Monatskunde` |
| Completato | Erledigt | |
| Non venuto | Nicht erschienen | Il fatto: `Nichterscheinen` |
| Da fissare | Zu planen | |
| Da chiudere | Noch offen | L'azione: `Abschließen` |
| Disdire un appuntamento | stornieren | |
| Disdire un abbonamento | kündigen | Stato: `Gekündigt` |
| Impegno (personale) | Verpflichtung | L'appuntamento personale: `Privater Termin` |
| Chiusura del salone | Schließung | |
| Home | Start | La pagina nelle frasi: `Startseite` |
| Attività (i dati del salone) | Betrieb | `Betriebsdaten` |
| Recensione | Bewertung | |
| Tessera fedeltà | Treuekarte | Il premio: `Prämie`. I timbri: `Stempel` |
| Termini d'uso | AGB | Più corto di `Nutzungsbedingungen`. Le policy di T6 usano lo stesso nome |
| Informativa privacy | Datenschutzerklärung | |
| DPA | AVV | Per esteso: `Auftragsverarbeitung` |
| Partita IVA | USt-IdNr. | |
| Codice fiscale | Steuernummer | |
| Ragione sociale | Firmenname | |
| Commercialista | Steuerberatung | |
| Vetrina (dei piani) | Schaufenster | |
| Pagella | Pflegebericht | |
| Richiamo | Folgetermin | |

**Parole lunghe in spazi stretti.** Una parola sola che non entra si può spezzare con il trattino morbido (`­`), invisibile quando c'è posto. Oggi serve solo a `navImpostazioni`, nella barra in basso a 320 px. Le etichette di due parole vanno bene: i pulsanti vanno a capo.
