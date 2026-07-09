import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { WorkOrder, WorkOrderDetalle, AxiosErrorType } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { Play, Pause, CheckCircle, XCircle, Pencil, AlertTriangle } from 'lucide-react'
import { GoBack } from '@/components/shared/GoBack'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
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

const transitions: Record<string, { status: string; label: string; variant: 'default' | 'destructive' | 'secondary'; icon: typeof Play }[]> = {
  pendiente: [
    { status: 'en_progreso', label: 'Iniciar', variant: 'default', icon: Play },
    { status: 'cancelada', label: 'Cancelar', variant: 'destructive', icon: XCircle },
  ],
  en_progreso: [
    { status: 'pausada', label: 'Pausar', variant: 'secondary', icon: Pause },
    { status: 'finalizada', label: 'Finalizar', variant: 'default', icon: CheckCircle },
    { status: 'cancelada', label: 'Cancelar', variant: 'destructive', icon: XCircle },
  ],
  pausada: [
    { status: 'en_progreso', label: 'Reanudar', variant: 'default', icon: Play },
    { status: 'cancelada', label: 'Cancelar', variant: 'destructive', icon: XCircle },
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

export default function OrdenTrabajoDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null)
  const [showFinalize, setShowFinalize] = useState(false)
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
    mutationFn: (status: string) => api.patch(`/ordenes-trabajo/${id}/estado`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden-trabajo', id] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo-dash'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos-recent'] })
      setConfirmStatus(null)
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

  if (isLoading) return <Skeleton className="h-96" />
  if (!data?.data) return <p className="text-muted-foreground">Orden no encontrada</p>

  const ot = data.data
  const actions = transitions[ot.status] ?? []
  const canFinalize = ['pendiente', 'en_progreso', 'pausada'].includes(ot.status)
  const canEdit = isAdmin && ot.status === 'pendiente'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <GoBack />

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
            <div>
              <p className="text-sm text-muted-foreground">Tipo de silla</p>
              <p className="font-medium">{ot.chairTypeId?.name ?? 'Solo repuestos'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cantidad</p>
              <p className="font-medium">{ot.quantity}</p>
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
          </div>

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
                  variant={action.variant}
                  onClick={() => setConfirmStatus(action.status)}
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
          <CardHeader><CardTitle>Componentes</CardTitle></CardHeader>
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
                      <TableCell>{item.quantity} {item.unit}</TableCell>
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
        </Card>
      )}

      <Dialog open={!!confirmStatus} onOpenChange={() => setConfirmStatus(null)}>
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
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmStatus(null)}>Volver</Button>
          <Button
            variant={confirmStatus === 'cancelada' ? 'destructive' : 'default'}
            onClick={() => confirmStatus && mutation.mutate(confirmStatus)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Procesando...' : 'Confirmar'}
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
