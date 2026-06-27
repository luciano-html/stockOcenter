import { BOMItem, Component, ChairType } from '../models';

export async function calcularSillasPosibles(chairTypeId: string) {
  const bom = await BOMItem.find({ chairTypeId }).populate('componentId', 'stockActual stockReservado name');
  if (!bom.length) return 0;

  let minSillas = Infinity;
  for (const item of bom) {
    const comp = item.componentId as unknown as { stockActual: number; stockReservado: number; name: string };
    if (!comp) return 0;
    const disponible = comp.stockActual - comp.stockReservado;
    const sillas = Math.floor(disponible / item.quantity);
    if (sillas < minSillas) minSillas = sillas;
  }

  return minSillas === Infinity ? 0 : minSillas;
}

export async function calcularSillasPosiblesConDetalle(chairTypeId: string) {
  const bom = await BOMItem.find({ chairTypeId }).populate('componentId', 'stockActual stockReservado name unit');
  if (!bom.length) return { sillasPosibles: 0, limitante: null };

  let minSillas = Infinity;
  let limitante: { name: string; stockDisponible: number; necesario: number } | null = null;

  for (const item of bom) {
    const comp = item.componentId as unknown as { stockActual: number; stockReservado: number; name: string; unit?: string };
    if (!comp) continue;
    const disponible = comp.stockActual - comp.stockReservado;
    const necesario = item.quantity;
    const sillas = Math.floor(disponible / necesario);

    if (sillas < minSillas) {
      minSillas = sillas;
      limitante = { name: comp.name, stockDisponible: disponible, necesario };
    }
  }

  return {
    sillasPosibles: minSillas === Infinity ? 0 : minSillas,
    limitante,
  };
}

export async function sillasPosiblesPorTipo() {
  const tipos = await ChairType.find({ active: true });
  const resultados: { _id: string; name: string; sillasPosibles: number; limitante: { name: string; stockDisponible: number; necesario: number } | null }[] = [];

  for (const tipo of tipos) {
    const detalle = await calcularSillasPosiblesConDetalle(tipo._id.toString());
    resultados.push({
      _id: tipo._id.toString(),
      name: tipo.name,
      ...detalle,
    });
  }

  return resultados;
}
