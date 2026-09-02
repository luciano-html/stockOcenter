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
      const res = await api.post('/delivery-routes', data)
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
      const res = await api.post(`/delivery-routes/${id}/finish`, { orderStatuses })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRoutes'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
    },
  })
}
