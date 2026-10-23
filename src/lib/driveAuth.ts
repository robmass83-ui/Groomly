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

export interface DriveAuthPlugin {
  collega(): Promise<DriveAccount>
  leggi(): Promise<DriveAccount>
  scollega(): Promise<void>
  carica(input: DriveCarica): Promise<void>
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

  async wifi(): Promise<{ wifi: boolean }> {
    return { wifi: false }
  }
}

export const DriveAuth = registerPlugin<DriveAuthPlugin>('DriveAuth', {
  web: () => new DriveAuthWeb(),
})
