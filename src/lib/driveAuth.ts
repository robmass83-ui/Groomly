import { registerPlugin, WebPlugin } from '@capacitor/core'

export interface DriveAccount {
  collegato: boolean
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
  collega(): Promise<DriveAccount>
  leggi(): Promise<DriveAccount>
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

  async leggi(): Promise<DriveAccount> {
    return { collegato: false, email: null }
  }

  async scollega(): Promise<void> {
    throw new Error('telefono')
  }

  async carica(): Promise<void> {
    throw new Error('telefono')
  }

  async registro(): Promise<void> {
    throw new Error('telefono')
  }

  async foto(): Promise<void> {
    throw new Error('telefono')
  }

  async programma(): Promise<void> {
    return undefined
  }

  async inCarica(): Promise<{ carica: boolean }> {
    return { carica: false }
  }

  async elenco(): Promise<{ copie: DriveCopia[] }> {
    throw new Error('telefono')
  }

  async scarica(): Promise<void> {
    throw new Error('telefono')
  }

  async wifi(): Promise<{ wifi: boolean }> {
    return { wifi: false }
  }
}

export const DriveAuth = registerPlugin<DriveAuthPlugin>('DriveAuth', {
  web: () => new DriveAuthWeb(),
})
