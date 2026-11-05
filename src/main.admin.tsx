import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdminApp } from './app/AdminApp'
import { finisciUscita } from './data/local/uscita'
import { applyPlatform } from './theme/theme'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'

applyPlatform(false)
finisciUscita()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
