import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'

/**
 * Programma notifiche locali sempre inesatte. Con l'orario esatto (predefinito dal plugin 8.3) Android apre da solo
 * la schermata «Sveglie e promemoria» se manca quel permesso: per un promemoria qualche minuto di scarto non conta.
 */
export async function programmaNotifiche(notifiche: LocalNotificationSchema[]) {
  return LocalNotifications.schedule({
    notifications: notifiche.map((notifica) => ({ ...notifica, isExactNotification: false })),
  })
}
