import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import type { Componente, ComponenteFiltros } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'


const schema: z.ZodType<FormData, any, any> = z.object({
  name: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  tipo: z.string().min(1, 'Requerido'),
  subtipo: z.string().optional(),
  marca: z.string().optional(),
  unit: z.string().min(1, 'Requerido'),
  stockMinimo: z.coerce.number().min(0, 'No puede ser negativo'),
  precio: z.coerce.number().min(0, 'No puede ser negativo').default(0),
  tipoSilla: z.enum(['Giratoria', 'Fija', 'Ambas']),
})

type FormData = {
  name: string
  description?: string
  tipo: string
  subtipo?: string
  marca?: string
  unit: string
  stockMinimo: number
  precio: number
  tipoSilla: 'Giratoria' | 'Fija' | 'Ambas'
}

export default function ComponenteForm({ componentId, onSuccess, onCancel }: { componentId?: string; onSuccess?: () => void; onCancel?: () => void }) {
  const isEdit = !!componentId
  const queryClient = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)

  const { data, isLoading } = useQuery<{ data: Componente }>({
    queryKey: ['componente', componentId],
    queryFn: () => api.get(`/componentes/${componentId}`).then((r) => r.data),
    enabled: isEdit,
  })

  const { data: filtrosData } = useQuery<{ data: ComponenteFiltros }>({
    queryKey: ['componentes-filtros'],
    queryFn: () => api.get('/componentes/filtros').then((r) => r.data),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: isEdit && data ? {
      name: data.data.name,
      description: data.data.description ?? '',
      tipo: data.data.tipo,
      subtipo: data.data.subtipo ?? '',
      marca: data.data.marca,
      unit: data.data.unit,
      stockMinimo: data.data.stockMinimo,
      precio: data.data.precio ?? 0,
      tipoSilla: data.data.tipoSilla ?? 'Ambas',
    } : { precio: 0 } as any,
  })

  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      isEdit ? api.put(`/componentes/${componentId}`, form) : api.post('/componentes', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['componentes'] })
      queryClient.invalidateQueries({ queryKey: ['componente', componentId] })
      queryClient.invalidateQueries({ queryKey: ['componentes-filtros'] })
      queryClient.invalidateQueries({ queryKey: ['tipo-silla-bom'] })
      queryClient.invalidateQueries({ queryKey: ['tipos-silla'] })
      if (onSuccess) onSuccess()
    },
  })

  if (isEdit && isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4 h-full flex flex-col">
    <Card className="flex-1 overflow-auto border-0 shadow-none sm:mx-0">
      <CardHeader className="px-0 pt-0"><CardTitle>{isEdit ? 'Editar componente' : 'Nuevo componente'}</CardTitle></CardHeader>
      <CardContent className="px-0 pb-0">
        <form onSubmit={handleSubmit((form) => mutation.mutate(form))} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" {...register('description')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input id="tipo" list="tipos-list" placeholder="Escribí o seleccioná..." {...register('tipo')} />
              <datalist id="tipos-list">
                {filtrosData?.data.tipos.map((t) => <option key={t} value={t} />)}
              </datalist>
              {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtipo">Sub-tipo</Label>
              <Input id="subtipo" list="subtipos-list" placeholder="Opcional..." {...register('subtipo')} />
              <datalist id="subtipos-list">
                {filtrosData?.data.subTipos.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" list="marcas-list" placeholder="Escribí o seleccioná..." {...register('marca')} />
              <datalist id="marcas-list">
                {filtrosData?.data.marcas.map((m) => <option key={m} value={m} />)}
              </datalist>
              {errors.marca && <p className="text-xs text-destructive">{errors.marca.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="unit">Unidad</Label>
              <Input id="unit" placeholder="ej. unidad, par, juego" {...register('unit')} />
              {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockMinimo">Stock mínimo</Label>
              <Input id="stockMinimo" type="number" {...register('stockMinimo')} />
              {errors.stockMinimo && <p className="text-xs text-destructive">{errors.stockMinimo.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipoSilla">Se usa en</Label>
            <Select id="tipoSilla" {...register('tipoSilla')}>
              <option value="Ambas">Fija y Giratoria</option>
              <option value="Giratoria">Solo Giratoria</option>
              <option value="Fija">Solo Fija</option>
            </Select>
            <p className="text-xs text-muted-foreground">Determina en qué tipo de silla (Fija o Giratoria) aparece este componente al armar la lista de materiales.</p>
            {errors.tipoSilla && <p className="text-xs text-destructive">{errors.tipoSilla.message}</p>}
          </div>
          <div className="flex gap-2 justify-end pt-6">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowConfirm(true)} disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogHeader>
          <DialogTitle>{isEdit ? '¿Guardar cambios?' : '¿Crear componente?'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {isEdit ? 'Se actualizarán los datos del componente.' : 'Se creará un nuevo componente.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShowConfirm(false); handleSubmit((form) => mutation.mutate(form))() }}>Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}
