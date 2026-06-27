import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import type { Componente, ComponenteFiltros } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  tipo: z.string().min(1, 'Requerido'),
  marca: z.string().min(1, 'Requerido'),
  unit: z.string().min(1, 'Requerido'),
  stockMinimo: z.coerce.number().min(0, 'No puede ser negativo'),
})

type FormData = z.infer<typeof schema>

export default function ComponenteForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ data: Componente }>({
    queryKey: ['componente', id],
    queryFn: () => api.get(`/componentes/${id}`).then((r) => r.data),
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
      marca: data.data.marca,
      unit: data.data.unit,
      stockMinimo: data.data.stockMinimo,
    } : undefined,
  })

  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      isEdit ? api.put(`/componentes/${id}`, form) : api.post('/componentes', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['componentes'] })
      queryClient.invalidateQueries({ queryKey: ['componentes-filtros'] })
      navigate('/componentes')
    },
  })

  if (isEdit && isLoading) return <Skeleton className="h-64" />

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader><CardTitle>{isEdit ? 'Editar componente' : 'Nuevo componente'}</CardTitle></CardHeader>
      <CardContent>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input id="tipo" list="tipos-list" placeholder="Escribí o seleccioná..." {...register('tipo')} />
              <datalist id="tipos-list">
                {filtrosData?.data.tipos.map((t) => <option key={t} value={t} />)}
              </datalist>
              {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
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
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/componentes')}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
