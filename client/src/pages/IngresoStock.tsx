import { useState, useMemo } from 'react'
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
import { Plus, Trash2, ChevronDown } from 'lucide-react'
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

function emptyBulkItem(): BulkItem {
  return { id: generateId(), componenteId: '', cantidad: '1', notas: '' }
}

function CollapsibleCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader
        className="flex flex-row items-center justify-between cursor-pointer select-none"
        onClick={onToggle}
      >
        <CardTitle>{title}</CardTitle>
        <ChevronDown
          size={20}
          className={cn('text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </CardHeader>
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <CardContent>{children}</CardContent>
        </div>
      </div>
    </Card>
  )
}

export default function IngresoStock() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()

  const [egresoComp, setEgresoComp] = useState('')
  const [egresoCant, setEgresoCant] = useState('1')
  const [egresoNotas, setEgresoNotas] = useState('')

  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  const [bulkGlobalNotes, setBulkGlobalNotes] = useState('')
  const [bulkErrors, setBulkErrors] = useState<Record<number, string>>({})
  const [multiSelected, setMultiSelected] = useState<string[]>([])

  const [openCards, setOpenCards] = useState<{ masivo: boolean }>({
    masivo: true,
  })

  const [movFilters, setMovFilters] = useState({ componenteId: '', tipo: '', page: 1 })

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState<'egreso' | 'bulk' | null>(null)

  const { data: compData } = useQuery<{ data: Componente[]; pagination: Pagination }>({
    queryKey: ['componentes'],
    queryFn: () => api.get('/componentes', { params: { limit: 1000 } }).then((r) => r.data),
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

  function resetBulkIngreso() {
    setBulkItems([])
    setBulkGlobalNotes('')
    setBulkErrors({})
  }

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
      setSuccessMsg(`✓ Lote de ${bulkItems.length} componente(s) cargado correctamente`)
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

  function addBulkItem() {
    setBulkItems((prev) => [...prev, emptyBulkItem()])
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

  return (
    <div className="space-y-6">
      <GoBack />

      <CollapsibleCard
        title="Cargar stock"
        open={openCards.masivo}
        onToggle={() => setOpenCards((prev) => ({ ...prev, masivo: !prev.masivo }))}
      >
        <div className="space-y-4">
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
            <div className="space-y-2">
              {bulkItems.map((item, index) => (
                <div key={item.id} className="flex flex-col lg:flex-row gap-2 items-start lg:items-end">
                  <div className="flex-1 w-full">
                    <Autocomplete
                      options={componentOptions}
                      value={item.componenteId}
                      onChange={(value) => updateBulkItem(index, { componenteId: value })}
                      placeholder="Buscar componente..."
                    />
                  </div>
                  <div className="w-full lg:w-32">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Cantidad"
                      value={item.cantidad}
                      onChange={(e) => updateBulkItem(index, { cantidad: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <Input
                      placeholder="Notas fila"
                      value={item.notas}
                      onChange={(e) => updateBulkItem(index, { notas: e.target.value })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeBulkItem(index)} aria-label="Eliminar ítem">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {Object.entries(bulkErrors).map(([index, message]) => (
                <p key={index} className="text-sm text-destructive">{message}</p>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={addBulkItem}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar ítem
          </Button>

          <div className="space-y-2">
            <Label>Notas generales del lote (opcional)</Label>
            <Input
              placeholder="ej. Remito N° 1234, proveedor..."
              value={bulkGlobalNotes}
              onChange={(e) => setBulkGlobalNotes(e.target.value)}
            />
          </div>

          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            Total: <strong>{bulkItems.length}</strong> ítem(s) / <strong>{bulkTotalCantidad}</strong> unidades
          </div>

          <Button
            className="w-full"
            disabled={bulkItems.length === 0 || bulkIngresoMutation.isPending}
            onClick={handleBulkSubmit}
          >
            {bulkIngresoMutation.isPending ? 'Cargando lote...' : 'Cargar lote'}
          </Button>
        </div>
      </CollapsibleCard>

      <Card>
        <CardHeader><CardTitle>Egreso de stock</CardTitle></CardHeader>
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

      {successMsg && (
        <p className="text-sm text-green-600 text-center font-medium">{successMsg}</p>
      )}
      {errorMsg && (
        <p className="text-sm text-destructive text-center font-medium">{errorMsg}</p>
      )}

      <Card>
        <CardHeader><CardTitle>Historial de movimientos</CardTitle></CardHeader>
        <CardContent>
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
            onFilterComponentChange={(val) => setMovFilters((prev) => ({ ...prev, componenteId: val, page: 1 }))}
            onFilterTypeChange={(val) => setMovFilters((prev) => ({ ...prev, tipo: val, page: 1 }))}
            onSearch={() => setMovFilters((prev) => ({ ...prev, page: 1 }))}
            onPageChange={(page) => setMovFilters((prev) => ({ ...prev, page }))}
          />
        </CardContent>
      </Card>

      <LowStockAlert componentes={resumenData?.data?.componentes ?? []} />

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
          >Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}
