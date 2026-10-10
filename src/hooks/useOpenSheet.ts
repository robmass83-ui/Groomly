import { useLocation, useNavigate } from 'react-router-dom'
import { sheetState } from '../lib/sheetRoute'

export function useOpenSheet(): (to: string) => void {
  const navigate = useNavigate()
  const location = useLocation()
  return (to: string) => navigate(to, { state: sheetState(location) })
}
