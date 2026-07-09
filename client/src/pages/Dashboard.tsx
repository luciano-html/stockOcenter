import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { WorkOrder, StockResumen, StockMovement } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Package, AlertTriangle, ClipboardList, TrendingUp, Armchair, AlertCircle } from 'lucide-react'
import StockMovementsTable from '@/components/movements/StockMovementsTable'

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const statusClass: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700 border-gray-300',
  en_progreso: 'bg-blue-100 text-blue-700 border-blue-300',
  pausada: 'bg-amber-100 text-amber-700 border-amber-300',
  finalizada: 'bg-green-100 text-green-700 border-green-300',
  cancelada: 'bg-red-100 text-red-700 border-red-300',
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const { data: resumenData, isLoading: resumenLoading, isError: resumenError } = useQuery<{ data: StockResumen }>({
    queryKey: ['stock-resumen'],
    queryFn: () => api.get('/stock/resumen').then((r) => r.data),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const { data: ordenesData, isLoading: ordenesLoading, isError: ordenesError } = useQuery<{ data: WorkOrder[] }>({
    queryKey: ['ordenes-trabajo-dash'],
    queryFn: () => api.get('/ordenes-trabajo', { params: { limit: 100 } }).then((r) => r.data),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const { data: movimientosHoy, isError: movimientosHoyError } = useQuery<{ data: StockMovement[] }>({
    queryKey: ['movimientos-hoy'],
    queryFn: () =>
      api
        .get('/stock/movimientos', { params: { tipo: 'ingreso', desde: startOfToday(), limit: 100 } })
        .then((r) => r.data),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const { data: movimientosRecientes } = useQuery<{ data: StockMovement[] }>({
    queryKey: ['movimientos-recent'],
    queryFn: () => api.get('/stock/movimientos', { params: { limit: 10 } }).then((r) => r.data),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const stockBajoCount = useMemo(
    () => (resumenData?.data.componentes ?? []).filter((c: { stockBajo?: boolean }) => c.stockBajo).length,
    [resumenData]
  )

  const sillasPosiblesTotal = useMemo(
    () => (resumenData?.data.sillasPosibles ?? []).reduce((sum: number, s: { sillasPosibles?: number }) => sum + (s.sillasPosibles ?? 0), 0),
    [resumenData]
  )

  const ordenesActivas = useMemo(
    () => (ordenesData?.data ?? []).filter((o) => ['pendiente', 'en_progreso', 'pausada'].includes(o.status)).length,
    [ordenesData]
  )

  const ingresosHoyTotal = useMemo(
    () => (movimientosHoy?.data ?? []).reduce((sum, m) => sum + m.quantity, 0),
    [movimientosHoy]
  )

  const ordenesPorEstado = useMemo(() => {
    const groups: Record<string, WorkOrder[]> = {
      pendiente: [],
      en_progreso: [],
      pausada: [],
      finalizada: [],
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const o of ordenesData?.data ?? []) {
      if (groups[o.status]) {
        if (o.status === 'finalizada') {
          const finalized = o.finalizedAt ? new Date(o.finalizedAt) : null
          if (finalized && finalized >= today) {
            groups[o.status].push(o)
          }
        } else {
          groups[o.status].push(o)
        }
      }
    }
    return groups
  }, [ordenesData])

  const kpis = [
    { label: 'Stock bajo', value: stockBajoCount, icon: AlertTriangle, href: '/componentes', color: 'text-destructive', bg: 'bg-red-50' },
    { label: 'Órdenes activas', value: ordenesActivas, icon: ClipboardList, href: '/ordenes-trabajo', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Ingresos hoy', value: ingresosHoyTotal, icon: TrendingUp, href: '/ingreso-stock', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Sillas posibles', value: sillasPosiblesTotal, icon: Armchair, href: '/tipos-silla', color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  if (resumenLoading || ordenesLoading) return <Skeleton className="h-96" />

  const hasError = resumenError || ordenesError || movimientosHoyError

  return (
    <div className="space-y-6">
      {hasError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} />
          <span>Hubo un error al cargar algunos datos. Intentá recargar la página.</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Link to="/tipos-silla/nuevo">
              <Button variant="outline" size="sm"><Plus size={16} className="mr-1" /> Silla</Button>
            </Link>
            <Link to="/componentes/nuevo">
              <Button variant="outline" size="sm"><Package size={16} className="mr-1" /> Componente</Button>
            </Link>
            <Link to="/ordenes-trabajo/nuevo">
              <Button variant="outline" size="sm"><ClipboardList size={16} className="mr-1" /> Orden</Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} to={kpi.href} className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  </div>
                  <div className={`p-2 rounded-full ${kpi.bg}`}>
                    <kpi.icon size={20} className={kpi.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {(['pendiente', 'en_progreso', 'pausada', 'finalizada'] as const).map((status) => (
          <Card key={status} className="flex flex-col max-h-[520px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{statusLabels[status]}</span>
                <Badge variant="outline" className={statusClass[status]}>
                  {ordenesPorEstado[status].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 pt-0">
              {ordenesPorEstado[status].length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin órdenes</p>
              )}
              {ordenesPorEstado[status].map((ot) => (
                <Link key={ot._id} to={`/ordenes-trabajo/${ot._id}`}>
                  <div className="border rounded-lg p-3 hover:bg-muted transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-muted-foreground">OT #{ot._id.slice(-6)}</span>
                      <span className="text-xs text-muted-foreground">x{ot.quantity}</span>
                    </div>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {ot.chairTypeId?.name ?? 'Solo repuestos'}
                    </p>
                    {status === 'finalizada' && ot.finalizedAt && (
                      <p className="text-xs text-muted-foreground mt-1">{formatShortDate(ot.finalizedAt)}</p>
                    )}
                    {status !== 'finalizada' && (
                      <p className="text-xs text-muted-foreground mt-1">{formatShortDate(ot.createdAt)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <StockMovementsTable movements={movimientosRecientes?.data ?? []} compact />
        </CardContent>
      </Card>
    </div>
  )
}
