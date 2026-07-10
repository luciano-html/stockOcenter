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
import { Pencil, Package, Armchair, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const sillasPosibles = tipo.sillasPosibles ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <GoBack />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{tipo.name}</h1>
        {isAdmin && (
          <Link to={`/tipos-silla/${tipo._id}/editar`}>
            <Button variant="outline" size="sm"><Pencil size={16} className="mr-1" /> Editar</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Armchair size={12} /> Estado</p>
              {tipo.active
                ? <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">Activo</Badge>
                : <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-100">Inactivo</Badge>}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Package size={12} /> Componentes</p>
              <p className="font-medium">{bom.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">Sillas posibles</p>
              <p className={cn('font-bold', sillasPosibles === 0 ? 'text-destructive' : 'text-green-600')}>
                {sillasPosibles}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Stock limitante</p>
              {tipo.sillasPosibles === 0 && bom.length > 0 ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle size={12} /> Sin stock
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Disponible</p>
              )}
            </div>
          </div>
          {tipo.description ? (
            <p className="text-sm text-muted-foreground mt-4 border-t pt-3">{tipo.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic mt-4 border-t pt-3">Sin descripción</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package size={18} />
            Lista de materiales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead className="text-right">Cantidad por silla</TableHead>
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
                        {comp ? (
                          <Link to={`/componentes/${compIdString}`} className="hover:text-primary hover:underline">
                            {comp.name}
                          </Link>
                        ) : (
                          <span className="text-amber-700">
                            Componente no encontrado
                            <span className="font-mono text-xs text-muted-foreground ml-1">({compIdString})</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity} {comp?.unit ?? ''}</TableCell>
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
