import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { Componente, StockMovement, Pagination, StockResumen, AxiosErrorType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Autocomplete } from '@/components/ui/autocomplete'
import { MultiSelectAutocomplete } from '@/components/ui/multi-select-autocomplete'
import StockMovementsTable from '@/components/movements/StockMovementsTable'
import LowStockAlert from '@/components/movements/LowStockAlert'
import { GoBack } from '@/components/shared/GoBack'
import { Plus, Trash2, PackageMinus, History, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BulkItem {
  id: string
  componenteId: string
  cantidad: string
  notas: string
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

type TabKey = 'ingreso' | 'egreso' | 'historial'

export default function IngresoStock() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabKey>('ingreso')

  const [egresoComp, setEgresoComp] = useState('')
  const [egresoCant, setEgresoCant] = useState('1')
  const [egresoNotas, setEgresoNotas] = useState('')

  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  const [bulkGlobalNotes, setBulkGlobalNotes] = useState('')
  const [bulkErrors, setBulkErrors] = useState<Record<number, string>>({})
  const [multiSelected, setMultiSelected] = useState<string[]>([])

  const [movFilters, setMovFilters] = useState({ componenteId: '', tipo: '', page: 1 })

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState<'egreso' | 'bulk' | null>(null)

  const { data: compData } = useQuery<{ data: Componente[]; pagination: Pagination }>({
    queryKey: ['componentes'],
    queryFn: () => api.get('/componentes', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const {
    data: movData,
    isLoading: movLoading,
    isError: movError,
    refetch: refetchMovimientos,
  } = useQuery<{ data: StockMovement[]; pagination: Pagination }>({
    queryKey: ['movimientos', 'list', movFilters],
    queryFn: () => api.get('/stock/movimientos', { params: movFilters }).then((r) => r.data),
    enabled: activeTab === 'historial',
  })

  const { data: resumenData } = useQuery<{ data: StockResumen }>({
    queryKey: ['stock-resumen'],
    queryFn: () => api.get('/stock/resumen').then((r) => r.data),
  })

  useEffect(() => {
    if (activeTab === 'historial') {
      refetchMovimientos()
    }
  }, [activeTab, refetchMovimientos])

  const componentMap = useMemo(() => {
    const map = new Map<string, Componente>()
    compData?.data.forEach((c) => map.set(c._id, c))
    return map
  }, [compData])

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

  function resetBulkIngreso() {
    setBulkItems([])
    setBulkGlobalNotes('')
    setBulkErrors({})
    setMultiSelected([])
  }

  const egresoMutation = useMutation({
    mutationFn: () => api.post('/stock/egreso', { componenteId: egresoComp, cantidad: Number(egresoCant), notas: egresoNotas || undefined }),
    onSuccess: () => {
      invalidateAll()
      setSuccessMsg('Egreso registrado correctamente')
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

  const bulkIngresoMutation = useMutation({
    mutationFn: () =>
      api.post('/stock/ingreso-masivo', {
        notasGenerales: bulkGlobalNotes || undefined,
        items: bulkItems.map((item) => ({
          componenteId: item.componenteId,
          cantidad: Number(item.cantidad),
          notas: item.notas || undefined,
        })),
      }),
    onSuccess: () => {
      invalidateAll()
      setSuccessMsg(`Lote de ${bulkItems.length} componente(s) cargado correctamente`)
      setErrorMsg('')
      resetBulkIngreso()
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: (err: AxiosErrorType) => {
      const backendErrors = err?.response?.data?.error?.errors as Array<{ index: number; message: string }> | undefined
      if (backendErrors) {
        const map: Record<number, string> = {}
        backendErrors.forEach((e) => {
          map[e.index] = e.message
        })
        setBulkErrors(map)
        setErrorMsg('Corregí los errores en las filas marcadas')
      } else {
        setErrorMsg(err?.response?.data?.error?.message ?? 'Error al cargar el lote')
      }
      setTimeout(() => setErrorMsg(''), 5000)
    },
  })

  const selectedEgreso = compData?.data.find((c) => c._id === egresoComp)

  function updateBulkItem(index: number, updates: Partial<BulkItem>) {
    setBulkItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)))
    setBulkErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  function removeBulkItem(index: number) {
    setBulkItems((prev) => prev.filter((_, i) => i !== index))
    setBulkErrors((prev) => {
      const next: Record<number, string> = {}
      Object.entries(prev).forEach(([key, value]) => {
        const idx = Number(key)
        if (idx < index) next[idx] = value
        else if (idx > index) next[idx - 1] = value
      })
      return next
    })
  }

  function addMultiSelectedToBulk() {
    const existingIds = new Set(bulkItems.map((item) => item.componenteId))
    const newItems = multiSelected
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ id: generateId(), componenteId: id, cantidad: '1', notas: '' }))

    if (newItems.length === 0) {
      setErrorMsg('Los componentes seleccionados ya están en el lote')
      setTimeout(() => setErrorMsg(''), 3000)
      return
    }

    setBulkItems((prev) => [...prev, ...newItems])
    setMultiSelected([])
  }

  function validateBulkItems(): boolean {
    const errors: Record<number, string> = {}
    let hasError = false

    bulkItems.forEach((item, index) => {
      if (!item.componenteId) {
        errors[index] = 'Seleccioná un componente'
        hasError = true
      } else if (Number(item.cantidad) < 1 || item.cantidad === '') {
        errors[index] = 'La cantidad debe ser al menos 1'
        hasError = true
      }
    })

    setBulkErrors(errors)
    return !hasError
  }

  function handleBulkSubmit() {
    if (!validateBulkItems()) {
      setErrorMsg('Corregí los errores en las filas marcadas')
      setTimeout(() => setErrorMsg(''), 5000)
      return
    }
    setConfirmAction('bulk')
  }

  const bulkTotalCantidad = useMemo(
    () => bulkItems.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0),
    [bulkItems]
  )

  function handleFilterComponentChange(val: string) {
    setMovFilters((prev) => ({ ...prev, componenteId: val, page: 1 }))
  }

  function handleFilterTypeChange(val: string) {
    setMovFilters((prev) => ({ ...prev, tipo: val, page: 1 }))
  }

  function clearMovFilters() {
    setMovFilters({ componenteId: '', tipo: '', page: 1 })
  }

  const tabs: { key: TabKey; label: string; icon: React.ElementType; color?: string }[] = [
    { key: 'ingreso', label: 'Ingreso', icon: Plus, color: 'text-green-600' },
    { key: 'egreso', label: 'Egreso', icon: PackageMinus, color: 'text-destructive' },
    { key: 'historial', label: 'Historial', icon: History },
  ]

  return (
    <div className="space-y-6">
      <GoBack />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Movimientos de stock</h1>
      </div>

      <div className="flex border-b">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon size={16} className={cn(isActive && tab.color)} />
              <span className={cn(isActive && tab.color)}>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {successMsg && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {activeTab === 'ingreso' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Plus size={20} />
                Ingreso de stock
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar y seleccionar componentes</Label>
                <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-end">
                  <div className="flex-1 w-full">
                    <MultiSelectAutocomplete
                      options={componentOptions}
                      selected={multiSelected}
                      onChange={setMultiSelected}
                      placeholder="Escribí para filtrar y marcá con checkbox..."
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full lg:w-auto whitespace-nowrap"
                    disabled={multiSelected.length === 0}
                    onClick={addMultiSelectedToBulk}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar {multiSelected.length > 0 ? `${multiSelected.length}` : ''}
                  </Button>
                </div>
              </div>

              {bulkItems.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left font-medium px-3 py-2">Componente</th>
                        <th className="text-left font-medium px-3 py-2 w-32">Cantidad</th>
                        <th className="text-left font-medium px-3 py-2">Notas</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkItems.map((item, index) => {
                        const comp = componentMap.get(item.componenteId)
                        return (
                          <tr key={item.id} className="border-t">
                            <td className="px-3 py-2 align-top">
                              <Autocomplete
                                options={componentOptions}
                                value={item.componenteId}
                                onChange={(value) => updateBulkItem(index, { componenteId: value })}
                                placeholder="Buscar componente..."
                              />
                              {comp && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Stock: <span className="font-medium text-foreground">{comp.stockActual}</span> {' '}
                                  · Disp: <span className="font-medium text-foreground">{comp.stockDisponible}</span> {' '}
                                  · Mín: <span className="font-medium text-foreground">{comp.stockMinimo}</span> {comp.unit}
                                </p>
                              )}
                              {bulkErrors[index] && (
                                <p className="text-xs text-destructive mt-1">{bulkErrors[index]}</p>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="Cantidad"
                                value={item.cantidad}
                                onChange={(e) => updateBulkItem(index, { cantidad: e.target.value.replace(/\D/g, '') })}
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Input
                                placeholder="Notas fila"
                                value={item.notas}
                                onChange={(e) => updateBulkItem(index, { notas: e.target.value })}
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Button variant="ghost" size="icon" onClick={() => removeBulkItem(index)} aria-label="Eliminar ítem">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notas generales del lote (opcional)</Label>
                <Input
                  placeholder="ej. Remito N° 1234, proveedor..."
                  value={bulkGlobalNotes}
                  onChange={(e) => setBulkGlobalNotes(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-md border p-3">
                <p className="text-sm text-muted-foreground">
                  Total: <strong>{bulkItems.length}</strong> ítem(s) / <strong>{bulkTotalCantidad}</strong> unidades
                </p>
                <Button
                  disabled={bulkItems.length === 0 || bulkIngresoMutation.isPending}
                  onClick={handleBulkSubmit}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {bulkIngresoMutation.isPending ? 'Cargando lote...' : 'Cargar lote'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <LowStockAlert componentes={resumenData?.data?.componentes ?? []} />
        </div>
      )}

      {activeTab === 'egreso' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <PackageMinus size={20} />
              Egreso de stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-end">
                <div className="flex-1 w-full">
                  <Label>Componente</Label>
                  <Autocomplete
                    options={componentOptions}
                    value={egresoComp}
                    onChange={setEgresoComp}
                    placeholder="Buscar componente..."
                  />
                </div>
                <div className="w-full lg:w-32">
                  <Label>Cantidad</Label>
                  <Input type="text" inputMode="numeric" value={egresoCant} onChange={(e) => setEgresoCant(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="flex-1 w-full">
                  <Label>Motivo (opcional)</Label>
                  <Input placeholder="ej. Devolución, ajuste, consumo..." value={egresoNotas} onChange={(e) => setEgresoNotas(e.target.value)} />
                </div>
                <Button
                  className="w-full lg:w-auto whitespace-nowrap"
                  variant="destructive"
                  disabled={!egresoComp || Number(egresoCant) < 1 || egresoMutation.isPending}
                  onClick={() => setConfirmAction('egreso')}
                >
                  {egresoMutation.isPending ? 'Procesando...' : 'Retirar stock'}
                </Button>
              </div>

              {selectedEgreso && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                  <p>Stock actual: <strong>{selectedEgreso.stockActual}</strong> {selectedEgreso.unit}</p>
                  <p>Reservado: <strong>{selectedEgreso.stockReservado}</strong> {selectedEgreso.unit}</p>
                  <p>Disponible: <strong>{selectedEgreso.stockDisponible}</strong> {selectedEgreso.unit}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'historial' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History size={20} />
              Historial de movimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {movError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive mb-4">
                Error al cargar el historial. Intentá recargar la página.
              </div>
            )}
            <StockMovementsTable
              movements={movData?.data ?? []}
              loading={movLoading}
              showNotes
              showAuthor={isAdmin}
              showFilters
              showPagination
              componentOptions={compData?.data}
              filterComponentId={movFilters.componenteId}
              filterType={movFilters.tipo}
              pagination={movData?.pagination}
              page={movFilters.page}
              onFilterComponentChange={handleFilterComponentChange}
              onFilterTypeChange={handleFilterTypeChange}
              onSearch={() => setMovFilters((prev) => ({ ...prev, page: 1 }))}
              onPageChange={(page) => setMovFilters((prev) => ({ ...prev, page }))}
            />
            {(movFilters.componenteId || movFilters.tipo) && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={clearMovFilters}>
                  <RotateCcw size={14} className="mr-2" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirmAction === 'bulk'
              ? '¿Cargar lote de ingreso?'
              : '¿Retirar stock?'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {confirmAction === 'bulk'
            ? `Se agregarán ${bulkTotalCantidad} unidades en ${bulkItems.length} componente(s).`
            : `Se retirarán ${Number(egresoCant)} unidades de ${selectedEgreso?.name ?? ''} del stock.`}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancelar</Button>
          <Button
            variant={confirmAction === 'egreso' ? 'destructive' : 'default'}
            onClick={() => {
              setConfirmAction(null)
              if (confirmAction === 'bulk') bulkIngresoMutation.mutate()
              else egresoMutation.mutate()
            }}
          >
            Confirmar
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
