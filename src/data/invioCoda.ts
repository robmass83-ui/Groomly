import { unisciRiga, type RigaCoda, type StatoCoda } from '../lib/codaEmail'
import { firebaseEnabled } from './firebase/enabled'
import type { SettingsMain } from './local/settings'

export function conRigaInCoda(settings: SettingsMain, riga: RigaCoda): SettingsMain {
  return {
    ...settings,
    codaEmail: unisciRiga(settings.codaEmail ?? [], riga),
    updatedAt: new Date().toISOString(),
  }
}

export async function inviaRigaAdesso(
  uid: string,
  stamped: SettingsMain,
  id: string,
  save: (settings: SettingsMain) => boolean,
): Promise<{ stato: StatoCoda; motivo: string } | 'locale' | 'errore'> {
  if (uid === '' || !save(stamped)) return 'errore'
  if (!firebaseEnabled()) return 'locale'
  try {
    const { callInviaSubito, saveSettings } = await import('./firebase/client')
    await saveSettings(uid, stamped)
    return await callInviaSubito(id)
  } catch {
    return 'errore'
  }
}
