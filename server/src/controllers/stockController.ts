import { Request, Response } from 'express';
import { Component, StockMovement } from '../models';
import { ApiError } from '../utils/ApiError';
import { sillasPosiblesPorTipo } from '../services/stockService';
import { clearStockCache, getCache, setCache } from '../utils/cache';

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

  clearStockCache();
  res.json({ data: componente });
}

export async function egreso(req: Request, res: Response) {
  const { componenteId, cantidad, notas } = req.body;

  const componente = await Component.findOneAndUpdate(
    {
      _id: componenteId,
      $expr: { $gte: [{ $subtract: ['$stockActual', '$stockReservado'] }, cantidad] },
    },
    { $inc: { stockActual: -cantidad } },
    { new: true }
  );

  if (!componente) {
    throw ApiError.badRequest('Stock insuficiente para realizar el egreso');
  }

  await StockMovement.create({
    componentId: componenteId,
    type: 'egreso',
    quantity: cantidad,
    notes: notas,
  });

  clearStockCache();
  res.json({ data: componente });
}

const RESUMEN_CACHE_KEY = 'stock:resumen';
const RESUMEN_CACHE_TTL = 30; // segundos

export async function resumen(_req: Request, res: Response) {
  const cached = getCache<{
    componentes: unknown[];
    sillasPosibles: unknown[];
  }>(RESUMEN_CACHE_KEY);

  if (cached) {
    res.json({ data: cached });
    return;
  }

  const componentes = await Component.find().sort({ name: 1 }).lean();
  const sillasPosibles = await sillasPosiblesPorTipo();

  const data = {
    componentes: componentes.map((c) => ({
      _id: c._id,
      name: c.name,
      unit: c.unit,
      stockActual: c.stockActual,
      stockReservado: c.stockReservado,
      stockDisponible: c.stockActual - c.stockReservado,
      stockMinimo: c.stockMinimo,
      stockBajo: c.stockActual - c.stockReservado <= c.stockMinimo,
    })),
    sillasPosibles,
  };

  setCache(RESUMEN_CACHE_KEY, data, RESUMEN_CACHE_TTL);
  res.json({ data });
}
