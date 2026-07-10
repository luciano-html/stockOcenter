import { Request, Response } from 'express';
import { Component, StockMovement } from '../models';
import { ApiError } from '../utils/ApiError';
import { sillasPosiblesPorTipo } from '../services/stockService';
import { clearStockCache, getCache, setCache } from '../utils/cache';
import { createAuditLog } from '../services/auditService';

export async function ingreso(req: Request, res: Response) {
  const { componenteId, cantidad, notas } = req.body;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

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
    userId,
    userRole,
  });

  await createAuditLog({
    action: 'stock_ingreso',
    severity: 'info',
    userId,
    userRole,
    description: `Ingreso de ${cantidad} unidades de "${componente.name}"`,
    metadata: { componentId: componenteId, componentName: componente.name, quantity: cantidad, notes: notas },
    req,
  });

  clearStockCache();
  res.json({ data: componente });
}

export async function ingresoMasivo(req: Request, res: Response) {
  const { items, notasGenerales } = req.body as {
    items: Array<{ componenteId: string; cantidad: number; notas?: string }>;
    notasGenerales?: string;
  };

  const componenteIds = items.map((item) => item.componenteId);
  const componentes = await Component.find({ _id: { $in: componenteIds } }).lean();
  const componenteMap = new Map(componentes.map((c) => [c._id.toString(), c]));

  const errores: Array<{ index: number; message: string }> = [];

  items.forEach((item, index) => {
    if (!componenteMap.has(item.componenteId)) {
      errores.push({ index, message: 'Componente no encontrado' });
    }
  });

  if (errores.length > 0) {
    res.status(400).json({
      error: { message: 'Errores de validación en el lote', errors: errores },
    });
    return;
  }

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.componenteId },
      update: { $inc: { stockActual: item.cantidad } },
    },
  }));

  await Component.bulkWrite(bulkOps);

  const movementNotes = items.map((item) => {
    const partes = [notasGenerales, item.notas].filter(Boolean);
    return partes.length > 0 ? partes.join(' | ') : undefined;
  });

  const userId = req.user?.userId;
  const userRole = req.user?.role;

  await StockMovement.insertMany(
    items.map((item, index) => ({
      componentId: item.componenteId,
      type: 'ingreso',
      quantity: item.cantidad,
      notes: movementNotes[index],
      userId,
      userRole,
    }))
  );

  await createAuditLog({
    action: 'stock_ingreso_masivo',
    severity: 'info',
    userId,
    userRole,
    description: `Ingreso masivo de ${items.length} ítem(s)`,
    metadata: { items, notasGenerales },
    req,
  });

  clearStockCache();
  res.json({ data: { processed: items.length } });
}

export async function egreso(req: Request, res: Response) {
  const { componenteId, cantidad, notas } = req.body;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

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
    userId,
    userRole,
  });

  await createAuditLog({
    action: 'stock_egreso',
    severity: 'info',
    userId,
    userRole,
    description: `Egreso de ${cantidad} unidades de "${componente.name}"`,
    metadata: { componentId: componenteId, componentName: componente.name, quantity: cantidad, notes: notas },
    req,
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
