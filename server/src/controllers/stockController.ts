import { Request, Response } from 'express';
import { Component, StockMovement } from '../models';
import { ApiError } from '../utils/ApiError';
import { sillasPosiblesPorTipo } from '../services/stockService';

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

export async function egreso(req: Request, res: Response) {
  const { componenteId, cantidad, notas } = req.body;

  const componente = await Component.findById(componenteId);
  if (!componente) throw ApiError.notFound('Componente no encontrado');

  if (componente.stockActual - componente.stockReservado < cantidad) {
    throw ApiError.badRequest(
      `Stock insuficiente. Disponible: ${componente.stockActual - componente.stockReservado}, solicitado: ${cantidad}`
    );
  }

  componente.stockActual -= cantidad;
  await componente.save();

  await StockMovement.create({
    componentId: componenteId,
    type: 'egreso',
    quantity: cantidad,
    notes: notas,
  });

  res.json({ data: componente });
}

export async function resumen(_req: Request, res: Response) {
  const componentes = await Component.find().sort({ name: 1 });
  const sillasPosibles = await sillasPosiblesPorTipo();

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
