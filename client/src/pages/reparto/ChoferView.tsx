import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import type { IDeliveryRoute } from '@/types'

export function ChoferView() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  
  const { data: res, isLoading } = useQuery({
    queryKey: ['deliveryRoute', id],
    queryFn: async () => {
      const response = await api.get(`/delivery-routes/${id}`)
      return response.data as { data: IDeliveryRoute }
    },
    refetchInterval: 10000 // Refetch every 10s to stay synced
  })

  const route = res?.data

  const updateStopMutation = useMutation({
    mutationFn: async ({ stopId, status, reason }: { stopId: string, status: string, reason?: string }) => {
      await api.put(`/delivery-routes/${id}/stops/${stopId}`, { status, reason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRoute', id] })
    }
  })

  const [rejectReason, setRejectReason] = useState('')
  const [rejectingStop, setRejectingStop] = useState<string | null>(null)

  if (isLoading) return <div className="p-4 text-center">Cargando ruta...</div>
  if (!route) return <div className="p-4 text-center">Ruta no encontrada</div>

  const handleUpdate = (stopId: string, status: string, reason?: string) => {
    updateStopMutation.mutate({ stopId, status, reason })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Viaje #{route.routeNumber}</h1>
          <p className="text-blue-100 text-sm">{route.driver}</p>
        </div>
        <div className="bg-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
          {route.status === 'en_curso' ? 'EN CAMINO' : route.status.toUpperCase()}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {route.stops.map((stop, index) => {
          const ot = stop.orderId as any
          const isPending = stop.status === 'pendiente'
          const isEnCamino = stop.status === 'en_camino'
          const isLlegue = stop.status === 'llegue'
          const isDone = stop.status === 'entregado' || stop.status === 'rebotado'

          // Encuentra si es el proximo destino
          const nextStopIndex = route.stops.findIndex(s => s.status !== 'entregado' && s.status !== 'rebotado')
          const isNext = index === nextStopIndex

          return (
            <div key={stop._id || ot._id} className={`bg-white rounded-xl shadow overflow-hidden border-2 ${isEnCamino || isLlegue ? 'border-blue-500' : isDone ? 'border-gray-200 opacity-70' : 'border-transparent'}`}>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${isDone ? 'bg-gray-400' : isEnCamino || isLlegue ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{ot.cliente?.name || 'Cliente'}</h3>
                      <p className="text-sm text-gray-500">OT #{ot.orderNumber || ot._id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  {isDone && (
                    <span className={`text-xs font-bold px-2 py-1 rounded ${stop.status === 'entregado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {stop.status.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="mb-4 pl-10 text-sm">
                  <p className="text-gray-700 flex items-start gap-1">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                    <span>
                      {ot.logistica?.direccionEntrega} {ot.logistica?.localidadEntrega ? `, ${ot.logistica.localidadEntrega}` : ''}
                    </span>
                  </p>
                  
                  {ot.condicionesComerciales?.observacionesReparto && (
                    <div className="mt-2 bg-yellow-50 text-yellow-800 p-2 rounded text-xs border border-yellow-200">
                      <strong>⚠️ Observación:</strong> {ot.condicionesComerciales.observacionesReparto}
                    </div>
                  )}
                </div>

                {/* ACCIONES DEL CHOFER */}
                {!isDone && route.status === 'en_curso' && (
                  <div className="pl-10 space-y-2">
                    {isPending && isNext && (
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold"
                        onClick={() => handleUpdate(ot._id, 'en_camino')}
                        disabled={updateStopMutation.isPending}
                      >
                        <Navigation className="w-5 h-5 mr-2" />
                        INICIAR VIAJE
                      </Button>
                    )}

                    {isEnCamino && (
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg font-bold"
                        onClick={() => handleUpdate(ot._id, 'llegue')}
                        disabled={updateStopMutation.isPending}
                      >
                        <MapPin className="w-5 h-5 mr-2" />
                        LLEGUÉ AL DOMICILIO
                      </Button>
                    )}

                    {isLlegue && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          className="bg-green-600 hover:bg-green-700 h-12 text-sm font-bold text-white"
                          onClick={() => handleUpdate(ot._id, 'entregado')}
                          disabled={updateStopMutation.isPending}
                        >
                          <CheckCircle className="w-5 h-5 mr-1" /> ENTREGADO
                        </Button>
                        <Button 
                          variant="destructive"
                          className="h-12 text-sm font-bold"
                          onClick={() => setRejectingStop(ot._id)}
                          disabled={updateStopMutation.isPending}
                        >
                          <XCircle className="w-5 h-5 mr-1" /> REBOTADO
                        </Button>
                      </div>
                    )}

                    {rejectingStop === ot._id && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <label className="text-xs font-bold text-red-700 block mb-1">Motivo del rebote:</label>
                        <Input 
                          autoFocus
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Ej: No había nadie"
                          className="mb-2"
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="destructive" 
                            className="flex-1"
                            disabled={!rejectReason.trim() || updateStopMutation.isPending}
                            onClick={() => {
                              handleUpdate(ot._id, 'rebotado', rejectReason)
                              setRejectingStop(null)
                              setRejectReason('')
                            }}
                          >
                            Confirmar
                          </Button>
                          <Button variant="outline" className="flex-1" onClick={() => setRejectingStop(null)}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {route.stops.every(s => s.status === 'entregado' || s.status === 'rebotado') && route.status === 'en_curso' && (
           <div className="text-center p-6 bg-green-50 border border-green-200 rounded-xl mt-6">
             <h2 className="text-2xl font-bold text-green-700 mb-2">¡Recorrido Terminado!</h2>
             <p className="text-green-600 mb-4">Has completado todas las paradas de esta hoja de ruta.</p>
             <p className="text-sm text-gray-500">Pídele al encargado que finalice el viaje en el sistema central para cerrar la rendición.</p>
           </div>
        )}
      </main>
    </div>
  )
}
