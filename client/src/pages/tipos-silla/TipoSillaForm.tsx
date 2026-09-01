import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import type { ChairTypeWithBOM, Componente } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Upload, X, Check, CheckCircle2, Search, Trash2 } from 'lucide-react'
import { GoBack } from '@/components/shared/GoBack'
import { cn } from '@/lib/utils'


const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  tipo: z.string().optional(),
  description: z.string().optional(),
  precioVenta: z.any().transform(v => Number(v) || 0),
  margen: z.any().transform(v => Number(v) || 0),
})

type FormData = z.infer<typeof schema>


interface BOMEntry { componentId: string; quantity: string }
interface GrupoComponentes { tipo: string; componentes: Componente[] }

const SECCIONES = [
  {
    titulo: 'Base y rodamiento',
    partes: ['Rueda', 'Estrella', 'Cilindro', 'Fuelle'],
  },
  {
    titulo: 'Mecanismo y estructura',
    partes: ['Chapon', 'Mecanismo', 'Contacto', 'Estructura'],
  },
  {
    titulo: 'Confort',
    partes: ['Espuma', 'Tapizado', 'Asiento', 'Respaldo', 'Apoyabrazo', 'Apoyacabezas', 'interior'],
  },
  {
    titulo: 'Herrajes',
    partes: ['Tornilleria'],
  },
]

const LABEL_PARTE: Record<string, string> = {
  Rueda: 'Rueda',
  Estrella: 'Estrella',
  Cilindro: 'Cilindro',
  Chapon: 'Chapón',
  Fuelle: 'Fuelle',
  Mecanismo: 'Mecanismo',
  Espuma: 'Espuma',
  Tapizado: 'Tapizado',
  Asiento: 'Asiento',
  Respaldo: 'Respaldo',
  Apoyabrazo: 'Apoyabrazos',
  Apoyacabezas: 'Apoyacabezas',
  interior: 'Interior',
  Tornilleria: 'Tornillería',
  Estructura: 'Estructura',
  Contacto: 'Contacto',
}

function ComboCategoria({
  label,
  grupo,
  seleccion,
  onSeleccionar,
  onQuitar,
}: {
  label: string
  grupo: GrupoComponentes
  seleccion?: { componentId: string }
  onSeleccionar: (componentId: string) => void
  onQuitar: (componentId: string) => void
}) {
  const [term, setTerm] = useState('')
  const elegido = seleccion ? grupo.componentes.find((c) => c._id === seleccion.componentId) : undefined
  const opciones = grupo.componentes.filter((c) =>
    `${c.name} ${c.subtipo ?? ''} ${c.marca ?? ''}`.toLowerCase().includes(term.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{grupo.componentes.length} disp.</span>
      </div>

      {elegido ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 flex-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <Check className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium" title={elegido.name}>{elegido.name}</span>
          </div>
          <button
            type="button"
            onClick={() => onQuitar(elegido._id)}
            className="text-xs font-medium text-destructive hover:underline shrink-0"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-input flex flex-col flex-1">
          <div className="relative border-b border-input">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={`Buscar ${label.toLowerCase()}...`}
              className="w-full py-1.5 pl-8 pr-3 text-sm outline-none bg-transparent"
            />
          </div>
          <div className="max-h-40 overflow-auto bg-background/50 rounded-b-md">
            {opciones.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
            )}
            {opciones.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => {
                  onSeleccionar(c._id)
                  setTerm('')
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{c.name}</span>
                {c.subtipo || c.marca ? (
                  <span className="ml-2 shrink-0 text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded">
                    {[c.subtipo, c.marca].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TipoSillaForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [showConfirm, setShowConfirm] = useState(false)
  const [bom, setBom] = useState<BOMEntry[]>([])
  const [bomError, setBomError] = useState('')
  const [aviso, setAviso] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data: tipoData, isLoading } = useQuery<{ data: ChairTypeWithBOM }>({

    queryKey: ['tipo-silla', id],
    queryFn: () => api.get(`/tipos-silla/${id}`).then((r) => r.data),
    enabled: isEdit,
  })

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.post('/tipos-silla/imagenes/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImageUrl(res.data.data.imageUrl)
    } catch {
      // error manejado por interceptor
    } finally {
      setUploading(false)
    }
  }

  const { data: compData } = useQuery<{ data: Componente[] }>({
    queryKey: ['componentes-select'],
    queryFn: () => api.get('/componentes', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const orphanCount = useMemo(
    () => bom.filter((b) => !compData?.data.find((c) => c._id === b.componentId)).length,
    [bom, compData]
  )

  const cleanupMutation = useMutation({
    mutationFn: () => api.post('/tipos-silla/limpiar-huerfanos').then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipo-silla', id] })
      queryClient.invalidateQueries({ queryKey: ['tipos-silla'] })
    },
  })

  const { data: pricingData } = useQuery<{ data: { config: { manoDeObra: number } } }>({
    queryKey: ['pricing-overview'],
    queryFn: () => api.get('/pricing').then((r) => r.data),
    staleTime: 60000,
  })
  const manoDeObraGlobal = pricingData?.data?.config?.manoDeObra ?? 25000

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', tipo: '', description: '', precioVenta: 0, margen: 0 },
    values: isEdit && tipoData ? { 
      name: tipoData.data.name, 
      tipo: tipoData.data.tipo ?? '', 
      description: tipoData.data.description ?? '',
      precioVenta: (tipoData.data as any).precioVenta ?? 0,
      margen: 0
    } : undefined,
  })

  const tipoWatch = useWatch({ control, name: 'tipo' })
  const nombreWatch = useWatch({ control, name: 'name' })
  const precioVentaWatch = useWatch({ control, name: 'precioVenta' })
  const margenWatch = useWatch({ control, name: 'margen' })


  const categoria = useMemo(() => {
    const t = (tipoWatch ?? '').trim().toLowerCase()
    if (t.startsWith('giratoria')) return 'Giratoria'
    if (t === 'fija') return 'Fija'
    return undefined
  }, [tipoWatch])

  const { data: gruposData, isLoading: gruposLoading } = useQuery<{ data: GrupoComponentes[] }>({
    queryKey: ['componentes-grupos', categoria],
    queryFn: () =>
      api
        .get('/componentes/grupos', {
          params: categoria ? { tipoSilla: categoria } : undefined,
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const grupos = useMemo(() => gruposData?.data ?? [], [gruposData])

  useEffect(() => {
    if (isEdit && tipoData?.data) {
      setImageUrl(tipoData.data.imageUrl ?? '')
      if (tipoData.data.bom) {
        setBom(
          tipoData.data.bom.map((b) => ({
            componentId: typeof b.componentId === 'string' ? b.componentId : (b.componentId?._id ?? ''),
            quantity: b.quantity.toString(),
          }))
        )
      }
      
      // Calculate initial margin if we have precioVenta and bom loaded
      if (tipoData.data.bom) {
        const _bom = tipoData.data.bom;
        const _compData = compData?.data ?? [];
        if (_compData.length > 0) {
           let initCosto = 0;
           for (const b of _bom) {
             const cId = typeof b.componentId === 'string' ? b.componentId : (b.componentId?._id ?? '');
             const comp = _compData.find(c => c._id === cId);
             if (comp) initCosto += (comp.precio ?? 0) * (Number(b.quantity) || 0);
           }
           initCosto += manoDeObraGlobal;
           const initPrecioVenta = Number((tipoData.data as any).precioVenta) || 0;
           if (initCosto > 0 && initPrecioVenta > 0) {
             const calcMargen = Math.round(((initPrecioVenta - initCosto) / initCosto) * 100);
             setValue('margen', calcMargen);
           }
        }
      }
    }
  }, [isEdit, tipoData, compData, manoDeObraGlobal, setValue])

  useEffect(() => {
    const t = (tipoWatch ?? '').trim().toLowerCase()
    if (!t || !compData?.data) return
    const aplica = t.startsWith('giratoria') ? 'Giratoria' : 'Fija'
    const invalidos = bom.filter((b) => {
      const comp = compData.data.find((c) => c._id === b.componentId)
      if (!comp) return false
      return comp.tipoSilla !== undefined && comp.tipoSilla !== 'Ambas' && comp.tipoSilla !== aplica
    })
    if (invalidos.length > 0) {
      const ids = new Set(invalidos.map((b) => b.componentId))
      setBom((prev) => prev.filter((b) => !ids.has(b.componentId)))
      setAviso(`Se quitaron ${invalidos.length} componente(s) que no aplican al tipo ${aplica}`)
      setTimeout(() => setAviso(''), 6000)
    }
  }, [tipoWatch, bom, compData])

  const seleccionPorParte = useMemo(() => {
    const map: Record<string, BOMEntry> = {}
    for (const grupo of grupos) {
      const entry = bom.find((b) => grupo.componentes.some((c) => c._id === b.componentId))
      if (entry) map[grupo.tipo] = entry
    }
    return map
  }, [grupos, bom])

  const seleccionados = useMemo(
    () => bom.map((b) => ({ ...b, comp: compData?.data.find((c) => c._id === b.componentId) ?? null })),
    [bom, compData]
  )

  const costoEstimado = useMemo(() => {
    const costoPiezas = seleccionados.reduce((acc, s) => acc + (s.comp?.precio ?? 0) * (Number(s.quantity) || 0), 0)
    return costoPiezas + manoDeObraGlobal
  }, [seleccionados, manoDeObraGlobal])


  useEffect(() => {
    if (Number(margenWatch) > 0 && costoEstimado > 0) {
      const nuevoPrecio = costoEstimado * (1 + Number(margenWatch) / 100)
      setValue('precioVenta', Math.round(nuevoPrecio), { shouldValidate: true })
    }
  }, [costoEstimado, margenWatch, setValue])

  const maxSillas = useMemo(() => {
    const ratios = bom
      .map((b) => {
        const comp = compData?.data.find((c) => c._id === b.componentId)
        if (!comp) return null
        return Math.floor(comp.stockDisponible / Math.max(1, Number(b.quantity) || 1))
      })
      .filter((r): r is number => r !== null)
    
    if (ratios.length === 0) return null
    return Math.min(...ratios)
  }, [bom, compData])

  const seccionesActivas = useMemo(() => {
    return SECCIONES.map((sec) => ({
      ...sec,
      partes: sec.partes.filter((p) => grupos.some((g) => g.tipo === p)),
    })).filter((sec) => sec.partes.length > 0)
  }, [grupos])

  function seleccionarComponente(componentId: string) {
    const parte = grupos.find((g) => g.componentes.some((c) => c._id === componentId))?.tipo
    setBom((prev) => {
      let cantidadAnterior = '1'
      let next = prev
      if (parte) {
        const grupo = grupos.find((g) => g.tipo === parte)!
        const idsParte = new Set(grupo.componentes.map((c) => c._id))
        const anterior = prev.find((b) => idsParte.has(b.componentId))
        if (anterior) cantidadAnterior = anterior.quantity
        next = prev.filter((b) => !idsParte.has(b.componentId))
      }
      return [...next, { componentId, quantity: cantidadAnterior }]
    })
  }

  function updateBOMQuantity(componentId: string, value: string) {
    setBom((prev) => prev.map((b) => (b.componentId === componentId ? { ...b, quantity: value } : b)))
  }

  function removeBOM(componentId: string) {
    setBom(bom.filter((b) => b.componentId !== componentId))
  }

  function handleSaveRequest() {
    const invalid = bom.some((b) => !b.componentId || Number(b.quantity) < 1 || b.quantity === '')
    if (invalid) {
      setBomError('La cantidad de cada componente debe ser al menos 1')
      setTimeout(() => setBomError(''), 3000)
      return
    }
    setShowConfirm(true)
  }

  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const payload = {
        ...form,
        bom: bom.map((b) => ({ componentId: b.componentId, quantity: Number(b.quantity) })),
        imageUrl: imageUrl || undefined,
      }
      return isEdit ? api.put(`/tipos-silla/${id}`, payload) : api.post('/tipos-silla', payload)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tipos-silla'] })
      navigate(`/tipos-silla/${res.data.data._id}`)
    },
  })

  if ((isEdit && isLoading) || (gruposLoading && !gruposData)) {
    return <div className="space-y-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-[600px] w-full" /></div>
  }

  return (
    <div className="space-y-4 pb-10">
      <GoBack to="/tipos-silla" />
      
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">
          {nombreWatch?.trim() || (isEdit ? 'Silla sin nombre' : 'Crear Silla')}
        </h1>
        {isEdit && <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">Modo edición</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA (Formulario y Catálogo) */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Datos Generales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de la Silla</Label>
                    <Input id="name" {...register('name')} placeholder="Ej: Silla Link Base Cromo" />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo estructural</Label>
                    <Select id="tipo" {...register('tipo')}>
                      <option value="">Seleccionar...</option>
                      <option value="Fija">Fija</option>
                      <option value="Giratoria">Giratoria</option>
                      <option value="Giratoria Integral">Giratoria Integral</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Input id="description" {...register('description')} placeholder="Características clave..." />
                  </div>
                </div>
                
                {/* Upload Imagen */}
                <div className="space-y-2">
                  <Label>Imagen Representativa</Label>
                  <div className="flex flex-col items-start gap-3 border rounded-md p-3 bg-muted/20 h-[216px] justify-center">
                    {imageUrl ? (
                      <div className="relative w-full h-full rounded border overflow-hidden">
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="absolute top-2 right-2 bg-background/90 rounded-full p-1 shadow hover:bg-background"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full flex-1 rounded border-2 border-dashed bg-background flex flex-col items-center justify-center text-muted-foreground">
                        <Upload className="mb-2 h-6 w-6 opacity-50" />
                        <span className="text-sm font-medium">Sin imagen</span>
                        <p className="text-[10px] mt-1">JPG, PNG o WEBP (Máx 5MB)</p>
                      </div>
                    )}
                    {!imageUrl && (
                      <label className="cursor-pointer w-full text-center bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium py-2 rounded-md transition-colors">
                        <span>{uploading ? 'Subiendo...' : 'Seleccionar archivo'}</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {aviso && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
              {aviso}
            </div>
          )}

          {tipoWatch ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Catálogo de Componentes (BOM)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {seccionesActivas.map((sec) => (
                  <div key={sec.titulo} className="space-y-3">
                    <h3 className="font-semibold text-sm border-b pb-1 text-foreground/80">{sec.titulo}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sec.partes.map((parte) => {
                        const grupo = grupos.find((g) => g.tipo === parte)
                        if (!grupo) return null
                        return (
                          <ComboCategoria
                            key={parte}
                            label={LABEL_PARTE[parte] ?? parte}
                            grupo={grupo}
                            seleccion={seleccionPorParte[parte]}
                            onSeleccionar={seleccionarComponente}
                            onQuitar={removeBOM}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              Selecciona el <strong>Tipo estructural</strong> arriba para habilitar el catálogo de piezas.
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (BOM Sticky) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4 self-start">
          <Card className="border-primary/20 shadow-sm flex flex-col max-h-[calc(100vh-12rem)]">
            <CardHeader className="bg-muted/30 pb-4 shrink-0">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Tu Silla</span>
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {seleccionados.length} piezas
                </span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-4 space-y-4 flex-1 overflow-y-auto">
              
              {/* Badge de Sillas Posibles */}
              {(maxSillas ?? 0) > 0 ? (
                <div className="p-3 rounded-md bg-green-50 text-green-800 border border-green-200 flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <div className="text-sm">
                    <span className="block font-bold">Sillas Posibles: {maxSillas}</span>
                    <span className="text-xs opacity-90">Proyección según stock actual</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="text-sm">
                    <span className="block font-bold">Sillas Posibles: {maxSillas === null ? '—' : '0'}</span>
                    <span className="text-xs opacity-90">
                      {maxSillas === null ? 'Agrega piezas para ver proyección' : 'No hay stock de alguna pieza'}
                    </span>
                  </div>
                </div>
              )}

              {/* Costo Estimado */}
              <div className="p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                <span className="block font-bold text-base">Costo Estimado: ${costoEstimado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                <span className="text-xs opacity-90">Basado en el precio de los componentes</span>
              </div>

              {/* Precio Venta y Ganancia */}
              <div className="p-3 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                <span className="block font-bold text-base">Precio de Venta: ${(precioVentaWatch || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                <span className="block text-[13px] font-semibold mt-0.5 text-purple-700">
                  Ganancia Proyectada: ${((precioVentaWatch || 0) - costoEstimado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {orphanCount > 0 && (
                <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                  <span className="flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-3 w-3 shrink-0" /> {orphanCount} pieza(s) huérfana(s)
                  </span>
                  <Button variant="outline" size="sm" onClick={() => cleanupMutation.mutate()} disabled={cleanupMutation.isPending} className="h-7 text-xs bg-white">
                    Limpiar lista
                  </Button>
                </div>
              )}

              <div className="pr-1 -mr-1 space-y-2">
                {/* Mano de Obra informativa */}
                <div className="flex flex-col gap-1 p-2.5 rounded-md border bg-blue-50/50 border-blue-200 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-xs text-blue-900">Mano de Obra (Global):</span>
                    <span className="font-bold text-xs text-blue-950">${manoDeObraGlobal.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Configurada centralmente en Gráficos → Precios y Costos</p>
                </div>


                {seleccionados.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No has agregado ninguna pieza aún.</p>
                ) : (
                  seleccionados.map((s) => {
                    const errorCant = !s.quantity || Number(s.quantity) < 1;
                    return (
                      <div key={s.componentId} className={cn("flex flex-col gap-1.5 p-2 rounded-md border bg-card text-sm", errorCant && "border-destructive bg-destructive/5")}>
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-medium leading-tight text-[13px]">{s.comp ? s.comp.name : 'Desconocido'}</span>
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            <button type="button" onClick={() => removeBOM(s.componentId)} className="text-muted-foreground hover:text-destructive transition-colors" title="Quitar componente del BOM">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Cantidad:</span>
                          <input
                            type="number"
                            min={1}
                            value={s.quantity}
                            onChange={(e) => updateBOMQuantity(s.componentId, e.target.value)}
                            className={cn(
                              "w-16 rounded border bg-background px-2 py-0.5 text-right text-xs focus:outline-none focus:ring-1",
                              errorCant ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'
                            )}
                          />
                        </div>
                        <div className="flex items-center justify-between border-t border-muted/50 pt-1.5 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">Precio U.: ${(s.comp?.precio ?? 0).toLocaleString('es-AR')}</span>
                          <span className="text-[11px] font-semibold text-red-600">Subtotal: ${((s.comp?.precio ?? 0) * (Number(s.quantity) || 0)).toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {bomError && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 font-medium">
                  {bomError}
                </div>
              )}

            </CardContent>

            <div className="p-4 border-t bg-muted/10 rounded-b-lg shrink-0">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={handleSaveRequest} disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : 'Guardar Tipo de Silla'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogHeader>
          <DialogTitle>{isEdit ? '¿Guardar cambios?' : '¿Crear tipo de silla?'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {isEdit ? 'Se actualizarán los datos de la silla.' : 'Se guardará la silla con su lista de materiales.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShowConfirm(false); handleSubmit((form) => mutation.mutate(form))() }}>Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}