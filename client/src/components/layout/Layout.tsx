import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/ingreso-stock': 'Ingreso de stock',
  '/componentes': 'Componentes',
  '/tipos-silla': 'Tipos de silla',
  '/ordenes-trabajo': 'Órdenes de trabajo',
  '/usuarios': 'Usuarios',
  '/perfil': 'Mi perfil',
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = titles[location.pathname] ?? 'Stock OC'

  return (
    <div className="flex h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
