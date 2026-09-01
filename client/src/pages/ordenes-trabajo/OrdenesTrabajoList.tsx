import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import type { WorkOrder, Pagination, ChairType } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, Play, Pause, XCircle, Search, RotateCcw as ClearIcon, Clock, CheckCircle2, ClipboardList, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOrdenSillas, getOrdenSillasLabel, getOrdenSillasTotal } from '@/lib/ordenes'
import { GoBack } from '@/components/shared/GoBack'

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  control: 'En control',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const statusTabs: { value: string; label: string; icon: React.ElementType; color?: string }[] = [
  { value: '', label: 'Todas', icon: ClipboardList },
  { value: 'pendiente', label: 'Pendiente', icon: Clock, color: 'text-gray-600' },
  { value: 'en_progreso', label: 'En progreso', icon: Play, color: 'text-blue-600' },
  { value: 'control', label: 'En control', icon: ClipboardCheck, color: 'text-purple-600' },
  { value: 'pausada', label: 'Pausada', icon: Pause, color: 'text-amber-600' },
  { value: 'finalizada', label: 'Finalizada', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'cancelada', label: 'Cancelada', icon: XCircle, color: 'text-destructive' },
]

const statusClass: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700 border-gray-300',
  en_progreso: 'bg-blue-100 text-blue-700 border-blue-300',
  control: 'bg-purple-100 text-purple-700 border-purple-300',
  pausada: 'bg-amber-100 text-amber-700 border-amber-300',
  finalizada: 'bg-green-100 text-green-700 border-green-300',
  cancelada: 'bg-red-100 text-red-700 border-red-300',
}

export default function OrdenesTrabajoList() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [tipoSillaFiltro, setTipoSillaFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery<{ data: WorkOrder[]; pagination: Pagination }>({
    queryKey: ['ordenes-trabajo', estadoFiltro, tipoSillaFiltro, page],
    queryFn: () =>
      api
        .get('/ordenes-trabajo', {
          params: {
            estado: estadoFiltro || undefined,
            chairTypeId: tipoSillaFiltro && tipoSillaFiltro !== 'none' ? tipoSillaFiltro : undefined,
            page,
            limit: 50,
          },
        })
        .then((r) => r.data),
  })

  const { data: tiposData } = useQuery<{ data: ChairType[] }>({
    queryKey: ['tipos-silla', 'filter'],
    queryFn: () => api.get('/tipos-silla', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const { data: countsData } = useQuery<{ data: Record<string, number> }>({
    queryKey: ['ordenes-trabajo', 'counts'],
    queryFn: () => api.get('/ordenes-trabajo/counts').then((r) => r.data),
  })

  const totalCount = useMemo(
    () => Object.values(countsData?.data ?? {}).reduce((sum, n) => sum + n, 0),
    [countsData]
  )

  const ordenesFiltradas = useMemo(() => {
    let rows = data?.data ?? []

    if (tipoSillaFiltro === 'none') {
      rows = rows.filter((ot) => getOrdenSillas(ot).length === 0)
    }

    const term = busqueda.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((ot) => {
      const matchId = ot._id.toLowerCase().includes(term) || ot._id.slice(-6).includes(term)
      const matchSilla = getOrdenSillasLabel(ot).toLowerCase().includes(term)
      return matchId || matchSilla
    })
  }, [data, busqueda, tipoSillaFiltro])

  function clearFilters() {
    setEstadoFiltro('')
    setTipoSillaFiltro('')
    setBusqueda('')
    setPage(1)
  }

  const hasFilters = estadoFiltro || tipoSillaFiltro || busqueda

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <GoBack to="/" />
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Órdenes de trabajo</h1>
        {isAdmin && (
          <Link to="/ordenes-trabajo/nuevo">
            <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus size={16} className="mr-1" /> Nueva orden</Button>
          </Link>
        )}
      </div>

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar las órdenes. Intentá recargar la página.
        </div>
      )}

      <div className="flex border-b flex-wrap">
        {statusTabs.map((tab) => {
          const isActive = estadoFiltro === tab.value
          const count = tab.value === '' ? totalCount : countsData?.data[tab.value] ?? 0
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setEstadoFiltro(tab.value); setPage(1) }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon size={16} className={cn(isActive && tab.color)} />
              <span className={cn(isActive && tab.color)}>{tab.label}</span>
              <span className={cn('text-xs', isActive ? 'opacity-70' : 'text-muted-foreground/70')}>({count})</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID o tipo de silla..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={estadoFiltro} onChange={(e) => { setEstadoFiltro(e.target.value); setPage(1) }} className="w-full lg:w-48">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_progreso">En progreso</option>
          <option value="pausada">Pausada</option>
          <option value="finalizada">Finalizada</option>
          <option value="cancelada">Cancelada</option>
        </Select>
        <Select value={tipoSillaFiltro} onChange={(e) => { setTipoSillaFiltro(e.target.value); setPage(1) }} className="w-full lg:w-56">
          <option value="">Todos los tipos de silla</option>
          {(tiposData?.data ?? []).map((t) => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
          <option value="none">Solo repuestos</option>
        </Select>
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <ClearIcon size={16} className="mr-1" /> Limpiar
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tipo de silla</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Operario</TableHead>
              <TableHead>Creada</TableHead>
              <TableHead className="w-40 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenesFiltradas.map((ot) => {
              return (
                <TableRow key={ot._id}>
                  <TableCell className="text-xs font-mono text-muted-foreground">#{ot._id.slice(-6)}</TableCell>
                  <TableCell className="font-medium">{getOrdenSillasLabel(ot)}</TableCell>
                  <TableCell>{getOrdenSillasTotal(ot)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass[ot.status]}>
                      {statusLabels[ot.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ot.assignedTo ? ot.assignedTo.name : <span className="text-muted-foreground/70">Sin asignar</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(ot.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/ordenes-trabajo/${ot._id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye size={16} /></Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {ordenesFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {hasFilters ? 'No hay órdenes que coincidan con los filtros' : 'Sin órdenes de trabajo'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground py-2">Página {page} de {data.pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
        </div>
      )}
    </div>
  )
}
