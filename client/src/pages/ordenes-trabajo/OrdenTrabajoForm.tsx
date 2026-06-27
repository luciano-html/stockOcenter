import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import type { ChairType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const schema = z.object({
  chairTypeId: z.string().min(1, 'Seleccioná un tipo de silla'),
  quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
})

type FormData = z.infer<typeof schema>

export default function OrdenTrabajoForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: tiposData, isLoading } = useQuery<{ data: ChairType[] }>({
    queryKey: ['tipos-silla-select'],
    queryFn: () => api.get('/tipos-silla').then((r) => r.data),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (form: FormData) => api.post('/ordenes-trabajo', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      navigate('/ordenes-trabajo')
    },
  })

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader><CardTitle>Nueva orden de trabajo</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((form) => mutation.mutate(form))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chairTypeId">Tipo de silla</Label>
            <Select id="chairTypeId" {...register('chairTypeId')}>
              <option value="">Seleccionar...</option>
              {tiposData?.data.filter((t) => t.active).map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </Select>
            {errors.chairTypeId && <p className="text-xs text-destructive">{errors.chairTypeId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad de sillas</Label>
            <Input id="quantity" type="number" min={1} {...register('quantity')} />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/ordenes-trabajo')}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creando...' : 'Crear orden'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
