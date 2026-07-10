import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import type { WorkOrder, Pagination, ChairType, AxiosErrorType } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Eye, Play, Pause, RotateCcw, XCircle, Search, RotateCcw as ClearIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GoBack } from '@/components/shared/GoBack'

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

const actionConfig: Record<string, { next: string; label: string; icon: typeof Play; variant: 'default' | 'secondary' | 'destructive' | 'outline' }[]> = {
  pendiente: [
    { next: 'en_progreso', label: 'Iniciar', icon: Play, variant: 'default' },
    { next: 'cancelada', label: 'Cancelar', icon: XCircle, variant: 'destructive' },
  ],
  en_progreso: [
    { next: 'pausada', label: 'Pausar', icon: Pause, variant: 'secondary' },
    { next: 'cancelada', label: 'Cancelar', icon: XCircle, variant: 'destructive' },
  ],
  pausada: [
    { next: 'en_progreso', label: 'Reanudar', icon: RotateCcw, variant: 'default' },
    { next: 'cancelada', label: 'Cancelar', icon: XCircle, variant: 'destructive' },
  ],
}

export default function OrdenesTrabajoList() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [tipoSillaFiltro, setTipoSillaFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [confirmAction, setConfirmAction] = useState<{ id: string; next: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const { data, isLoading, isError } = useQuery<{ data: WorkOrder[]; pagination: Pagination }>({
    queryKey: ['ordenes-trabajo', estadoFiltro, tipoSillaFiltro, page],
    queryFn: () =>
      api
        .get('/ordenes-trabajo', {
          params: {
            estado: estadoFiltro || undefined,
            chairTypeId: tipoSillaFiltro || undefined,
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

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/ordenes-trabajo/${id}/estado`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['componentes'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo-dash'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos-recent'] })
      setConfirmAction(null)
      setErrorMsg('')
    },
    onError: (err: AxiosErrorType) => {
      setConfirmAction(null)
      setErrorMsg(err?.response?.data?.error?.message ?? 'Error al cambiar el estado')
      setTimeout(() => setErrorMsg(''), 5000)
    },
  })

  const ordenesFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return data?.data ?? []
    return (data?.data ?? []).filter((ot) => {
      const matchId = ot._id.toLowerCase().includes(term) || ot._id.slice(-6).includes(term)
      const matchSilla = ot.chairTypeId?.name?.toLowerCase().includes(term)
      return matchId || matchSilla
    })
  }, [data, busqueda])

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
      <GoBack />
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
      {errorMsg && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

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
              <TableHead>Creada</TableHead>
              <TableHead className="w-40 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenesFiltradas.map((ot) => {
              const actions = actionConfig[ot.status] ?? []
              return (
                <TableRow key={ot._id}>
                  <TableCell className="text-xs font-mono text-muted-foreground">#{ot._id.slice(-6)}</TableCell>
                  <TableCell className="font-medium">{ot.chairTypeId?.name ?? 'Solo repuestos'}</TableCell>
                  <TableCell>{ot.quantity}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass[ot.status]}>
                      {statusLabels[ot.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(ot.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {isAdmin && actions.map((action) => (
                        <Button
                          key={action.next}
                          variant={action.variant}
                          size="icon"
                          className={cn(
                            'h-8 w-8',
                            action.variant === 'default' && 'bg-green-600 hover:bg-green-700 text-white'
                          )}
                          onClick={() => setConfirmAction({ id: ot._id, next: action.next })}
                          title={action.label}
                        >
                          <action.icon size={14} />
                        </Button>
                      ))}
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
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirmAction?.next === 'en_progreso' && (ordenesFiltradas.find((o) => o._id === confirmAction.id)?.status === 'pausada' ? '¿Reanudar orden?' : '¿Iniciar orden?')}
            {confirmAction?.next === 'pausada' && '¿Pausar orden?'}
            {confirmAction?.next === 'cancelada' && '¿Cancelar orden?'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {confirmAction?.next === 'en_progreso' && 'Se reservará el stock necesario.'}
          {confirmAction?.next === 'pausada' && 'La orden se pausará, la reserva de stock se mantiene.'}
          {confirmAction?.next === 'cancelada' && 'Se liberará la reserva de stock (si corresponde).'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>Volver</Button>
          <Button
            variant={confirmAction?.next === 'cancelada' ? 'destructive' : 'default'}
            onClick={() => confirmAction && statusMutation.mutate({ id: confirmAction.id, status: confirmAction.next })}
            disabled={statusMutation.isPending}
            className={cn(confirmAction?.next === 'en_progreso' && 'bg-green-600 hover:bg-green-700 text-white')}
          >
            {statusMutation.isPending ? 'Procesando...' : 'Confirmar'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
