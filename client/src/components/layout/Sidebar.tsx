import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, Package, ArmchairIcon, ClipboardList, History, LogOut, X,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/componentes', label: 'Componentes', icon: Package },
  { to: '/tipos-silla', label: 'Tipos de silla', icon: ArmchairIcon },
  { to: '/ordenes-trabajo', label: 'Órdenes de trabajo', icon: ClipboardList },
  { to: '/movimientos', label: 'Movimientos', icon: History },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar-background border-r border-sidebar-border transition-transform md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <span className="font-bold text-lg text-sidebar-primary">Stock OC</span>
          <button onClick={onClose} className="md:hidden text-sidebar-foreground cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <p className="text-xs text-sidebar-foreground">
            {user?.name} <span className="capitalize">({user?.role})</span>
          </p>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-sidebar-foreground hover:text-sidebar-primary cursor-pointer"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
