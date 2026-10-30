import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { applyPlatform } from './theme/theme'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'

const ponte = window.GroomlyBackup

if (ponte) {
  // Android ha aperto Groomly senza schermo solo per il backup automatico.
  void import('./backupNotturno').then(({ backupNotturno }) => backupNotturno(ponte))
} else {
  applyPlatform(Capacitor.isNativePlatform())
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
