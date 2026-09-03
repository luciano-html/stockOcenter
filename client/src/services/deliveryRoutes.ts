import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { IDeliveryRoute } from '../types'

// GET /api/delivery-routes
export function useDeliveryRoutes() {
  return useQuery<IDeliveryRoute[]>({
    queryKey: ['deliveryRoutes'],
    queryFn: async () => {
      const res = await api.get('/delivery-routes')
      return res.data.data
    },
  })
}

// POST /api/delivery-routes
export function useCreateDeliveryRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { driver: string; assistant?: string; orders: string[]; notes?: string }) => {
      const payload = { ...data, orderIds: data.orders }
      const res = await api.post('/delivery-routes', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRoutes'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
    },
  })
}

// POST /api/delivery-routes/:id/start
export function useStartDeliveryRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/delivery-routes/${id}/start`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRoutes'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
    },
  })
}

// POST /api/delivery-routes/:id/finish
export function useFinishDeliveryRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      orderStatuses,
    }: {
      id: string
      orderStatuses: { orderId: string; status: 'entregada' | 'rebotada'; notes?: string }[]
    }) => {
      const deliveredOrders = orderStatuses.filter(o => o.status === 'entregada').map(o => ({ orderId: o.orderId }))
      const returnedOrders = orderStatuses.filter(o => o.status === 'rebotada').map(o => ({ orderId: o.orderId, reason: o.notes }))
      const res = await api.post(`/delivery-routes/${id}/finish`, { deliveredOrders, returnedOrders })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRoutes'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
    },
  })
}
