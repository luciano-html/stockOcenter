import { Request, Response } from 'express';
import { Component, ChairType, BOMItem, StockMovement } from '../models';
import { ApiError } from '../utils/ApiError';

export async function ingreso(req: Request, res: Response) {
  const { componenteId, cantidad, notas } = req.body;

  const componente = await Component.findByIdAndUpdate(
    componenteId,
    { $inc: { stockActual: cantidad } },
    { new: true }
  );
  if (!componente) throw ApiError.notFound('Componente no encontrado');

  await StockMovement.create({
    componentId: componenteId,
    type: 'ingreso',
    quantity: cantidad,
    notes: notas,
  });

  res.json({ data: componente });
}

export async function resumen(_req: Request, res: Response) {
  const componentes = await Component.find().sort({ name: 1 });
  const tiposSilla = await ChairType.find({ active: true });

  const sillasPosibles = await Promise.all(
    tiposSilla.map(async (tipo) => {
      const bom = await BOMItem.find({ chairTypeId: tipo._id });
      if (!bom.length) return { _id: tipo._id, name: tipo.name, sillasPosibles: 0, limitante: null };

      const compMap = new Map(componentes.map((c) => [c._id.toString(), c]));

      let min = Infinity;
      let limitante: { name: string; stockDisponible: number; necesario: number } | null = null;

      for (const item of bom) {
        const comp = compMap.get(item.componentId.toString());
        if (!comp) { min = 0; limitante = { name: 'Desconocido', stockDisponible: 0, necesario: item.quantity }; break; }
        const disponible = comp.stockActual - comp.stockReservado;
        const posibles = Math.floor(disponible / item.quantity);
        if (posibles < min) {
          min = posibles;
          limitante = { name: comp.name, stockDisponible: disponible, necesario: item.quantity };
        }
      }

      return {
        _id: tipo._id,
        name: tipo.name,
        sillasPosibles: min === Infinity ? 0 : min,
        limitante,
      };
    })
  );

  res.json({
    data: {
      componentes: componentes.map((c) => ({
        _id: c._id,
        name: c.name,
        unit: c.unit,
        stockActual: c.stockActual,
        stockReservado: c.stockReservado,
        stockDisponible: c.stockActual - c.stockReservado,
        stockMinimo: c.stockMinimo,
        stockBajo: (c.stockActual - c.stockReservado) <= c.stockMinimo,
      })),
      sillasPosibles,
    },
  });
}
