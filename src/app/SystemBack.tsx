import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { dismissTopOverlay, overlayOpen, systemBackChoice } from '../lib/systemBack'

export function SystemBack() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = useRef(location.pathname)
  path.current = location.pathname

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let handle: PluginListenerHandle | undefined
    let alive = true
    void App.addListener('backButton', (event) => {
      const choice = systemBackChoice(path.current, overlayOpen(), event.canGoBack)
      if (choice === 'dismiss') {
        dismissTopOverlay()
        return
      }
      if (choice === 'dog') {
        navigate('/animali', { replace: true })
        return
      }
      if (choice === 'listino') {
        navigate('/listino', { replace: true })
        return
      }
      if (choice === 'impostazioni') {
        navigate('/impostazioni', { replace: true })
        return
      }
      if (choice === 'incassi') {
        navigate('/incassi', { replace: true })
        return
      }
      if (choice === 'history') {
        window.history.back()
        return
      }
      void App.exitApp()
    }).then((next) => {
      if (!alive) {
        void next.remove()
        return
      }
      handle = next
    })
    return () => {
      alive = false
      void handle?.remove()
    }
  }, [navigate])

  return null
}
