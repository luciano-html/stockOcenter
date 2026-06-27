import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { WorkOrder } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { ArrowLeft, Play, Pause, CheckCircle, XCircle } from 'lucide-react'

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendiente: 'secondary',
  en_progreso: 'default',
  pausada: 'outline',
  finalizada: 'secondary',
  cancelada: 'destructive',
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

export default function OrdenTrabajoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null)

  const { data, isLoading } = useQuery<{ data: WorkOrder }>({
    queryKey: ['orden-trabajo', id],
    queryFn: () => api.get(`/ordenes-trabajo/${id}`).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (status: string) => api.patch(`/ordenes-trabajo/${id}/estado`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden-trabajo', id] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      setConfirmStatus(null)
    },
  })

  if (isLoading) return <Skeleton className="h-96" />
  if (!data?.data) return <p className="text-muted-foreground">Orden no encontrada</p>

  const ot = data.data
  const actions = transitions[ot.status] ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/ordenes-trabajo')} className="mb-2">
        <ArrowLeft size={16} /> Volver
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              OT #{ot._id.slice(-6)}
              <Badge variant={statusColors[ot.status]}>{statusLabels[ot.status]}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo de silla</p>
              <p className="font-medium">{ot.chairTypeId.name}</p>
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

          {actions.length > 0 && (
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
        </CardContent>
      </Card>

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
    </div>
  )
}
