import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import type { ChairTypeWithBOM, Componente } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { MultiSelectAutocomplete } from '@/components/ui/multi-select-autocomplete'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Plus, Trash2, AlertTriangle, Upload, X, ArrowLeft, ArrowRight, Check, CheckCircle2, Search,
} from 'lucide-react'
import { GoBack } from '@/components/shared/GoBack'
import { qtyWithUnit, cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  tipo: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface BOMEntry { componentId: string; quantity: string }

interface GrupoComponentes { tipo: string; componentes: Componente[] }

const PASOS: { titulo: string; ayuda: string; partes: string[]; unoDe?: boolean }[] = [
  {
    titulo: 'Base y rodamiento',
    ayuda: 'Elegí las piezas que sostienen y mueven la silla',
    partes: ['Rueda', 'Estrella', 'Cilindro', 'Fuelle'],
  },
  {
    titulo: 'Mecanismo',
    ayuda: 'Elegí uno: Chapón, Mecanismo o Contacto',
    partes: ['Chapon', 'Mecanismo', 'Contacto'],
    unoDe: true,
  },
  {
    titulo: 'Confort',
    ayuda: 'Relleno, tapizado y zona de apoyo',
    partes: ['Espuma', 'Tapizado', 'Asiento', 'Respaldo', 'Apoyabrazo', 'Apoyacabezas', 'Respaldos', 'interior'],
  },
  {
    titulo: 'Herrajes',
    ayuda: 'Fijación y terminación',
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
  Respaldos: 'Respaldo',
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
  onCantidad,
  onQuitar,
}: {
  label: string
  grupo: GrupoComponentes
  seleccion?: { componentId: string; quantity: string }
  onSeleccionar: (componentId: string) => void
  onCantidad: (componentId: string, cantidad: number) => void
  onQuitar: (componentId: string) => void
}) {
  const [term, setTerm] = useState('')

  const elegido = seleccion ? grupo.componentes.find((c) => c._id === seleccion.componentId) : undefined
  const opciones = grupo.componentes.filter((c) =>
    `${c.name} ${c.subtipo ?? ''} ${c.marca ?? ''}`.toLowerCase().includes(term.toLowerCase())
  )

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{grupo.componentes.length} disponibles</span>
      </div>

      {elegido ? (
        <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
          <span className="flex-1 truncate text-sm">{elegido.name}</span>
          <input
            type="number"
            min={1}
            value={seleccion!.quantity}
            onChange={(e) => onCantidad(elegido._id, Math.max(1, Number(e.target.value) || 1))}
            className="w-14 rounded-md border border-input bg-background px-1.5 py-0.5 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Cantidad por silla"
          />
          <button
            type="button"
            onClick={() => onQuitar(elegido._id)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-input">
          <div className="relative border-b border-input">
            <Search
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={`Filtrar ${label.toLowerCase()}...`}
              className="w-full rounded-t-md py-2 pl-8 pr-3 text-sm outline-none"
            />
          </div>
          <div className="max-h-40 overflow-auto">
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
                  <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
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
  const [multiSelected, setMultiSelected] = useState<string[]>([])
  const [bomError, setBomError] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [paso, setPaso] = useState(0)

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
      // error handled by interceptor
    } finally {
      setUploading(false)
    }
  }

  const { data: compData } = useQuery<{ data: Componente[]; pagination: { total: number } }>({
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

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: isEdit && tipoData ? { name: tipoData.data.name, tipo: tipoData.data.tipo ?? '', description: tipoData.data.description ?? '' } : undefined,
  })

  const tipoWatch = useWatch<FormData>({ control, name: 'tipo' })
  const nombreWatch = useWatch<FormData>({ control, name: 'name' })
  const esGiratoria = ['giratoria', 'giratoria integral'].includes((tipoWatch ?? '').trim().toLowerCase())

  const { data: gruposData, isLoading: gruposLoading } = useQuery<{ data: GrupoComponentes[] }>({
    queryKey: ['componentes-grupos', esGiratoria ? 'Giratoria' : undefined],
    queryFn: () =>
      api
        .get('/componentes/grupos', {
          params: esGiratoria ? { tipoSilla: 'Giratoria' } : undefined,
        })
        .then((r) => r.data),
    enabled: esGiratoria,
  })

  const grupos = useMemo(() => gruposData?.data ?? [], [gruposData])

  const componentOptions = useMemo(() => {
    const lista = (compData?.data ?? []).filter((c) => {
      if (esGiratoria || !tipoWatch) return true
      return c.tipoSilla === undefined || c.tipoSilla === 'Fija' || c.tipoSilla === 'Ambas'
    })
    return lista.map((c) => ({
      value: c._id,
      label: `${c.name} (${c.tipo}${c.subtipo ? ` / ${c.subtipo}` : ''}${c.marca ? ` - ${c.marca}` : ''}) — disp. ${qtyWithUnit(c.stockDisponible, c.unit)}`,
    }))
  }, [compData, esGiratoria, tipoWatch])

  useEffect(() => {
    if (isEdit && tipoData?.data) {
      setImageUrl(tipoData.data.imageUrl ?? '')
      if (tipoData.data.bom) {
        setBom(
          tipoData.data.bom.map((b) => ({
            componentId: typeof b.componentId === 'string' ? b.componentId : (b.componentId?._id ?? ''),
            quantity: String(b.quantity),
          }))
        )
      }
    }
  }, [isEdit, tipoData])

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

  const esUltimoPaso = paso === PASOS.length
  const grupoActual = PASOS[paso]
  const partesDelPaso = useMemo(
    () => (grupoActual ? grupoActual.partes.filter((p) => grupos.some((g) => g.tipo === p)) : []),
    [grupoActual, grupos]
  )
  const pasoCompleto = grupoActual?.unoDe
    ? partesDelPaso.some((p) => !!seleccionPorParte[p])
    : partesDelPaso.every((p) => !!seleccionPorParte[p])

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

  function addMultiSelectedToBOM() {
    const existingIds = new Set(bom.map((b) => b.componentId))
    const newEntries = multiSelected
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ componentId: id, quantity: '1' }))

    if (newEntries.length === 0) {
      setBomError('Los componentes seleccionados ya están en la lista de materiales')
      setTimeout(() => setBomError(''), 3000)
      return
    }

    setBom((prev) => [...prev, ...newEntries])
    setMultiSelected([])
    setBomError('')
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

  if (isEdit && isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-4">
      <GoBack to="/tipos-silla" />
    <Card className="max-w-2xl mx-auto">
      <CardHeader><CardTitle>{isEdit ? 'Editar tipo de silla' : 'Nuevo tipo de silla'}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {esGiratoria ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <h1 className="truncate text-lg font-bold tracking-tight">
                {nombreWatch?.trim() || (isEdit ? 'Silla sin nombre' : 'Nueva silla')}
              </h1>
              <span className="shrink-0 text-xs text-muted-foreground">{isEdit ? 'Modo edición' : 'Creación'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {PASOS.map((p, i) => (
                <div key={p.titulo} className="flex flex-1 items-center gap-1.5">
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium',
                      i < paso
                        ? 'bg-green-600 text-white'
                        : i === paso
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {i < paso ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  {i < PASOS.length - 1 && <div className="h-0.5 flex-1 bg-muted" />}
                </div>
              ))}
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium',
                  esUltimoPaso ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                )}
              >
                <Check className="h-3.5 w-3.5" />
              </div>
            </div>

            {esUltimoPaso ? (
              <div>
                <h2 className="text-sm font-semibold">Revisión final</h2>
                <p className="mb-4 text-xs text-muted-foreground">Confirmá los componentes antes de guardar</p>

                <ul className="divide-y divide-border rounded-md border border-input">
                  {seleccionados.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-muted-foreground">Sin componentes seleccionados</li>
                  ) : (
                    seleccionados.map((s) => (
                      <li key={s.componentId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="truncate">{s.comp ? s.comp.name : 'Componente no encontrado'}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">x{s.quantity}</span>
                      </li>
                    ))
                  )}
                </ul>

                <div
                  className={cn(
                    'mt-4 flex items-center gap-2 rounded-md p-3 text-sm',
                    (maxSillas ?? 0) > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  )}
                >
                  {(maxSillas ?? 0) > 0 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    Con el stock actual se pueden armar <strong>{maxSillas ?? 0}</strong> silla(s) de "{nombreWatch || 'sin nombre'}".
                  </span>
                </div>
              </div>
            ) : gruposLoading || !gruposData ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{grupoActual.titulo}</h2>
                    {grupoActual.unoDe && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                        Elegí uno
                      </span>
                    )}
                  </div>
                  <p className="mb-4 text-xs text-muted-foreground">{grupoActual.ayuda}</p>
                </div>

                {paso === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input id="name" {...register('name')} />
                      {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select id="tipo" {...register('tipo')}>
                        <option value="">Seleccionar tipo...</option>
                        <option value="Fija">Fija</option>
                        <option value="Giratoria">Giratoria</option>
                        <option value="Giratoria Integral">Giratoria Integral</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Input id="description" {...register('description')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Imagen</Label>
                      <div className="flex items-start gap-4">
                        {imageUrl ? (
                          <div className="relative w-32 h-32 rounded-md border overflow-hidden shrink-0">
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setImageUrl('')}
                              className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-background"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-md border bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0">
                            Sin imagen
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Upload size={16} />
                            <span>{uploading ? 'Subiendo...' : 'Subir imagen'}</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                          </label>
                          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP o GIF. Máx 5 MB.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-5">
                  {grupoActual.partes.map((parte) => {
                    const grupo = grupos.find((g) => g.tipo === parte)
                    if (!grupo) return null
                    return (
                      <ComboCategoria
                        key={parte}
                        label={LABEL_PARTE[parte] ?? parte}
                        grupo={grupo}
                        seleccion={seleccionPorParte[parte]}
                        onSeleccionar={seleccionarComponente}
                        onCantidad={(componentId, cantidad) => updateBOMQuantity(componentId, String(cantidad))}
                        onQuitar={removeBOM}
                      />
                    )
                  })}
                </div>
              </>
            )}

            {bomError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">
                {bomError}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/tipos-silla')}>Cancelar</Button>
                <Button variant="outline" size="sm" onClick={() => setPaso((p) => Math.max(0, p - 1))} disabled={paso === 0}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Atrás
                </Button>
              </div>
              {!esUltimoPaso ? (
                <Button size="sm" className="bg-primary text-white hover:bg-primary/90" onClick={() => setPaso((p) => p + 1)} disabled={!pasoCompleto}>
                  Siguiente <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveRequest} disabled={mutation.isPending}>
                  {mutation.isPending ? 'Guardando...' : 'Guardar tipo de silla'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit((form) => mutation.mutate(form))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select id="tipo" {...register('tipo')}>
                  <option value="">Seleccionar tipo...</option>
                  <option value="Fija">Fija</option>
                  <option value="Giratoria">Giratoria</option>
                  <option value="Giratoria Integral">Giratoria Integral</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input id="description" {...register('description')} />
              </div>

              <div className="space-y-2">
                <Label>Imagen</Label>
                <div className="flex items-start gap-4">
                  {imageUrl ? (
                    <div className="relative w-32 h-32 rounded-md border overflow-hidden shrink-0">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-background"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-md border bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0">
                      Sin imagen
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Upload size={16} />
                      <span>{uploading ? 'Subiendo...' : 'Subir imagen'}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WEBP o GIF. Máx 5 MB.</p>
                  </div>
                </div>
              </div>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Lista de materiales</Label>
                {orphanCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cleanupMutation.mutate()}
                    disabled={cleanupMutation.isPending}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    <AlertTriangle size={14} className="mr-1" />
                    {cleanupMutation.isPending ? 'Limpiando...' : `Limpiar ${orphanCount} huérfano(s)`}
                  </Button>
                )}
              </div>

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
                  type="button"
                  variant="outline"
                  className="w-full lg:w-auto whitespace-nowrap"
                  disabled={multiSelected.length === 0}
                  onClick={addMultiSelectedToBOM}
                >
                  <Plus size={16} className="mr-1" />
                  Agregar {multiSelected.length > 0 ? `${multiSelected.length}` : ''}
                </Button>
              </div>

              {bomError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">
                  {bomError}
                </div>
              )}

              {bom.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Componente</TableHead>
                        <TableHead className="w-32">Cantidad</TableHead>
                        <TableHead className="w-24">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bom.map((b, i) => {
                        const comp = compData?.data.find((c) => c._id === b.componentId)
                        const isOrphan = !comp
                        return (
                          <TableRow key={b.componentId || `orphan-${i}`} className={isOrphan ? 'bg-amber-50' : undefined}>
                            <TableCell>
                              {comp ? (
                                <div>
                                  <span className="font-medium">{comp.name}</span>
                                  <p className="text-xs text-muted-foreground">
                                    Stock: <span className="font-medium text-foreground">{qtyWithUnit(comp.stockActual, comp.unit)}</span> · Disp:{' '}
                                    <span className="font-medium text-foreground">{qtyWithUnit(comp.stockDisponible, comp.unit)}</span> · Mín:{' '}
                                    <span className="font-medium text-foreground">{qtyWithUnit(comp.stockMinimo, comp.unit)}</span>
                                  </p>
                                </div>
                              ) : (
                                <span className="text-amber-700 text-sm">
                                  Componente no encontrado <span className="font-mono text-xs">({b.componentId})</span>
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="Cantidad"
                                value={b.quantity}
                                onChange={(e) => updateBOMQuantity(b.componentId, e.target.value.replace(/\D/g, ''))}
                              />
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => removeBOM(b.componentId)}>
                                  <Trash2 size={16} className="text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate('/tipos-silla')}>Cancelar</Button>
              <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveRequest} disabled={mutation.isPending}>
               {mutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogHeader>
          <DialogTitle>{isEdit ? '¿Guardar cambios?' : '¿Crear tipo de silla?'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {isEdit ? 'Se actualizarán los datos del tipo de silla.' : 'Se creará un nuevo tipo de silla con su BOM.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShowConfirm(false); handleSubmit((form) => mutation.mutate(form))() }}>Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}