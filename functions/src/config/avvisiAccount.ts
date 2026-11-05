import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { TipoAvviso, Traduzioni } from '../../../src/lib/avvisiSistema'
import { erroreServer } from '../erroriServer'

export type AvvisoAccount = {
  tipo: TipoAvviso
  titolo: string
  testo: string
  traduzioni?: Traduzioni
  origine: 'assistenza' | 'comunicazione'
  comunicazioneId?: string
}

/** Un avviso che vede solo questo account, nella stessa lista degli Avvisi di sistema. */
export async function scriviAvvisoAccount(db: Firestore, uid: string, avviso: AvvisoAccount, id?: string): Promise<string> {
  if (uid === '' || uid.includes('/')) throw erroreServer('invalid-argument', 'richiesta_non_valida')
  const raccolta = db.collection(`accounts/${uid}/avvisi`)
  const ref = id ? raccolta.doc(id) : raccolta.doc()
  await ref.set({ ...avviso, creato: FieldValue.serverTimestamp() })
  return ref.id
}
