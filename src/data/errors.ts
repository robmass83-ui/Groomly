import { frase } from '../i18n/frase'
import type { Chiave } from '../i18n/t'

export type AppErrorCode =
  | 'auth_exists'
  | 'auth_email_taken'
  | 'auth_invalid'
  | 'auth_offline'
  | 'backup_offline'
  | 'auth_slow'
  | 'auth_crypto'
  | 'storage_corrupt'
  | 'storage_write'
  | 'service_missing'
  | 'service_boundary'
  | 'dog_missing'
  | 'appointment_missing'
  | 'file_too_large'
  | 'file_missing'

export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(message: string, code: AppErrorCode) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

const FRASI: Record<AppErrorCode, Chiave> = {
  auth_exists: 'authExists',
  auth_email_taken: 'authTaken',
  auth_invalid: 'authWrong',
  auth_offline: 'impConnessione',
  backup_offline: 'errBackupConnessione',
  auth_slow: 'authSlow',
  auth_crypto: 'authCrypto',
  storage_corrupt: 'errDatiLocali',
  storage_write: 'authSalvataggio',
  service_missing: 'errServizioAssente',
  service_boundary: 'errEstremoLista',
  dog_missing: 'errCaneAssente',
  appointment_missing: 'appAssente',
  file_too_large: 'lisFileGrande',
  file_missing: 'lisFileChiuso',
}

/** L'errore con il testo nella lingua dell'app. */
export function erroreApp(code: AppErrorCode): AppError {
  return new AppError(frase(FRASI[code]), code)
}
