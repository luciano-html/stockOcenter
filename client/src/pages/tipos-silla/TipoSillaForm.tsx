import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import type { ChairTypeWithBOM, Componente } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Plus, Trash2, AlertTriangle, Upload, X } from 'lucide-react'
import { GoBack } from '@/components/shared/GoBack'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface BOMEntry { componentId: string; quantity: number }

export default function TipoSillaForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [bom, setBom] = useState<BOMEntry[]>([])
  const [selectedComponent, setSelectedComponent] = useState('')
  const [selectedQty, setSelectedQty] = useState(1)
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
      // error handled by interceptor
    } finally {
      setUploading(false)
    }
  }

  const { data: compData } = useQuery<{ data: Componente[]; pagination: { total: number } }>({
    queryKey: ['componentes-select'],
    queryFn: () => api.get('/componentes', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const componentOptions = useMemo(
    () =>
      (compData?.data ?? []).map((c) => ({
        value: c._id,
        label: `${c.name} (${c.unit})`,
      })),
    [compData]
  )

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

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: isEdit && tipoData ? { name: tipoData.data.name, description: tipoData.data.description ?? '' } : undefined,
  })

  useEffect(() => {
    if (isEdit && tipoData?.data) {
      setImageUrl(tipoData.data.imageUrl ?? '')
      if (tipoData.data.bom) {
        setBom(
          tipoData.data.bom.map((b) => ({
            componentId: typeof b.componentId === 'string' ? b.componentId : b.componentId._id,
            quantity: b.quantity,
          }))
        )
      }
    }
  }, [isEdit, tipoData])

  function addBOM() {
    if (!selectedComponent || bom.find((b) => b.componentId === selectedComponent)) return
    setBom([...bom, { componentId: selectedComponent, quantity: selectedQty }])
    setSelectedComponent('')
    setSelectedQty(1)
  }

  function removeBOM(componentId: string) {
    setBom(bom.filter((b) => b.componentId !== componentId))
  }

  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const payload = { ...form, bom, imageUrl: imageUrl || undefined }
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
      <GoBack />
    <Card className="max-w-2xl mx-auto">
      <CardHeader><CardTitle>{isEdit ? 'Editar tipo de silla' : 'Nuevo tipo de silla'}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit((form) => mutation.mutate(form))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Autocomplete
                options={componentOptions}
                value={selectedComponent}
                onChange={setSelectedComponent}
                placeholder="Buscar componente..."
              />
            </div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Cant."
              className="w-24"
              value={selectedQty}
              onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))}
            />
            <Button type="button" variant="outline" onClick={addBOM} disabled={!selectedComponent || selectedQty < 1}>
              <Plus size={16} className="mr-1" /> Agregar
            </Button>
          </div>

          {bom.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bom.map((b) => {
                    const comp = compData?.data.find((c) => c._id === b.componentId)
                    const isOrphan = !comp
                    return (
                      <TableRow key={b.componentId} className={isOrphan ? 'bg-amber-50' : undefined}>
                        <TableCell>
                          {comp ? (
                            <span className="font-medium">{comp.name}</span>
                          ) : (
                            <span className="text-amber-700 text-sm">
                              Componente no encontrado <span className="font-mono text-xs">({b.componentId})</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{b.quantity}</TableCell>
                        <TableCell>
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
            <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowConfirm(true)} disabled={mutation.isPending}>
             {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
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
