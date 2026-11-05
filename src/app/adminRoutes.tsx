import type { ReactElement } from 'react'
import { Navigate, useLocation, type RouteObject } from 'react-router-dom'
import { AdminDatiProvider } from '../components/admin/AdminDati'
import { AdminLayout } from '../components/admin/AdminLayout'
import { haParametriVecchi, percorsoAdminDaVecchio, PERCORSO_ADMIN, PERCORSO_ALTRO, PERCORSO_COMUNICAZIONI } from '../lib/percorsoAdmin'
import { AltroPage } from '../pages/admin/AltroPage'
import { AssistenzaPage } from '../pages/admin/AssistenzaPage'
import { BetaPage } from '../pages/admin/BetaPage'
import { ComunicazioniPage } from '../pages/admin/ComunicazioniPage'
import { MetrichePage } from '../pages/admin/MetrichePage'
import { PanoramicaPage } from '../pages/admin/PanoramicaPage'
import { PianiPage } from '../pages/admin/PianiPage'
import { RegistroPage } from '../pages/admin/RegistroPage'
import { RichiestaPage } from '../pages/admin/RichiestaPage'
import { SaloniPage } from '../pages/admin/SaloniPage'
import { SchedaSalonePage } from '../pages/admin/SchedaSalonePage'
import { SistemaPage } from '../pages/admin/SistemaPage'

// I link già inviati: `/admin?tab=…` porta alla rotta nuova.
function IndiceAdmin() {
  const { search } = useLocation()
  if (haParametriVecchi(search)) return <Navigate to={percorsoAdminDaVecchio(search)} replace />
  return <PanoramicaPage />
}

/** Le rotte della Console: le stesse nell'app e sul sito, ognuno con la sua guardia. */
export function adminRoutes(guardia: (pagina: ReactElement) => ReactElement): RouteObject[] {
  return [{
    path: PERCORSO_ADMIN,
    element: guardia(<AdminDatiProvider><AdminLayout /></AdminDatiProvider>),
    children: [
      { index: true, element: <IndiceAdmin /> },
      { path: 'saloni', element: <SaloniPage /> },
      { path: 'saloni/:salonId', element: <SchedaSalonePage /> },
      { path: 'beta', element: <BetaPage /> },
      { path: 'assistenza', element: <AssistenzaPage /> },
      { path: 'assistenza/:id', element: <RichiestaPage /> },
      { path: 'comunicazioni', element: <ComunicazioniPage /> },
      { path: 'piani', element: <PianiPage /> },
      { path: 'metriche', element: <MetrichePage /> },
      { path: 'registro', element: <RegistroPage /> },
      { path: 'sistema', element: <SistemaPage /> },
      { path: PERCORSO_ALTRO, element: <AltroPage /> },
      { path: 'avvisi', element: <Navigate to={PERCORSO_COMUNICAZIONI} replace /> },
      { path: '*', element: <Navigate to={PERCORSO_ADMIN} replace /> },
    ],
  }]
}
