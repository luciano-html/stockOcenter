import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute, AdminRoute } from '@/components/layout/ProtectedRoute'
import { Skeleton } from '@/components/ui/skeleton'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const ComponentesList = lazy(() => import('@/pages/componentes/ComponentesList'))

const TiposSillaList = lazy(() => import('@/pages/tipos-silla/TiposSillaList'))
const TipoSillaForm = lazy(() => import('@/pages/tipos-silla/TipoSillaForm'))
const TipoSillaDetail = lazy(() => import('@/pages/tipos-silla/TipoSillaDetail'))
const OrdenesTrabajoList = lazy(() => import('@/pages/ordenes-trabajo/OrdenesTrabajoList'))
const OrdenTrabajoForm = lazy(() => import('@/pages/ordenes-trabajo/OrdenTrabajoForm'))
const OrdenTrabajoDetail = lazy(() => import('@/pages/ordenes-trabajo/OrdenTrabajoDetail'))
const IngresoStock = lazy(() => import('@/pages/IngresoStock'))
const StockReadOnly = lazy(() => import('@/pages/StockReadOnly'))
const UsuariosList = lazy(() => import('@/pages/usuarios/UsuariosList'))
const PerfilForm = lazy(() => import('@/pages/perfil/PerfilForm'))
const RankingSillas = lazy(() => import('@/pages/ranking/RankingSillas'))
const StockArmadoView = lazy(() => import('@/pages/stock/StockArmadoView'))
const RepartoView = lazy(() => import('@/pages/reparto/RepartoView'))

const ChoferView = lazy(() => import('@/pages/reparto/ChoferView').then(m => ({ default: m.ChoferView })))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Skeleton className="h-96" />}>{children}</Suspense>
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <SuspenseWrapper><Login /></SuspenseWrapper>,
  },
  {
    path: '/modo-chofer/:id',
    element: <ProtectedRoute><SuspenseWrapper><ChoferView /></SuspenseWrapper></ProtectedRoute>,
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, element: <SuspenseWrapper><Dashboard /></SuspenseWrapper> },
      { path: 'ingreso-stock', element: <AdminRoute><SuspenseWrapper><IngresoStock /></SuspenseWrapper></AdminRoute> },
      { path: 'stock', element: <SuspenseWrapper><StockReadOnly /></SuspenseWrapper> },
      { path: 'stock-armado', element: <SuspenseWrapper><StockArmadoView /></SuspenseWrapper> },
      { path: 'componentes', element: <SuspenseWrapper><ComponentesList /></SuspenseWrapper> },

      { path: 'tipos-silla', element: <SuspenseWrapper><TiposSillaList /></SuspenseWrapper> },
      { path: 'tipos-silla/nuevo', element: <AdminRoute><SuspenseWrapper><TipoSillaForm /></SuspenseWrapper></AdminRoute> },
      { path: 'tipos-silla/:id', element: <SuspenseWrapper><TipoSillaDetail /></SuspenseWrapper> },
      { path: 'tipos-silla/:id/editar', element: <AdminRoute><SuspenseWrapper><TipoSillaForm /></SuspenseWrapper></AdminRoute> },
      { path: 'ordenes-trabajo', element: <SuspenseWrapper><OrdenesTrabajoList /></SuspenseWrapper> },
      { path: 'ordenes-trabajo/nuevo', element: <AdminRoute><SuspenseWrapper><OrdenTrabajoForm /></SuspenseWrapper></AdminRoute> },
      { path: 'ordenes-trabajo/:id', element: <SuspenseWrapper><OrdenTrabajoDetail /></SuspenseWrapper> },
      { path: 'ordenes-trabajo/:id/editar', element: <AdminRoute><SuspenseWrapper><OrdenTrabajoForm /></SuspenseWrapper></AdminRoute> },
      { path: 'reparto', element: <SuspenseWrapper><RepartoView /></SuspenseWrapper> },
      { path: 'usuarios', element: <AdminRoute><SuspenseWrapper><UsuariosList /></SuspenseWrapper></AdminRoute> },
      { path: 'perfil', element: <SuspenseWrapper><PerfilForm /></SuspenseWrapper> },
      { path: 'ranking', element: <SuspenseWrapper><RankingSillas /></SuspenseWrapper> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
