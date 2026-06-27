import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { StockResumen } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
  const { data, isLoading } = useQuery<{ data: StockResumen }>({
    queryKey: ['stock-resumen'],
    queryFn: () => api.get('/stock/resumen').then((r) => r.data),
    refetchInterval: 10000,
  })

  if (isLoading) return <Skeleton className="h-96" />

  const resumen = data?.data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Componentes</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{resumen?.componentes.length ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Stock bajo</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {resumen?.componentes.filter((c) => c.stockBajo).length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sillas posibles</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {resumen?.sillasPosibles.reduce((a, b) => a + b.sillasPosibles, 0) ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Componentes con stock bajo</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumen?.componentes.filter((c) => c.stockBajo).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin alertas</TableCell></TableRow>
              )}
              {resumen?.componentes.filter((c) => c.stockBajo).map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.stockDisponible} {c.unit}</TableCell>
                  <TableCell>{c.stockMinimo}</TableCell>
                  <TableCell><Badge variant="destructive">Stock bajo</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sillas posibles por tipo</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de silla</TableHead>
                <TableHead>Sillas posibles</TableHead>
                <TableHead>Limitante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumen?.sillasPosibles.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-lg font-bold">{s.sillasPosibles}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.limitante ? `${s.limitante.name} (disp. ${s.limitante.stockDisponible}, necesita ${s.limitante.necesario} c/u)` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
