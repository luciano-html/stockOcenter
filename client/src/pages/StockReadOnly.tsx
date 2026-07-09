import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { StockResumen } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GoBack } from '@/components/shared/GoBack'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function StockReadOnly() {
  const { data: resumenData, isLoading } = useQuery<{ data: StockResumen }>({
    queryKey: ['stock-resumen'],
    queryFn: () => api.get('/stock/resumen').then((r) => r.data),
  })

  if (isLoading) return <Skeleton className="h-96" />

  const componentes = resumenData?.data?.componentes ?? []
  const sillasPosibles = resumenData?.data?.sillasPosibles ?? []

  return (
    <div className="space-y-6">
      <GoBack />

      <Card>
        <CardHeader>
          <CardTitle>Stock de componentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Stock actual</TableHead>
                  <TableHead>Reservado</TableHead>
                  <TableHead>Disponible</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {componentes.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.stockActual} {c.unit}</TableCell>
                    <TableCell>{c.stockReservado} {c.unit}</TableCell>
                    <TableCell>{c.stockDisponible} {c.unit}</TableCell>
                    <TableCell>{c.stockMinimo} {c.unit}</TableCell>
                    <TableCell>
                      {c.stockBajo ? (
                        <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">Bajo</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {componentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Sin componentes registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock de sillas posibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de silla</TableHead>
                  <TableHead>Cantidad posible</TableHead>
                  <TableHead>Limitante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sillasPosibles.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.sillasPosibles}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.limitante
                        ? `${s.limitante.name} (disp. ${s.limitante.stockDisponible}, necesita ${s.limitante.necesario})`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {sillasPosibles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Sin tipos de silla registrados
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
