import { registerPlugin, WebPlugin, type PluginListenerHandle } from '@capacitor/core'

export type InstallOpened = 'installer' | 'settings' | 'none'

export interface AppInstallerPlugin {
  downloadAndInstall(options: { url: string }): Promise<{ opened: 'installer' | 'settings' }>
  installDownloaded(): Promise<{ opened: InstallOpened }>
  cancel(): Promise<void>
  addListener(event: 'progress', listener: (event: { received: number; total: number }) => void): Promise<PluginListenerHandle>
  addListener(event: 'resume', listener: (event: { opened: 'installer' | 'settings' }) => void): Promise<PluginListenerHandle>
}

class AppInstallerWeb extends WebPlugin implements AppInstallerPlugin {
  async downloadAndInstall(): Promise<{ opened: 'installer' | 'settings' }> {
    throw new Error('unavailable')
  }

  async installDownloaded(): Promise<{ opened: InstallOpened }> {
    return { opened: 'none' }
  }

  async cancel(): Promise<void> {}
}

export const AppInstaller = registerPlugin<AppInstallerPlugin>('AppInstaller', {
  web: () => new AppInstallerWeb(),
})
