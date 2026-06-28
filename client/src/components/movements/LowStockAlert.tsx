import type { Componente } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface Props {
  componentes: Componente[]
}

export default function LowStockAlert({ componentes }: Props) {
  const bajos = componentes.filter((c) => c.stockBajo)

  return (
    <Card>
      <CardHeader><CardTitle>Componentes con stock bajo</CardTitle></CardHeader>
      <CardContent>
        {bajos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin alertas</p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Disponible</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bajos.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className={c.stockDisponible === 0 ? 'text-destructive font-bold' : 'text-amber-600 font-bold'}>
                      {c.stockDisponible === 0 ? 'Sin stock' : `${c.stockDisponible} ${c.unit}`}
                    </TableCell>
                    <TableCell>
                      {c.stockDisponible === 0
                        ? <Badge variant="destructive">Sin stock</Badge>
                        : <Badge variant="outline" className="text-amber-600 border-amber-600">Stock bajo</Badge>
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
