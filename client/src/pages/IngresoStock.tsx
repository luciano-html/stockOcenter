import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { Componente, StockMovement, Pagination, StockResumen, AxiosErrorType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Autocomplete } from '@/components/ui/autocomplete'
import StockMovementsTable from '@/components/movements/StockMovementsTable'
import LowStockAlert from '@/components/movements/LowStockAlert'
import { GoBack } from '@/components/shared/GoBack'

export default function IngresoStock() {
  const queryClient = useQueryClient()

  const [ingresoComp, setIngresoComp] = useState('')
  const [ingresoCant, setIngresoCant] = useState('1')
  const [ingresoNotas, setIngresoNotas] = useState('')

  const [egresoComp, setEgresoComp] = useState('')
  const [egresoCant, setEgresoCant] = useState('1')
  const [egresoNotas, setEgresoNotas] = useState('')

  const [movFilters, setMovFilters] = useState({ componenteId: '', tipo: '', page: 1 })
  const [movParams, setMovParams] = useState(movFilters)

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState<'ingreso' | 'egreso' | null>(null)

  const { data: compData } = useQuery<{ data: Componente[]; pagination: Pagination }>({
    queryKey: ['componentes'],
    queryFn: () => api.get('/componentes', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const { data: recentData } = useQuery<{ data: StockMovement[] }>({
    queryKey: ['movimientos', 'recent'],
    queryFn: () => api.get('/stock/movimientos', { params: { limit: 15 } }).then((r) => r.data),
    refetchInterval: 10000,
  })

  const { data: movData, isLoading: movLoading } = useQuery<{ data: StockMovement[]; pagination: Pagination }>({
    queryKey: ['movimientos', 'list', movFilters],
    queryFn: () => api.get('/stock/movimientos', { params: movFilters }).then((r) => r.data),
  })

  const { data: resumenData } = useQuery<{ data: StockResumen }>({
    queryKey: ['stock-resumen'],
    queryFn: () => api.get('/stock/resumen').then((r) => r.data),
  })

  const componentOptions = useMemo(
    () =>
      (compData?.data ?? []).map((c) => ({
        value: c._id,
        label: `${c.name} (${c.tipo}${c.subtipo ? ` / ${c.subtipo}` : ''}${c.marca ? ` - ${c.marca}` : ''}) — disp. ${c.stockDisponible} ${c.unit}`,
      })),
    [compData]
  )

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['componentes'] })
    queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
    queryClient.invalidateQueries({ queryKey: ['movimientos'] })
    queryClient.invalidateQueries({ queryKey: ['tipos-silla'] })
  }

  const ingresoMutation = useMutation({
    mutationFn: () => api.post('/stock/ingreso', { componenteId: ingresoComp, cantidad: Number(ingresoCant), notas: ingresoNotas || undefined }),
    onSuccess: () => {
      invalidateAll()
      setSuccessMsg('✓ Stock cargado correctamente')
      setErrorMsg('')
      setIngresoComp('')
      setIngresoCant('1')
      setIngresoNotas('')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: (err: AxiosErrorType) => {
      setErrorMsg(err?.response?.data?.error?.message ?? 'Error al cargar stock')
      setTimeout(() => setErrorMsg(''), 5000)
    },
  })

  const egresoMutation = useMutation({
    mutationFn: () => api.post('/stock/egreso', { componenteId: egresoComp, cantidad: Number(egresoCant), notas: egresoNotas || undefined }),
    onSuccess: () => {
      invalidateAll()
      setSuccessMsg('✓ Egreso registrado correctamente')
      setErrorMsg('')
      setEgresoComp('')
      setEgresoCant('1')
      setEgresoNotas('')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: (err: AxiosErrorType) => {
      setErrorMsg(err?.response?.data?.error?.message ?? 'Error al registrar egreso')
      setTimeout(() => setErrorMsg(''), 5000)
    },
  })

  const selectedIngreso = compData?.data.find((c) => c._id === ingresoComp)
  const selectedEgreso = compData?.data.find((c) => c._id === egresoComp)

  return (
    <div className="space-y-4">
      <GoBack />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Ingreso de stock</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Componente</Label>
                  <Autocomplete
                    options={componentOptions}
                    value={ingresoComp}
                    onChange={setIngresoComp}
                    placeholder="Buscar componente..."
                  />
                </div>

                {selectedIngreso && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                    <p>Stock actual: <strong>{selectedIngreso.stockActual}</strong> {selectedIngreso.unit}</p>
                    <p>Reservado: <strong>{selectedIngreso.stockReservado}</strong> {selectedIngreso.unit}</p>
                    <p>Disponible: <strong>{selectedIngreso.stockDisponible}</strong> {selectedIngreso.unit}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Cantidad recibida</Label>
                  <Input type="text" inputMode="numeric" value={ingresoCant} onChange={(e) => setIngresoCant(e.target.value.replace(/\D/g, ''))} />
                </div>

                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Input placeholder="ej. Nro de remito, proveedor..." value={ingresoNotas} onChange={(e) => setIngresoNotas(e.target.value)} />
                </div>

                <Button className="w-full" disabled={!ingresoComp || !ingresoCant || Number(ingresoCant) < 1 || ingresoMutation.isPending} onClick={() => setConfirmAction('ingreso')}>
                  {ingresoMutation.isPending ? 'Cargando...' : 'Cargar stock'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Egreso de stock</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Componente</Label>
                  <Autocomplete
                    options={componentOptions}
                    value={egresoComp}
                    onChange={setEgresoComp}
                    placeholder="Buscar componente..."
                  />
                </div>

                {selectedEgreso && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                    <p>Stock actual: <strong>{selectedEgreso.stockActual}</strong> {selectedEgreso.unit}</p>
                    <p>Reservado: <strong>{selectedEgreso.stockReservado}</strong> {selectedEgreso.unit}</p>
                    <p>Disponible: <strong>{selectedEgreso.stockDisponible}</strong> {selectedEgreso.unit}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Cantidad a retirar</Label>
                  <Input type="text" inputMode="numeric" value={egresoCant} onChange={(e) => setEgresoCant(e.target.value.replace(/\D/g, ''))} />
                </div>

                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Input placeholder="ej. Devolución, ajuste, consumo..." value={egresoNotas} onChange={(e) => setEgresoNotas(e.target.value)} />
                </div>

                <Button className="w-full" variant="destructive" disabled={!egresoComp || Number(egresoCant) < 1 || egresoMutation.isPending} onClick={() => setConfirmAction('egreso')}>
                  {egresoMutation.isPending ? 'Procesando...' : 'Retirar stock'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {successMsg && (
            <p className="text-sm text-green-600 text-center font-medium">{successMsg}</p>
          )}
          {errorMsg && (
            <p className="text-sm text-destructive text-center font-medium">{errorMsg}</p>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Últimos movimientos</CardTitle></CardHeader>
            <CardContent>
              <StockMovementsTable
                movements={recentData?.data ?? []}
                compact
                showNotes
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Todo el historial</CardTitle></CardHeader>
            <CardContent>
              <StockMovementsTable
                movements={movData?.data ?? []}
                loading={movLoading}
                showNotes
                showFilters
                showPagination
                componentOptions={compData?.data}
                filterComponentId={movParams.componenteId}
                filterType={movParams.tipo}
                pagination={movData?.pagination}
                page={movFilters.page}
                onFilterComponentChange={(val) => setMovParams({ ...movParams, componenteId: val })}
                onFilterTypeChange={(val) => setMovParams({ ...movParams, tipo: val })}
                onSearch={() => setMovFilters({ ...movParams, page: 1 })}
                onPageChange={(page) => setMovFilters({ ...movFilters, page })}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <LowStockAlert componentes={resumenData?.data?.componentes ?? []} />

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirmAction === 'ingreso' ? '¿Cargar stock?' : '¿Retirar stock?'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {confirmAction === 'ingreso'
            ? `Se agregarán ${Number(ingresoCant)} unidades de ${selectedIngreso?.name ?? ''} al stock.`
            : `Se retirarán ${Number(egresoCant)} unidades de ${selectedEgreso?.name ?? ''} del stock.`}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancelar</Button>
          <Button
            variant={confirmAction === 'egreso' ? 'destructive' : 'default'}
            onClick={() => {
              setConfirmAction(null)
              if (confirmAction === 'ingreso') ingresoMutation.mutate()
              else egresoMutation.mutate()
            }}
          >Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}

