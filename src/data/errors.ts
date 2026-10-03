export type AppErrorCode =
  | 'auth_exists'
  | 'auth_invalid'
  | 'auth_crypto'
  | 'storage_corrupt'
  | 'storage_write'
  | 'service_missing'
  | 'service_boundary'

export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(message: string, code: AppErrorCode) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}
