import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { StockResumen } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GoBack } from '@/components/shared/GoBack'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Package, AlertTriangle, CheckCircle, Armchair } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      <h1 className="text-2xl font-bold tracking-tight">Stock disponible</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package size={18} />
            Componentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead className="text-right">Stock actual</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {componentes.map((c) => (
                  <TableRow key={c._id} className={cn(c.stockBajo && 'bg-red-50/60')}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.stockActual} {c.unit}</TableCell>
                    <TableCell className={cn('text-right', c.stockReservado > 0 && 'text-amber-600 font-bold')}>{c.stockReservado} {c.unit}</TableCell>
                    <TableCell className="text-right font-medium">{c.stockDisponible} {c.unit}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.stockMinimo} {c.unit}</TableCell>
                    <TableCell>
                      {c.stockBajo ? (
                        <Badge variant="destructive"><AlertTriangle size={12} className="mr-1" /> Bajo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50"><CheckCircle size={12} className="mr-1" /> OK</Badge>
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
          <CardTitle className="text-base flex items-center gap-2">
            <Armchair size={18} />
            Sillas posibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de silla</TableHead>
                  <TableHead className="text-right">Cantidad posible</TableHead>
                  <TableHead>Limitante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sillasPosibles.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className={cn('text-right font-bold', s.sillasPosibles === 0 ? 'text-destructive' : 'text-green-600')}>{s.sillasPosibles}</TableCell>
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
