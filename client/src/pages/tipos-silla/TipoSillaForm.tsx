import { useState, useEffect } from 'react'
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
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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

  const { data: tipoData, isLoading } = useQuery<{ data: ChairTypeWithBOM }>({
    queryKey: ['tipo-silla', id],
    queryFn: () => api.get(`/tipos-silla/${id}`).then((r) => r.data),
    enabled: isEdit,
  })

  const { data: compData } = useQuery<{ data: Componente[] }>({
    queryKey: ['componentes-select'],
    queryFn: () => api.get('/componentes').then((r) => r.data),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: isEdit && tipoData ? { name: tipoData.data.name, description: tipoData.data.description ?? '' } : undefined,
  })

  useEffect(() => {
    if (isEdit && tipoData?.data.bom) {
      setBom(tipoData.data.bom.map((b) => ({ componentId: b.componentId._id, quantity: b.quantity })))
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
    mutationFn: (form: FormData) =>
      isEdit ? api.put(`/tipos-silla/${id}`, { ...form, bom }) : api.post('/tipos-silla', { ...form, bom }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-silla'] })
      navigate('/tipos-silla')
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
        </form>

        <div className="space-y-3">
          <Label>Lista de materiales</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedComponent} onChange={(e) => setSelectedComponent(e.target.value)}>
              <option value="">Seleccionar componente...</option>
              {compData?.data.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.unit})</option>
              ))}
            </Select>
            <Input type="number" min={1} className="w-24" value={selectedQty} onChange={(e) => setSelectedQty(Number(e.target.value))} />
            <Button type="button" variant="outline" onClick={addBOM} disabled={!selectedComponent}><Plus size={16} /> Agregar</Button>
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
                    return (
                      <TableRow key={b.componentId}>
                        <TableCell>{comp?.name ?? b.componentId}</TableCell>
                        <TableCell>{b.quantity}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/componentes/${b.componentId}`)}>
                              <Pencil size={16} />
                            </Button>
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
            <Button type="button" onClick={() => setShowConfirm(true)} disabled={mutation.isPending}>
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
          <Button onClick={() => { setShowConfirm(false); handleSubmit((form) => mutation.mutate(form))() }}>Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}
