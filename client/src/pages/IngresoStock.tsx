import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { Componente } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function IngresoStock() {
  const [componenteId, setComponenteId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [notas, setNotas] = useState('')
  const [success, setSuccess] = useState(false)
  const queryClient = useQueryClient()

  const { data: compData } = useQuery<{ data: Componente[] }>({
    queryKey: ['componentes-ingreso'],
    queryFn: () => api.get('/componentes', { params: { limit: 200 } }).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: () => api.post('/stock/ingreso', { componenteId, cantidad, notas: notas || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['componentes'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      setSuccess(true)
      setComponenteId('')
      setCantidad(1)
      setNotas('')
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  const selected = compData?.data.find((c) => c._id === componenteId)

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Card>
        <CardHeader><CardTitle>Cargar stock recibido</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="componente">Componente</Label>
              <Select
                id="componente"
                value={componenteId}
                onChange={(e) => setComponenteId(e.target.value)}
              >
                <option value="">Seleccionar componente...</option>
                {compData?.data.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.tipo}{c.marca ? ` - ${c.marca}` : ''}) — disp. {c.stockDisponible} {c.unit}
                  </option>
                ))}
              </Select>
            </div>

            {selected && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                <p>Stock actual: <strong>{selected.stockActual}</strong> {selected.unit}</p>
                <p>Reservado: <strong>{selected.stockReservado}</strong> {selected.unit}</p>
                <p>Disponible: <strong>{selected.stockDisponible}</strong> {selected.unit}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad recibida</Label>
              <Input
                id="cantidad"
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Input
                id="notas"
                placeholder="ej. Nro de remito, proveedor..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              disabled={!componenteId || cantidad < 1 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Cargando...' : 'Cargar stock'}
            </Button>

            {success && (
              <p className="text-sm text-green-600 text-center font-medium">
                ✓ Stock cargado correctamente
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
