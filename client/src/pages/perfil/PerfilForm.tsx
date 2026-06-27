import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useState } from 'react'

const schema = z.object({
  name: z.string().min(1, 'Requerido').optional(),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function PerfilForm() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '' },
  })

  const mutation = useMutation({
    mutationFn: (form: FormData) => api.put('/auth/perfil', {
      ...(form.name ? { name: form.name } : {}),
      ...(form.password ? { password: form.password } : {}),
    }),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader><CardTitle>Mi perfil</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((form) => mutation.mutate(form))} className="space-y-4">
          <div className="space-y-2">
            <Label>Usuario</Label>
            <Input value={user?.username ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Input value={user?.role === 'admin' ? 'Admin' : 'Operario'} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña (dejá vacío para no cambiar)</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
          {success && <p className="text-sm text-green-600 text-center font-medium">✓ Perfil actualizado</p>}
        </form>
      </CardContent>
    </Card>
  )
}
