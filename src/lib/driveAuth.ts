import { registerPlugin, WebPlugin } from '@capacitor/core'

export interface DriveAccount {
  collegato: boolean
  email: string | null
}

export interface DriveAuthPlugin {
  collega(): Promise<DriveAccount>
  leggi(): Promise<DriveAccount>
  scollega(): Promise<void>
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
}

export const DriveAuth = registerPlugin<DriveAuthPlugin>('DriveAuth', {
  web: () => new DriveAuthWeb(),
})
