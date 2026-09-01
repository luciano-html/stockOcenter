import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { PricingOverviewResponse, PricingConfigData, PricingChairItem, CostoPersonalizado } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Settings2,
  Save,
  Check,
  Plus,
  Trash2,
  Search,
  ArrowUpDown,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PreciosCostosView() {
  const queryClient = useQueryClient()
  
  // UI state
  const [showConfig, setShowConfig] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTipo, setSelectedTipo] = useState<string>('all')
  const [filterMargenBajo, setFilterMargenBajo] = useState(false)
  const [sortField, setSortField] = useState<'nombre' | 'costo' | 'precio' | 'margen'>('nombre')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Editable prices map for inline editing: chairId -> string value
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({})
  const [savedPriceId, setSavedPriceId] = useState<string | null>(null)

  // Configuration Form state (using string values for smooth typing/clearing)
  interface PricingConfigFormState {
    manoDeObra: string
    iva: string
    gastosGenerales: string
    comisiones: string
    margenGanancia: string
    costosPersonalizados: CostoPersonalizado[]
  }

  const [configForm, setConfigForm] = useState<PricingConfigFormState>({
    manoDeObra: '25000',
    iva: '21',
    gastosGenerales: '5',
    comisiones: '10',
    margenGanancia: '35',
    costosPersonalizados: [],
  })
  const [isConfigDirty, setIsConfigDirty] = useState(false)

  // New Custom Cost inline input
  const [newCostName, setNewCostName] = useState('')
  const [newCostType, setNewCostType] = useState<'porcentaje' | 'fijo'>('porcentaje')
  const [newCostValue, setNewCostValue] = useState<string>('')

  // State for BOM Component Editing Modal
  const [selectedChairIdForBOM, setSelectedChairIdForBOM] = useState<string | null>(null)
  const [editedCompPrices, setEditedCompPrices] = useState<Record<string, string>>({})
  const [savedCompId, setSavedCompId] = useState<string | null>(null)
  const [savedModalSuccess, setSavedModalSuccess] = useState(false)

  // Fetch Pricing Overview
  const { data, isLoading } = useQuery<{ data: PricingOverviewResponse }>({
    queryKey: ['pricing-overview'],
    queryFn: () => api.get('/pricing').then((r) => r.data),
  })

  // Selected chair object kept synchronized with latest query data
  const selectedChairForBOM = useMemo(() => {
    if (!selectedChairIdForBOM || !data?.data.sillas) return null
    return data.data.sillas.find((s) => s._id === selectedChairIdForBOM) || null
  }, [selectedChairIdForBOM, data?.data.sillas])

  // Sync initial config from server
  const serverConfig = data?.data.config
  useMemo(() => {
    if (serverConfig && !isConfigDirty) {
      setConfigForm({
        manoDeObra: String(serverConfig.manoDeObra ?? 25000),
        iva: String(serverConfig.iva ?? 21),
        gastosGenerales: String(serverConfig.gastosGenerales ?? 5),
        comisiones: String(serverConfig.comisiones ?? 10),
        margenGanancia: String(serverConfig.margenGanancia ?? 35),
        costosPersonalizados: serverConfig.costosPersonalizados ?? [],
      })
    }
  }, [serverConfig, isConfigDirty])

  // Mutation to Save Global Config
  const saveConfigMutation = useMutation({
    mutationFn: (newConfig: PricingConfigData) => api.put('/pricing/config', newConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-overview'] })
      setIsConfigDirty(false)
    },
  })

  const handleSaveConfig = () => {
    const payload: PricingConfigData = {
      manoDeObra: Math.max(0, Number(configForm.manoDeObra) || 0),
      iva: Math.max(0, Number(configForm.iva) || 0),
      gastosGenerales: Math.max(0, Number(configForm.gastosGenerales) || 0),
      comisiones: Math.max(0, Number(configForm.comisiones) || 0),
      margenGanancia: Math.max(0, Number(configForm.margenGanancia) || 0),
      costosPersonalizados: configForm.costosPersonalizados || [],
    }
    saveConfigMutation.mutate(payload)
  }

  // Mutation to Update Single Chair Price
  const updatePriceMutation = useMutation({
    mutationFn: ({ id, precioVenta }: { id: string; precioVenta: number }) =>
      api.patch(`/pricing/${id}/precio-venta`, { precioVenta }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-overview'] })
      setSavedPriceId(vars.id)
      setTimeout(() => setSavedPriceId(null), 2000)
    },
  })

  // Mutation to Update Component Cost(s)
  const updateComponentPriceMutation = useMutation({
    mutationFn: async (updates: Array<{ componentId: string; precio: number }>) => {
      const promises = updates.map((u) => api.put(`/componentes/${u.componentId}`, { precio: u.precio }))
      return Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-overview'] })
      queryClient.invalidateQueries({ queryKey: ['componentes'] })
      queryClient.invalidateQueries({ queryKey: ['componentes-select'] })
    },
  })

  const handleOpenBOM = (chair: PricingChairItem) => {
    setSelectedChairIdForBOM(chair._id)
    const initialPrices: Record<string, string> = {}
    chair.bomDetalle.forEach((comp) => {
      initialPrices[comp.componentId] = String(comp.precioUnitario ?? 0)
    })
    setEditedCompPrices(initialPrices)
    setSavedCompId(null)
    setSavedModalSuccess(false)
  }

  const handleCompPriceChange = (componentId: string, val: string) => {
    setEditedCompPrices((prev) => ({ ...prev, [componentId]: val }))
  }

  const handleSaveSingleComponent = (componentId: string) => {
    const rawVal = editedCompPrices[componentId]
    const numVal = Number(rawVal)
    if (isNaN(numVal) || numVal < 0) return

    updateComponentPriceMutation.mutate([{ componentId, precio: numVal }], {
      onSuccess: () => {
        setSavedCompId(componentId)
        setTimeout(() => setSavedCompId(null), 2000)
      },
    })
  }

  const handleSaveAllModifiedComponents = () => {
    if (!selectedChairForBOM) return
    const updates: Array<{ componentId: string; precio: number }> = []

    selectedChairForBOM.bomDetalle.forEach((comp) => {
      const raw = editedCompPrices[comp.componentId]
      if (raw !== undefined) {
        const num = Number(raw)
        if (!isNaN(num) && num >= 0 && num !== comp.precioUnitario) {
          updates.push({ componentId: comp.componentId, precio: num })
        }
      }
    })

    if (updates.length === 0) return

    updateComponentPriceMutation.mutate(updates, {
      onSuccess: () => {
        setSavedModalSuccess(true)
        setTimeout(() => setSavedModalSuccess(false), 2500)
      },
    })
  }

  const handleConfigChange = (field: keyof Omit<PricingConfigFormState, 'costosPersonalizados'>, value: string) => {
    setConfigForm((prev) => ({ ...prev, [field]: value }))
    setIsConfigDirty(true)
  }



  const handleAddCustomCost = () => {
    if (!newCostName.trim() || !newCostValue || Number(newCostValue) < 0) return
    const newCost: CostoPersonalizado = {
      nombre: newCostName.trim(),
      tipo: newCostType,
      valor: Number(newCostValue),
    }
    setConfigForm((prev) => ({
      ...prev,
      costosPersonalizados: [...(prev.costosPersonalizados || []), newCost],
    }))
    setNewCostName('')
    setNewCostValue('')
    setIsConfigDirty(true)
  }

  const handleRemoveCustomCost = (index: number) => {
    setConfigForm((prev) => ({
      ...prev,
      costosPersonalizados: prev.costosPersonalizados.filter((_, idx) => idx !== index),
    }))
    setIsConfigDirty(true)
  }

  const handlePriceInputChange = (chairId: string, value: string) => {
    setEditingPrices((prev) => ({ ...prev, [chairId]: value }))
  }

  const handleSavePrice = (chairId: string, currentFallback: number) => {
    const rawVal = editingPrices[chairId]
    const finalVal = rawVal !== undefined ? Number(rawVal) : currentFallback
    if (isNaN(finalVal) || finalVal < 0) return
    updatePriceMutation.mutate({ id: chairId, precioVenta: finalVal })
  }

  const handleApplySuggested = (chair: PricingChairItem) => {
    setEditingPrices((prev) => ({ ...prev, [chair._id]: String(chair.precioSugerido) }))
    updatePriceMutation.mutate({ id: chair._id, precioVenta: chair.precioSugerido })
  }

  // Filtered & Sorted Chairs List
  const sillas = useMemo(() => {
    let list = data?.data.sillas ? [...data.data.sillas] : []

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.tipo?.toLowerCase().includes(q))
    }

    if (selectedTipo !== 'all') {
      list = list.filter((s) => (s.tipo || '').toLowerCase() === selectedTipo.toLowerCase())
    }

    if (filterMargenBajo) {
      list = list.filter((s) => s.precioVenta === 0 || s.margenPorcentaje < 20)
    }

    list.sort((a, b) => {
      let valA = 0
      let valB = 0
      if (sortField === 'nombre') {
        const diff = a.name.localeCompare(b.name)
        return sortOrder === 'asc' ? diff : -diff
      } else if (sortField === 'costo') {
        valA = a.costoTotal
        valB = b.costoTotal
      } else if (sortField === 'precio') {
        valA = a.precioVenta
        valB = b.precioVenta
      } else if (sortField === 'margen') {
        valA = a.margenPorcentaje
        valB = b.margenPorcentaje
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA
    })

    return list
  }, [data?.data.sillas, searchTerm, selectedTipo, filterMargenBajo, sortField, sortOrder])

  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>()
    data?.data.sillas?.forEach((s) => {
      if (s.tipo) set.add(s.tipo)
    })
    return Array.from(set)
  }, [data?.data.sillas])

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* PANEL DE CONFIGURACIÓN GLOBAL DE COSTOS (Editable) */}
      <Card className="border-primary/30 shadow-sm bg-gradient-to-r from-card to-muted/20">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base font-bold">Parámetros Globales de Costos e Impuestos</CardTitle>
              <p className="text-xs text-muted-foreground">
                Se aplican a toda la fábrica. Al modificar estos valores, se actualizan los costos y precios sugeridos de todas las sillas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConfigDirty && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                onClick={handleSaveConfig}
                disabled={saveConfigMutation.isPending}
              >
                <Save className="h-3.5 w-3.5" />
                {saveConfigMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs text-muted-foreground"
            >
              {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {showConfig && (
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Mano de Obra */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-background">
                <Label className="text-xs font-semibold flex items-center gap-1 text-primary">
                  🛠️ Mano de Obra ($)
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={configForm.manoDeObra}
                    onChange={(e) => handleConfigChange('manoDeObra', e.target.value)}
                    className="pl-6 text-sm font-semibold"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Costo de ensamblado fijo por silla</p>
              </div>

              {/* IVA */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-background">
                <Label className="text-xs font-semibold flex items-center gap-1 text-blue-700">
                  📑 IVA (%)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={configForm.iva}
                    onChange={(e) => handleConfigChange('iva', e.target.value)}
                    className="pr-6 text-sm font-semibold"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Alícuota fiscal por defecto (21%)</p>
              </div>

              {/* Gastos Generales / Taller */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-background">
                <Label className="text-xs font-semibold flex items-center gap-1 text-amber-700">
                  📦 Gastos Generales (%)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={configForm.gastosGenerales}
                    onChange={(e) => handleConfigChange('gastosGenerales', e.target.value)}
                    className="pr-6 text-sm font-semibold"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Embalaje, fletes internos y taller</p>
              </div>

              {/* Comisiones de Venta / Pasarelas */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-background">
                <Label className="text-xs font-semibold flex items-center gap-1 text-purple-700">
                  💳 Comisiones Venta (%)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={configForm.comisiones}
                    onChange={(e) => handleConfigChange('comisiones', e.target.value)}
                    className="pr-6 text-sm font-semibold"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Mercado Pago, web y comercial</p>
              </div>

              {/* Margen Sugerido */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-background">
                <Label className="text-xs font-semibold flex items-center gap-1 text-emerald-700">
                  📈 Margen Sugerido (%)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={configForm.margenGanancia}
                    onChange={(e) => handleConfigChange('margenGanancia', e.target.value)}
                    className="pr-6 text-sm font-semibold"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Margen neto objetivo sobre costo</p>
              </div>
            </div>


            {/* SECCIÓN DE COSTOS PERSONALIZADOS DINÁMICOS */}
            <div className="p-3 rounded-lg border border-dashed bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-primary" /> Costos Adicionales Personalizados
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Podés sumar costos fijos ($) o porcentuales (%) específicos
                </span>
              </div>

              {/* Lista de costos existentes */}
              {configForm.costosPersonalizados && configForm.costosPersonalizados.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {configForm.costosPersonalizados.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-background border px-2.5 py-1 rounded-md text-xs shadow-xs"
                    >
                      <span className="font-semibold text-foreground">{c.nombre}:</span>
                      <span className="text-primary font-bold">
                        {c.tipo === 'porcentaje' ? `${c.valor}%` : `$${c.valor.toLocaleString('es-AR')}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomCost(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                        title="Quitar costo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario rápido para agregar costo adicional */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Input
                  placeholder="Ej: Embalaje especial / Flete"
                  value={newCostName}
                  onChange={(e) => setNewCostName(e.target.value)}
                  className="w-56 h-8 text-xs bg-background"
                />
                <select
                  value={newCostType}
                  onChange={(e) => setNewCostType(e.target.value as 'porcentaje' | 'fijo')}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
                >
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="fijo">Monto Fijo ($)</option>
                </select>
                <Input
                  type="number"
                  placeholder="Valor"
                  min={0}
                  value={newCostValue}
                  onChange={(e) => setNewCostValue(e.target.value)}
                  className="w-24 h-8 text-xs bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomCost}
                  className="h-8 text-xs font-medium bg-background"
                >
                  <Plus className="h-3 w-3 mr-1" /> Agregar Costo
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* TOOLBAR: Búsqueda, Filtros y Ordenamiento */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar silla por modelo o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>

          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
          >
            <option value="all">Todos los tipos</option>
            {tiposDisponibles.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer bg-card px-2.5 py-2 border rounded-md select-none">
            <input
              type="checkbox"
              checked={filterMargenBajo}
              onChange={(e) => setFilterMargenBajo(e.target.checked)}
              className="rounded"
            />
            <span>Solo margen bajo / sin precio</span>
          </label>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-xs text-muted-foreground">Ordenar por:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs font-medium"
          >
            <option value="nombre">Nombre</option>
            <option value="costo">Costo Total</option>
            <option value="precio">Precio de Venta</option>
            <option value="margen">Margen %</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-9 px-2 text-xs"
            title="Cambiar orden ascendente/descendente"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE PRECIOS Y COSTOS */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/90 dark:bg-slate-900/80 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Silla / Modelo</th>
                <th className="py-3 px-3">Costo Piezas</th>
                <th className="py-3 px-3">Mano Obra</th>
                <th className="py-3 px-3">Adicionales / Gastos</th>
                <th className="py-3 px-3 bg-slate-200/70 dark:bg-slate-800/80 font-bold text-foreground">Costo Total</th>
                <th className="py-3 px-3 text-emerald-700 dark:text-emerald-400">Precio Sugerido</th>
                <th className="py-3 px-4 min-w-[160px]">Precio Venta (ARS)</th>
                <th className="py-3 px-3">Ganancia</th>
                <th className="py-3 px-4 text-center">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sillas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                    No se encontraron sillas que coincidan con la búsqueda o filtros.
                  </td>
                </tr>
              ) : (
                sillas.map((chair) => {
                  const isSaved = savedPriceId === chair._id
                  const editVal = editingPrices[chair._id] ?? (chair.precioVenta > 0 ? String(chair.precioVenta) : '')
                  const isDirtyPrice = editingPrices[chair._id] !== undefined && Number(editingPrices[chair._id]) !== chair.precioVenta

                  // Margin badge coloring
                  let badgeColor = 'bg-red-100 text-red-800 border-red-200'
                  if (chair.margenPorcentaje >= 30) {
                    badgeColor = 'bg-green-100 text-green-800 border-green-200'
                  } else if (chair.margenPorcentaje >= 15) {
                    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200'
                  }

                  const adicionalMonto = chair.montoGastosGenerales + chair.montoCostosPersonalizados

                  return (
                    <tr key={chair._id} className="hover:bg-muted/20 transition-colors">
                      
                      {/* Silla Nombre + Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {chair.imageUrl ? (
                            <img
                              src={chair.imageUrl}
                              alt={chair.name}
                              className="w-10 h-10 object-contain rounded border bg-white shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded border bg-muted/40 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                              🪑
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground block truncate max-w-[220px]" title={chair.name}>
                              {chair.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {chair.tipo && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                  {chair.tipo}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                ({chair.bomCount} piezas)
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Costo Componentes (con botón para ver y editar desglose BOM) */}
                      <td className="py-3 px-3 font-medium">
                        <button
                          type="button"
                          onClick={() => handleOpenBOM(chair)}
                          className="flex items-center gap-1 text-primary hover:underline group cursor-pointer text-left"
                          title="Ver y editar costo de piezas"
                        >
                          <span>${chair.costoComponentes.toLocaleString('es-AR')}</span>
                          <Info className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                        </button>
                      </td>

                      {/* Mano de Obra */}
                      <td className="py-3 px-3 text-muted-foreground text-xs">
                        ${chair.manoDeObra.toLocaleString('es-AR')}
                      </td>

                      {/* Adicionales */}
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        <span title={`Gastos (${configForm.gastosGenerales}%): $${chair.montoGastosGenerales} + Personalizados: $${chair.montoCostosPersonalizados}`}>
                          +${adicionalMonto.toLocaleString('es-AR')}
                        </span>
                      </td>

                      {/* Costo Total */}
                      <td className="py-3 px-3 font-bold text-foreground bg-muted/20">
                        ${chair.costoTotal.toLocaleString('es-AR')}
                      </td>

                      {/* Precio Sugerido */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-emerald-700">
                            ${chair.precioSugerido.toLocaleString('es-AR')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplySuggested(chair)}
                            className="text-muted-foreground hover:text-emerald-700 p-0.5"
                            title="Copiar precio sugerido a precio de venta"
                          >
                            <Sparkles className="h-3 w-3" />
                          </button>
                        </div>
                      </td>

                      {/* Precio de Venta (Input inline editable) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={editVal}
                              onChange={(e) => handlePriceInputChange(chair._id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePrice(chair._id, chair.precioVenta)
                              }}
                              className={cn(
                                "h-8 pl-5 text-xs font-bold",
                                isDirtyPrice && "border-amber-400 bg-amber-50/40",
                                isSaved && "border-green-500 bg-green-50/50 text-green-800"
                              )}
                            />
                          </div>
                          
                          {isDirtyPrice && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSavePrice(chair._id, chair.precioVenta)}
                              disabled={updatePriceMutation.isPending}
                              className="h-8 px-2 bg-primary hover:bg-primary/90 text-white"
                              title="Guardar precio"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isSaved && (
                            <span className="text-green-600 text-xs font-bold animate-pulse">✓</span>
                          )}
                        </div>
                      </td>

                      {/* Ganancia */}
                      <td className="py-3 px-3 text-xs font-medium">
                        {chair.precioVenta > 0 ? (
                          <span className={chair.ganancia >= 0 ? "text-green-700 font-bold" : "text-destructive font-bold"}>
                            ${chair.ganancia.toLocaleString('es-AR')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Margen % */}
                      <td className="py-3 px-4 text-center">
                        {chair.precioVenta > 0 ? (
                          <Badge variant="outline" className={cn("text-[11px] font-bold", badgeColor)}>
                            {chair.margenPorcentaje}%
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Sin fijar
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DIALOG DE DESGLOSE Y EDICIÓN DE COSTOS BOM PARA SILLA SELECCIONADA */}
      <Dialog
        open={!!selectedChairForBOM}
        onOpenChange={(open) => !open && setSelectedChairIdForBOM(null)}
        className="max-w-2xl lg:max-w-3xl w-full overflow-x-hidden"
      >
        <div className="space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <span>Costos de Piezas (BOM):</span>
                <span className="text-primary font-bold">{selectedChairForBOM?.name}</span>
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Podés editar el costo unitario de cada pieza directamente. Al guardar, se actualizará el costo del componente en todo el sistema.
            </p>
          </DialogHeader>

          {selectedChairForBOM && (() => {
            const dynamicCostoComponentes = selectedChairForBOM.bomDetalle.reduce((acc, comp) => {
              const raw = editedCompPrices[comp.componentId]
              const price = raw !== undefined && !isNaN(Number(raw)) ? Number(raw) : comp.precioUnitario
              return acc + price * comp.cantidad
            }, 0)

            const base = dynamicCostoComponentes + selectedChairForBOM.manoDeObra
            const gastos = Math.round(base * ((Number(configForm.gastosGenerales) || 0) / 100))
            let customTotal = 0

            ;(configForm.costosPersonalizados || []).forEach((cp) => {
              customTotal += cp.tipo === 'porcentaje' ? Math.round(base * (cp.valor / 100)) : Math.round(cp.valor)
            })
            const dynamicCostoTotal = base + gastos + customTotal

            const hasPendingChanges = selectedChairForBOM.bomDetalle.some((comp) => {
              const raw = editedCompPrices[comp.componentId]
              return raw !== undefined && Number(raw) !== comp.precioUnitario && !isNaN(Number(raw)) && Number(raw) >= 0
            })

            return (
              <div className="space-y-4 pt-1">
                {/* Header Resumen Dinámico */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100/90 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs shadow-xs">
                  <div>
                    <span className="text-muted-foreground block font-medium">Costo Piezas</span>
                    <strong className="text-sm font-bold text-foreground block">
                      ${dynamicCostoComponentes.toLocaleString('es-AR')}
                    </strong>
                    {dynamicCostoComponentes !== selectedChairForBOM.costoComponentes && (
                      <span className="text-[10px] text-amber-600 font-semibold">
                        (Anterior: ${selectedChairForBOM.costoComponentes.toLocaleString('es-AR')})
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Mano de Obra (Global)</span>
                    <strong className="text-sm font-bold text-foreground block">
                      ${selectedChairForBOM.manoDeObra.toLocaleString('es-AR')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Costo Total Final</span>
                    <strong className="text-sm font-bold text-primary block">
                      ${dynamicCostoTotal.toLocaleString('es-AR')}
                    </strong>
                    {dynamicCostoTotal !== selectedChairForBOM.costoTotal && (
                      <span className="text-[10px] text-primary font-semibold">
                        (Recalculado en vivo)
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabla de Piezas Editable */}
                <div className="max-h-80 overflow-y-auto overflow-x-hidden border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 uppercase tracking-wider">
                      <tr>
                        <th className="p-2.5">Componente</th>
                        <th className="p-2.5 w-24">Tipo</th>
                        <th className="p-2.5 w-14 text-center">Cant.</th>
                        <th className="p-2.5 w-36">Costo Unitario ($)</th>
                        <th className="p-2.5 w-28 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedChairForBOM.bomDetalle.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">
                            Esta silla no tiene componentes en su BOM.
                          </td>
                        </tr>
                      ) : (
                        selectedChairForBOM.bomDetalle.map((comp, idx) => {
                          const rawPrice = editedCompPrices[comp.componentId] ?? String(comp.precioUnitario ?? 0)
                          const numPrice = !isNaN(Number(rawPrice)) ? Number(rawPrice) : comp.precioUnitario
                          const isDirty = editedCompPrices[comp.componentId] !== undefined && Number(editedCompPrices[comp.componentId]) !== comp.precioUnitario
                          const isSaved = savedCompId === comp.componentId
                          const rowSubtotal = numPrice * comp.cantidad

                          return (
                            <tr key={idx} className={cn("hover:bg-muted/20 transition-colors", isDirty && "bg-amber-50/20")}>
                              <td className="p-2.5 font-medium">
                                <span className="block text-foreground">{comp.name}</span>
                                {comp.marca && <span className="text-[10px] text-muted-foreground">{comp.marca}</span>}
                              </td>
                              <td className="p-2.5 text-muted-foreground">{comp.tipo || '—'}</td>
                              <td className="p-2.5 text-center font-bold">
                                {comp.cantidad}
                              </td>
                              
                              {/* Precio Unitario Editable */}
                              <td className="p-2">
                                <div className="flex items-center gap-1">
                                  <div className="relative flex-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={rawPrice}
                                      onChange={(e) => handleCompPriceChange(comp.componentId, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveSingleComponent(comp.componentId)
                                      }}
                                      className={cn(
                                        "h-7 pl-5 text-xs font-semibold text-right",
                                        isDirty && "border-amber-400 bg-amber-50/40 text-amber-900",
                                        isSaved && "border-green-500 bg-green-50/60 text-green-800"
                                      )}
                                    />
                                  </div>
                                  {isDirty && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSaveSingleComponent(comp.componentId)}
                                      disabled={updateComponentPriceMutation.isPending}
                                      className="h-7 w-7 p-0 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                      title="Guardar precio de este componente"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {isSaved && <span className="text-green-600 text-xs font-bold animate-pulse">✓</span>}
                                </div>
                              </td>

                              {/* Subtotal fila */}
                              <td className="p-2.5 text-right font-semibold text-primary">
                                ${rowSubtotal.toLocaleString('es-AR')}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Modal con acciones */}
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2 text-xs">
                    {savedModalSuccess && (
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <Check className="h-4 w-4" /> Costos guardados correctamente
                      </span>
                    )}
                    {hasPendingChanges && !savedModalSuccess && (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <Info className="h-3.5 w-3.5" /> Hay costos modificados pendientes de guardar
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedChairIdForBOM(null)}
                    >
                      Cerrar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveAllModifiedComponents}
                      disabled={!hasPendingChanges || updateComponentPriceMutation.isPending}
                      className="bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {updateComponentPriceMutation.isPending ? 'Guardando...' : 'Guardar Costos de Piezas'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </Dialog>
    </div>
  )
}