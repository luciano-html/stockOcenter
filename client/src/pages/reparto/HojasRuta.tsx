import { useState } from 'react'

import { useDeliveryRoutes, useFinishDeliveryRoute, useStartDeliveryRoute } from '@/services/deliveryRoutes'
import type { IDeliveryRoute, WorkOrder } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getOrdenSillasLabel } from '@/lib/ordenes'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Printer } from 'lucide-react'

export function HojasRuta() {
  const { data: routes, isLoading, error } = useDeliveryRoutes()
  const [selectedRoute, setSelectedRoute] = useState<IDeliveryRoute | null>(null)

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (error) return <div className="text-red-500">Error al cargar hojas de ruta.</div>

  const routeList = Array.isArray(routes) ? routes : (routes as any)?.data ? (routes as any).data : []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº HR</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Chofer / Acomp.</TableHead>
              <TableHead className="text-center">Órdenes</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routeList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 h-24">
                  No hay hojas de ruta creadas.
                </TableCell>
              </TableRow>
            ) : (
              routeList.map((route) => (
                <TableRow key={route._id}>
                  <TableCell className="font-medium">{route.routeNumber}</TableCell>
                  <TableCell>{new Date(route.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {route.driver}
                    {route.assistant ? <span className="text-gray-500 text-sm block">/ {route.assistant}</span> : null}
                  </TableCell>
                  <TableCell className="text-center">{route.stops.length}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={
                      route.status === 'en_curso' ? 'bg-blue-100 text-blue-800' :
                      route.status === 'pendiente' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {route.status === 'en_curso' ? 'En Curso' : route.status === 'pendiente' ? 'Programada' : 'Finalizada'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" onClick={() => setSelectedRoute(route)}>
                      Ver Detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedRoute && (
        <RouteDetailModal 
          route={selectedRoute} 
          onClose={() => setSelectedRoute(null)} 
        />
      )}
    </div>
  )
}

function RouteDetailModal({ route, onClose }: { route: IDeliveryRoute; onClose: () => void }) {
  const { mutate: finishRoute, isPending } = useFinishDeliveryRoute()
  const { mutate: startRoute, isPending: isStarting } = useStartDeliveryRoute()
  const [formError, setFormError] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  
  // orderStatuses state for finishing
  const [orderStatuses, setOrderStatuses] = useState<Record<string, { status: 'entregada' | 'rebotada'; notes: string }>>(
    route.stops.reduce((acc, stop) => {
      const otId = typeof stop.orderId === 'object' ? (stop.orderId as any)._id : stop.orderId;
      acc[otId] = { status: 'entregada', notes: '' }
      return acc
    }, {} as Record<string, { status: 'entregada' | 'rebotada'; notes: string }>)
  )

  const handlePrint = () => {
    window.print()
  }

  const handleStartSubmit = () => {
    setFormError(null)
    startRoute(route._id, {
      onSuccess: () => {
        onClose()
      },
      onError: (err: any) => {
        setFormError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Error al iniciar la ruta')
      }
    })
  }

  const handleFinishSubmit = () => {
    setFormError(null)
    const statusesArray = Object.entries(orderStatuses).map(([orderId, data]) => ({
      orderId,
      status: data.status,
      notes: data.notes
    }))

    finishRoute({ id: route._id, orderStatuses: statusesArray }, {
      onSuccess: () => {
        onClose()
      },
      onError: (err: any) => {
        setFormError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Error al finalizar')
      }
    })
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Reparto #{route.routeNumber}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(`/modo-chofer/${route._id}`, '_blank')} className="print:hidden">
                📱 Link Chofer
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 print:space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg border">
            <div><strong>Chofer:</strong> {route.driver}</div>
            <div><strong>Acompañante:</strong> {route.assistant || '-'}</div>
            <div><strong>Fecha:</strong> {new Date(route.date).toLocaleDateString()}</div>
            <div className="print:hidden"><strong>Estado:</strong> {route.status === 'en_curso' ? 'En Curso' : route.status === 'pendiente' ? 'Programada' : 'Finalizada'}</div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Órdenes a entregar ({route.stops.length})</h3>
            <div className="space-y-4">
              {route.stops.map((stop: any) => {
                const ot: WorkOrder = stop.orderId;
                return (
                <div key={stop._id || ot._id} className="border rounded-lg p-4 bg-white shadow-sm break-inside-avoid">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-lg">Nº OT: #{ot.orderNumber || ot._id.slice(-6).toUpperCase()}</div>
                    <div className="text-gray-500 text-sm">Cliente: <span className="font-semibold text-gray-900">{ot.cliente?.name || 'Consumidor Final'}</span></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500 block mb-1">Sillas:</span>
                      <span className="font-medium">{getOrdenSillasLabel(ot)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Dirección / Contacto:</span>
                      <span>
                        {ot.logistica?.direccionEntrega || 'No especificada'}
                        {ot.logistica?.localidadEntrega ? `, ${ot.logistica.localidadEntrega}` : ''}
                      </span>
                      {ot.cliente?.telefono && <span className="block text-gray-600 mt-1">Tel: {ot.cliente.telefono}</span>}
                    </div>
                  </div>

                  {ot.condicionesComerciales?.observacionesReparto && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm mb-3">
                      <strong>⚠️ Observación Reparto:</strong> {ot.condicionesComerciales.observacionesReparto}
                    </div>
                  )}

                  {isFinishing && route.status === 'en_curso' && (
                    <div className="mt-4 pt-4 border-t print:hidden flex gap-4 items-start">
                      <div className="w-1/3">
                        <label className="text-xs font-medium text-gray-700 block mb-1">Resultado de Entrega</label>
                        <Select 
                          value={orderStatuses[ot._id].status}
                          onChange={(e) => setOrderStatuses(prev => ({
                            ...prev, 
                            [ot._id]: { ...prev[ot._id], status: e.target.value as 'entregada' | 'rebotada' }
                          }))}
                          className={orderStatuses[ot._id].status === 'entregada' ? 'bg-green-50' : 'bg-red-50'}
                        >
                          <option value="entregada">✅ Entregada</option>
                          <option value="rebotada">❌ Rebotada</option>
                        </Select>
                      </div>
                      {orderStatuses[ot._id].status === 'rebotada' && (
                        <div className="w-2/3">
                          <label className="text-xs font-medium text-gray-700 block mb-1">Motivo / Notas</label>
                          <Input 
                            value={orderStatuses[ot._id].notes}
                            onChange={(e) => setOrderStatuses(prev => ({
                              ...prev, 
                              [ot._id]: { ...prev[ot._id], notes: e.target.value }
                            }))}
                            placeholder="Motivo del rebote..."
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>

          {(route.status === 'en_curso' || route.status === 'pendiente') && (
            <div className="flex flex-col items-end gap-3 pt-4 border-t print:hidden">
              {formError && (
                <div className="w-full bg-red-50 text-red-700 border border-red-200 p-3 rounded-md text-sm font-medium flex justify-between items-center">
                  <span>{formError}</span>
                  <button onClick={() => setFormError(null)} className="text-red-500 hover:text-red-900 font-bold px-2">&times;</button>
                </div>
              )}
              
              {route.status === 'pendiente' && (
                <Button onClick={handleStartSubmit} disabled={isStarting} className="bg-blue-600 hover:bg-blue-700">
                  {isStarting ? 'Iniciando...' : 'Iniciar Reparto'}
                </Button>
              )}

              {route.status === 'en_curso' && !isFinishing && (
                <Button onClick={() => setIsFinishing(true)}>Finalizar Reparto...</Button>
              )}
              
              {route.status === 'en_curso' && isFinishing && (
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setIsFinishing(false)} disabled={isPending}>Cancelar</Button>
                  <Button onClick={handleFinishSubmit} disabled={isPending} className="bg-green-600 hover:bg-green-700">
                    {isPending ? 'Guardando...' : 'Confirmar Finalización'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
    </Dialog>
  )
}
