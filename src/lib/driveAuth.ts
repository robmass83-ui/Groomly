import { registerPlugin, WebPlugin } from '@capacitor/core'
import { chiamaPonte, ponteBackup } from './ponteBackup'

export interface DriveAccount {
  collegato: boolean
  proposto?: boolean
  email: string | null
}

export interface DriveCarica {
  cartella: string
  nome: string
  percorso: string
}

export interface DriveCopia {
  id: string
  nome: string
  giorno: string
}

export interface VoceFotoDrive {
  codice: string
  cartella: string
  relativo: string
  fileId: string
  percorso: string
}

export interface DriveAuthPlugin {
  collega(input?: { uid?: string }): Promise<DriveAccount>
  leggi(input?: { uid?: string }): Promise<DriveAccount>
  conferma(input?: { uid?: string }): Promise<DriveAccount>
  scollega(): Promise<void>
  carica(input: DriveCarica): Promise<void>
  registro(input: DriveCarica): Promise<void>
  foto(input: { cartella: string; voci: VoceFotoDrive[] }): Promise<void>
  programma(input: { attivo: boolean; wifi: boolean; carica: boolean; dovuto: number }): Promise<void>
  inCarica(): Promise<{ carica: boolean }>
  elenco(input: { cartella: string }): Promise<{ copie: DriveCopia[] }>
  scarica(input: { cartella: string; id: string }): Promise<void>
  wifi(): Promise<{ wifi: boolean }>
}

class DriveAuthWeb extends WebPlugin implements DriveAuthPlugin {
  async collega(): Promise<DriveAccount> {
    throw new Error('telefono')
  }

  async leggi(input?: { uid?: string }): Promise<DriveAccount> {
    if (ponteBackup()) return chiamaPonte<DriveAccount>('leggi', { uid: input?.uid ?? '' })
    return { collegato: false, proposto: false, email: null }
  }

  async conferma(): Promise<DriveAccount> {
    throw new Error('telefono')
  }

  async scollega(): Promise<void> {
    throw new Error('telefono')
  }

  async carica(input?: DriveCarica): Promise<void> {
    if (ponteBackup()) return chiamaPonte<void>('carica', { ...input })
    throw new Error('telefono')
  }

  async registro(input?: DriveCarica): Promise<void> {
    if (ponteBackup()) return chiamaPonte<void>('registro', { ...input })
    throw new Error('telefono')
  }

  async foto(input?: { cartella: string; voci: VoceFotoDrive[] }): Promise<void> {
    if (ponteBackup()) return chiamaPonte<void>('foto', { ...input })
    throw new Error('telefono')
  }

  async programma(input?: { attivo: boolean; wifi: boolean; carica: boolean; dovuto: number }): Promise<void> {
    if (ponteBackup()) return chiamaPonte<void>('programma', { ...input })
    return undefined
  }

  async inCarica(): Promise<{ carica: boolean }> {
    if (ponteBackup()) return chiamaPonte<{ carica: boolean }>('inCarica')
    return { carica: false }
  }

  async elenco(): Promise<{ copie: DriveCopia[] }> {
    throw new Error('telefono')
  }

  async scarica(): Promise<void> {
    throw new Error('telefono')
  }

  async wifi(): Promise<{ wifi: boolean }> {
    if (ponteBackup()) return chiamaPonte<{ wifi: boolean }>('wifi')
    return { wifi: false }
  }
}

export const DriveAuth = registerPlugin<DriveAuthPlugin>('DriveAuth', {
  web: () => new DriveAuthWeb(),
})
