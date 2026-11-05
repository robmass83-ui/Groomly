import { useEffect, useState } from 'react'

const DESKTOP = '(min-width: 900px)'

function largo(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP).matches
}

/** Da 900 px in su la Console ha il menu fisso a sinistra. */
export function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(largo)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(DESKTOP)
    const cambia = () => setDesktop(media.matches)
    cambia()
    media.addEventListener('change', cambia)
    return () => media.removeEventListener('change', cambia)
  }, [])
  return desktop
}
