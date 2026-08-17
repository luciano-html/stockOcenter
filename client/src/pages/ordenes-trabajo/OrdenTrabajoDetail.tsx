import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { WorkOrder, WorkOrderDetalle, AxiosErrorType, User as Usuario } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useState } from 'react'
import { Play, Pause, CheckCircle, XCircle, Pencil, AlertTriangle, Clock, User, Calendar, RotateCcw, ChevronDown } from 'lucide-react'
import { cn, qtyWithUnit } from '@/lib/utils'
import { GoBack } from '@/components/shared/GoBack'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { getOrdenSillas } from '@/lib/ordenes'
import FinalizarOrdenModal from './FinalizarOrdenModal'

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

const transitions: Record<string, { status: string; label: string; className: string; icon: typeof Play }[]> = {
  pendiente: [
    { status: 'en_progreso', label: 'Iniciar', className: 'bg-green-600 hover:bg-green-700 text-white', icon: Play },
    { status: 'cancelada', label: 'Cancelar', className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', icon: XCircle },
  ],
  en_progreso: [
    { status: 'pausada', label: 'Pausar', className: 'bg-amber-500 hover:bg-amber-600 text-white', icon: Pause },
    { status: 'finalizada', label: 'Finalizar', className: 'bg-green-600 hover:bg-green-700 text-white', icon: CheckCircle },
    { status: 'cancelada', label: 'Cancelar', className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', icon: XCircle },
  ],
  pausada: [
    { status: 'en_progreso', label: 'Reanudar', className: 'bg-green-600 hover:bg-green-700 text-white', icon: RotateCcw },
    { status: 'cancelada', label: 'Cancelar', className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', icon: XCircle },
  ],
}

function AuditInfo({ ot }: { ot: WorkOrder }) {
  return (
    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
      {ot.createdBy && (
        <p>Creada por: <span className="font-medium text-foreground">{ot.createdBy.name} ({ot.createdBy.role})</span> · {new Date(ot.createdAt).toLocaleString()}</p>
      )}
      {ot.startedBy && ot.startedAt && (
        <p>Iniciada por: <span className="font-medium text-foreground">{ot.startedBy.name} ({ot.startedBy.role})</span> · {new Date(ot.startedAt).toLocaleString()}</p>
      )}
      {ot.finalizedBy && ot.finalizedAt && (
        <p>Finalizada por: <span className="font-medium text-foreground">{ot.finalizedBy.name} ({ot.finalizedBy.role})</span> · {new Date(ot.finalizedAt).toLocaleString()}</p>
      )}
    </div>
  )
}

const stepIcons: Record<string, typeof Clock> = {
  pendiente: Calendar,
  en_progreso: Play,
  pausada: Pause,
  finalizada: CheckCircle,
  cancelada: XCircle,
}

const stepClass: Record<string, string> = {
  pendiente: 'text-gray-500',
  en_progreso: 'text-blue-600',
  pausada: 'text-amber-600',
  finalizada: 'text-green-600',
  cancelada: 'text-destructive',
}

function OrderTimeline({ ot }: { ot: WorkOrder }) {
  const steps = ot.statusHistory && ot.statusHistory.length > 0
    ? ot.statusHistory.map((e) => ({
        label: statusLabels[e.status],
        icon: stepIcons[e.status] ?? Clock,
        date: e.at,
        user: e.by,
        notes: e.notes,
        active: true,
        className: stepClass[e.status] ?? 'text-muted-foreground',
      }))
    : [
        {
          label: 'Creada',
          icon: Calendar,
          date: ot.createdAt,
          user: ot.createdBy,
          active: true,
          className: 'text-muted-foreground',
        },
        {
          label: 'Iniciada',
          icon: Play,
          date: ot.startedAt,
          user: ot.startedBy,
          active: !!ot.startedAt,
          className: 'text-blue-600',
        },
        {
          label: ot.status === 'cancelada' ? 'Cancelada' : 'Finalizada',
          icon: ot.status === 'cancelada' ? XCircle : CheckCircle,
          date: ot.finalizedAt,
          user: ot.finalizedBy,
          active: ot.status === 'finalizada' || ot.status === 'cancelada',
          className: ot.status === 'cancelada' ? 'text-destructive' : 'text-green-600',
        },
      ]

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Clock size={16} className="text-muted-foreground" />
        Historial de estados
      </h3>
      <div className="relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex items-start gap-3">
              <div className={cn(
                'relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-background',
                step.active ? `border-current ${step.className}` : 'border-muted-foreground text-muted-foreground'
              )}>
                <step.icon size={12} />
              </div>
              <div className="flex-1">
                <p className={cn('text-sm font-medium', step.active ? step.className : 'text-muted-foreground')}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-muted-foreground">{new Date(step.date).toLocaleString()}</p>
                )}
                {step.user && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User size={10} />
                    {step.user.name} ({step.user.role})
                  </p>
                )}
                {step.notes && (
                  <p className="text-xs mt-1 bg-amber-50 text-amber-900 border border-amber-200 rounded px-2 py-1">
                    {step.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OrdenTrabajoDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null)
  const [statusNotes, setStatusNotes] = useState('')
  const [selectedOperator, setSelectedOperator] = useState('')
  const [showFinalize, setShowFinalize] = useState(false)
  const [showComponentes, setShowComponentes] = useState(false)
  const [stockError, setStockError] = useState<{ componentId: string; name: string; necesario: number; disponible: number }[] | null>(null)

  const { data, isLoading } = useQuery<{ data: WorkOrder }>({
    queryKey: ['orden-trabajo', id],
    queryFn: () => api.get(`/ordenes-trabajo/${id}`).then((r) => r.data),
  })

  const { data: detalleData } = useQuery<{ data: WorkOrderDetalle }>({
    queryKey: ['orden-trabajo-detalle', id],
    queryFn: () => api.get(`/ordenes-trabajo/${id}/detalle`).then((r) => r.data),
    enabled: !!data?.data,
  })

  const mutation = useMutation({
    mutationFn: ({ status, notas }: { status: string; notas?: string }) =>
      api.patch(`/ordenes-trabajo/${id}/estado`, { status, notas }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden-trabajo', id] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo-dash'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos-recent'] })
      setConfirmStatus(null)
      setStatusNotes('')
      setStockError(null)
    },
    onError: (err: AxiosErrorType) => {
      setConfirmStatus(null)
      const details = err?.response?.data?.error?.details as { faltantes?: { componentId: string; name: string; necesario: number; disponible: number }[] } | undefined
      if (details?.faltantes && details.faltantes.length > 0) {
        setStockError(details.faltantes)
      }
    },
  })

  const { data: usuariosData } = useQuery<{ data: Usuario[] }>({
    queryKey: ['usuarios', 'asignar'],
    queryFn: () => api.get('/auth/usuarios', { params: { limit: 1000 } }).then((r) => r.data),
    enabled: isAdmin,
  })

  const assignMutation = useMutation({
    mutationFn: ({ assignedTo }: { assignedTo: string | null }) =>
      api.patch(`/ordenes-trabajo/${id}/asignar`, { assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden-trabajo', id] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })

  if (isLoading) return <Skeleton className="h-96" />
  if (!data?.data) return <p className="text-muted-foreground">Orden no encontrada</p>

  const ot = data.data
  const actions = transitions[ot.status] ?? []
  const canFinalize = ['pendiente', 'en_progreso', 'pausada'].includes(ot.status)
  const canEdit = isAdmin && ot.status === 'pendiente'
  const tieneSillas = getOrdenSillas(ot).length > 0

  const empleados = (usuariosData?.data ?? []).filter((u) => u.role === 'operario')

  function handleConfirm() {
    if (!confirmStatus) return
    const startFlow = () => mutation.mutate({ status: confirmStatus, notas: statusNotes || undefined })
    if (confirmStatus === 'en_progreso' && !ot.assignedTo && selectedOperator) {
      assignMutation.mutate({ assignedTo: selectedOperator }, { onSuccess: startFlow })
    } else {
      startFlow()
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <GoBack to="/ordenes-trabajo" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              OT #{ot._id.slice(-6)}
              <Badge variant="outline" className={statusClass[ot.status]}>{statusLabels[ot.status]}</Badge>
            </CardTitle>
          </div>
          {canEdit && (
            <Link to={`/ordenes-trabajo/${ot._id}/editar`}>
              <Button variant="outline" size="sm"><Pencil size={16} className="mr-1" /> Editar</Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Tipo(s) de silla</p>
              {getOrdenSillas(ot).length === 0 ? (
                <p className="font-medium">Solo repuestos</p>
              ) : (
                getOrdenSillas(ot).map((s) => (
                  <p key={s.chairTypeId._id} className="font-medium">
                    {s.chairTypeId.name} ×{s.quantity}
                  </p>
                ))
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creada</p>
              <p className="font-medium">{new Date(ot.createdAt).toLocaleString()}</p>
            </div>
            {ot.finalizedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Finalizada</p>
                <p className="font-medium">{new Date(ot.finalizedAt).toLocaleString()}</p>
              </div>
            )}
            <div className="col-span-2 sm:col-span-1">
              <p className="text-sm text-muted-foreground">Operario asignado</p>
              <p className="font-medium">{ot.assignedTo ? ot.assignedTo.name : 'Sin asignar'}</p>
            </div>
          </div>

          <OrderTimeline ot={ot} />

          {isAdmin && <AuditInfo ot={ot} />}

          {ot.operatorNotes && (
            <div className="text-sm bg-amber-50 text-amber-900 p-3 rounded-md border border-amber-200">
              <p className="font-medium">Notas del operario:</p>
              <p>{ot.operatorNotes}</p>
            </div>
          )}

          {isAdmin && actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {actions.map((action) => (
                <Button
                  key={action.status}
                  className={cn(action.className, 'gap-2')}
                  onClick={() => { setSelectedOperator(ot.assignedTo?._id ?? ''); setConfirmStatus(action.status) }}
                >
                  <action.icon size={16} /> {action.label}
                </Button>
              ))}
            </div>
          )}

          {!isAdmin && canFinalize && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button onClick={() => setShowFinalize(true)}>
                <CheckCircle size={16} /> Finalizar orden
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {detalleData?.data.items && detalleData.data.items.length > 0 && (
        <Card>
          {tieneSillas ? (
            <CardHeader
              className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
              onClick={() => setShowComponentes((v) => !v)}
            >
              <div className="flex items-center justify-between w-full">
                <CardTitle>Items</CardTitle>
                <ChevronDown size={18} className={cn('text-muted-foreground transition-transform', !showComponentes && '-rotate-90')} />
              </div>
            </CardHeader>
          ) : (
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          )}
          {(!tieneSillas || showComponentes) && (
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Componente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Sub-tipo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalleData.data.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.componentId.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.componentId.tipo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.componentId.subtipo ?? '—'}</TableCell>
                        <TableCell>{qtyWithUnit(item.quantity, item.unit)}</TableCell>
                        <TableCell>
                          {item.tipo === 'bom' && <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">Silla</Badge>}
                          {item.tipo === 'adicional' && <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">Adicional</Badge>}
                          {item.tipo === 'repuesto' && <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-50">Repuesto</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Dialog open={!!confirmStatus} onOpenChange={() => { setConfirmStatus(null); setStatusNotes('') }}>
        <DialogHeader>
          <DialogTitle>
            {confirmStatus === 'finalizada' ? '¿Finalizar orden?' :
             confirmStatus === 'cancelada' ? '¿Cancelar orden?' :
             confirmStatus === 'en_progreso' ? '¿Iniciar orden?' :
             '¿Pausar orden?'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {confirmStatus === 'finalizada' ? 'Se descontará el stock de los componentes.' :
           confirmStatus === 'cancelada' ? 'Se liberará la reserva de stock (si corresponde).' :
           confirmStatus === 'en_progreso' ? 'Se reservará el stock necesario.' :
           'La orden se pausará, la reserva de stock se mantiene.'}
        </p>
        {confirmStatus === 'en_progreso' && !ot.assignedTo && (
          <div className="space-y-2 mb-4">
            <Label htmlFor="assignOperator">Asignar operario</Label>
            <Select
              id="assignOperator"
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
            >
              <option value="">Seleccioná un operario...</option>
              {empleados.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
              ))}
            </Select>
          </div>
        )}
        <div className="space-y-3 mb-4">
          <Label htmlFor="statusNotes">Notas (opcional)</Label>
          <Input
            id="statusNotes"
            placeholder="ej. Iniciada con material disponible, pausada por falta de..."
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmStatus(null)}>Volver</Button>
          <Button
            className={cn(
              confirmStatus === 'cancelada' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              confirmStatus === 'en_progreso' && 'bg-green-600 hover:bg-green-700 text-white',
              confirmStatus === 'pausada' && 'bg-amber-500 hover:bg-amber-600 text-white',
              confirmStatus === 'finalizada' && 'bg-green-600 hover:bg-green-700 text-white'
            )}
            onClick={handleConfirm}
            disabled={mutation.isPending || assignMutation.isPending || (confirmStatus === 'en_progreso' && !ot.assignedTo && !selectedOperator)}
          >
            {mutation.isPending || assignMutation.isPending ? 'Procesando...' : 'Confirmar'}
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!stockError} onOpenChange={() => setStockError(null)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={18} /> No hay stock suficiente
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          No se puede iniciar la orden porque faltan los siguientes componentes:
        </p>
        <div className="rounded-md border overflow-x-auto mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead>Necesario</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Faltante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockError?.map((item) => (
                <TableRow key={item.componentId}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.necesario}</TableCell>
                  <TableCell className="text-destructive font-bold">{item.disponible}</TableCell>
                  <TableCell>{Math.max(0, item.necesario - item.disponible)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStockError(null)}>Volver</Button>
          <Link to="/ingreso-stock">
            <Button onClick={() => setStockError(null)}>Ir a cargar stock</Button>
          </Link>
        </div>
      </Dialog>

      {detalleData?.data.items && (
        <FinalizarOrdenModal
          orderId={ot._id}
          items={detalleData.data.items}
          isOpen={showFinalize}
          onClose={() => setShowFinalize(false)}
        />
      )}
    </div>
  )
}
