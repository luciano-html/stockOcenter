import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { ChairTypeWithBOM } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { GoBack } from '@/components/shared/GoBack'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Pencil } from 'lucide-react'

export default function TipoSillaDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery<{ data: ChairTypeWithBOM }>({
    queryKey: ['tipo-silla', id],
    queryFn: () => api.get(`/tipos-silla/${id}`).then((r) => r.data),
  })

  if (isLoading) return <Skeleton className="h-96" />
  if (!data?.data) return <p className="text-muted-foreground">Tipo de silla no encontrado</p>

  const tipo = data.data
  const bom = tipo.bom ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <GoBack />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {tipo.name}
              <Badge variant="outline">{tipo.active ? 'Activo' : 'Inactivo'}</Badge>
            </CardTitle>
          </div>
          {isAdmin && (
            <Link to={`/tipos-silla/${tipo._id}/editar`}>
              <Button variant="outline" size="sm"><Pencil size={16} className="mr-1" /> Editar</Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {tipo.description ? (
            <p className="text-sm text-muted-foreground">{tipo.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sin descripción</p>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Cantidad por silla</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bom.map((item) => {
                  const comp = typeof item.componentId === 'string'
                    ? null
                    : item.componentId
                  const compIdString = typeof item.componentId === 'string'
                    ? item.componentId
                    : item.componentId._id
                  return (
                    <TableRow key={item._id} className={!comp ? 'bg-amber-50' : undefined}>
                      <TableCell className="font-medium">
                        {comp ? comp.name : 'Componente no encontrado'}
                        {!comp && (
                          <span className="font-mono text-xs text-muted-foreground ml-1">({compIdString})</span>
                        )}
                      </TableCell>
                      <TableCell>{item.quantity} {comp?.unit ?? ''}</TableCell>
                    </TableRow>
                  )
                })}
                {bom.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      Este tipo de silla no tiene componentes asignados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
