import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute, AdminRoute } from '@/components/layout/ProtectedRoute'
import { Skeleton } from '@/components/ui/skeleton'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const ComponentesList = lazy(() => import('@/pages/componentes/ComponentesList'))
const ComponenteForm = lazy(() => import('@/pages/componentes/ComponenteForm'))
const TiposSillaList = lazy(() => import('@/pages/tipos-silla/TiposSillaList'))
const TipoSillaForm = lazy(() => import('@/pages/tipos-silla/TipoSillaForm'))
const OrdenesTrabajoList = lazy(() => import('@/pages/ordenes-trabajo/OrdenesTrabajoList'))
const OrdenTrabajoForm = lazy(() => import('@/pages/ordenes-trabajo/OrdenTrabajoForm'))
const OrdenTrabajoDetail = lazy(() => import('@/pages/ordenes-trabajo/OrdenTrabajoDetail'))
const IngresoStock = lazy(() => import('@/pages/IngresoStock'))
const UsuariosList = lazy(() => import('@/pages/usuarios/UsuariosList'))
const PerfilForm = lazy(() => import('@/pages/perfil/PerfilForm'))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Skeleton className="h-96" />}>{children}</Suspense>
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <SuspenseWrapper><Login /></SuspenseWrapper>,
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, element: <SuspenseWrapper><Dashboard /></SuspenseWrapper> },
      { path: 'ingreso-stock', element: <SuspenseWrapper><IngresoStock /></SuspenseWrapper> },
      { path: 'componentes', element: <SuspenseWrapper><ComponentesList /></SuspenseWrapper> },
      { path: 'componentes/nuevo', element: <AdminRoute><SuspenseWrapper><ComponenteForm /></SuspenseWrapper></AdminRoute> },
      { path: 'componentes/:id', element: <SuspenseWrapper><ComponenteForm /></SuspenseWrapper> },
      { path: 'tipos-silla', element: <SuspenseWrapper><TiposSillaList /></SuspenseWrapper> },
      { path: 'tipos-silla/nuevo', element: <AdminRoute><SuspenseWrapper><TipoSillaForm /></SuspenseWrapper></AdminRoute> },
      { path: 'tipos-silla/:id', element: <SuspenseWrapper><TipoSillaForm /></SuspenseWrapper> },
      { path: 'ordenes-trabajo', element: <SuspenseWrapper><OrdenesTrabajoList /></SuspenseWrapper> },
      { path: 'ordenes-trabajo/nuevo', element: <ProtectedRoute><AdminRoute><SuspenseWrapper><OrdenTrabajoForm /></SuspenseWrapper></AdminRoute></ProtectedRoute> },
      { path: 'ordenes-trabajo/:id', element: <SuspenseWrapper><OrdenTrabajoDetail /></SuspenseWrapper> },
      { path: 'usuarios', element: <AdminRoute><SuspenseWrapper><UsuariosList /></SuspenseWrapper></AdminRoute> },
      { path: 'perfil', element: <SuspenseWrapper><PerfilForm /></SuspenseWrapper> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
