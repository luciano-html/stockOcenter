import { Types } from 'mongoose';
import { BOMItem, Component, ChairType, WorkOrder } from '../models';
import { ApiError } from '../utils/ApiError';
import { getCache, setCache, clearStockCache } from '../utils/cache';

const SILLAS_CACHE_KEY = 'sillas:posibles-por-tipo';
const SILLAS_CACHE_TTL = 60; // segundos

async function getPendingChairQuantities(): Promise<Map<string, number>> {
  const pendingOrders = await WorkOrder.aggregate([
    { $match: { status: 'pendiente' } },
    { $unwind: '$sillas' },
    {
      $group: {
        _id: '$sillas.chairTypeId',
        pendingQuantity: { $sum: '$sillas.quantity' }
      }
    }
  ]);
  return new Map(pendingOrders.map(p => [p._id.toString(), p.pendingQuantity]));
}

export async function calcularSillasPosibles(chairTypeId: string) {
  const [result] = await BOMItem.aggregate([
    { $match: { chairTypeId: new Types.ObjectId(chairTypeId) } },
    {
      $lookup: {
        from: 'components',
        localField: 'componentId',
        foreignField: '_id',
        as: 'componente',
      },
    },
    { $unwind: '$componente' },
    {
      $project: {
        posibles: {
          $floor: {
            $divide: [
              { $subtract: ['$componente.stockActual', '$componente.stockReservado'] },
              '$quantity',
            ],
          },
        },
      },
    },
    { $group: { _id: null, minPosibles: { $min: '$posibles' } } },
  ]);

  const rawPosibles = result?.minPosibles ?? 0;
  const pendingMap = await getPendingChairQuantities();
  const pending = pendingMap.get(chairTypeId.toString()) || 0;
  
  return Math.max(0, rawPosibles - pending);
}

export async function calcularSillasPosiblesConDetalle(chairTypeId: string) {
  const items = await BOMItem.aggregate([
    { $match: { chairTypeId: new Types.ObjectId(chairTypeId) } },
    {
      $lookup: {
        from: 'components',
        localField: 'componentId',
        foreignField: '_id',
        as: 'componente',
      },
    },
    { $unwind: '$componente' },
    {
      $project: {
        name: '$componente.name',
        unit: '$componente.unit',
        stockActual: '$componente.stockActual',
        stockReservado: '$componente.stockReservado',
        quantity: '$quantity',
        disponible: { $subtract: ['$componente.stockActual', '$componente.stockReservado'] },
        posibles: {
          $floor: {
            $divide: [
              { $subtract: ['$componente.stockActual', '$componente.stockReservado'] },
              '$quantity',
            ],
          },
        },
      },
    },
  ]);

  if (!items.length) return { sillasPosibles: 0, limitante: null, faltantes: [] };

  let minSillas = Infinity;
  let limitante: { name: string; unit?: string; stockDisponible: number; necesario: number } | null = null;

  for (const item of items) {
    if (item.posibles < minSillas) {
      minSillas = item.posibles;
      limitante = {
        name: item.name,
        unit: item.unit,
        stockDisponible: item.disponible,
        necesario: item.quantity,
      };
    }
  }

  const faltantes = items
    .filter((item) => item.posibles < 1)
    .map((item) => ({
      name: item.name,
      unit: item.unit,
      disponible: item.disponible,
      necesario: item.quantity,
      faltante: Math.max(0, item.quantity - item.disponible),
    }));

  const rawPosibles = minSillas === Infinity ? 0 : minSillas;
  const pendingMap = await getPendingChairQuantities();
  const pending = pendingMap.get(chairTypeId.toString()) || 0;

  return {
    sillasPosibles: Math.max(0, rawPosibles - pending),
    limitante,
    faltantes,
  };
}

export async function sillasPosiblesPorTipo() {
  const cached = getCache<{ _id: string; name: string; sillasPosibles: number; limitante: { name: string; stockDisponible: number; necesario: number } | null }[]>(SILLAS_CACHE_KEY);
  if (cached) return cached;

  const resultados = await ChairType.aggregate([
    { $match: { active: true } },
    {
      $lookup: {
        from: 'bomitems',
        localField: '_id',
        foreignField: 'chairTypeId',
        as: 'bom',
      },
    },
    { $unwind: { path: '$bom', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'components',
        localField: 'bom.componentId',
        foreignField: '_id',
        as: 'componente',
      },
    },
    { $unwind: { path: '$componente', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: 1,
        posibles: {
          $cond: {
            if: { $ifNull: ['$componente', false] },
            then: {
              $floor: {
                $divide: [
                  { $subtract: ['$componente.stockActual', '$componente.stockReservado'] },
                  '$bom.quantity',
                ],
              },
            },
            else: 0,
          },
        },
        limitanteInfo: {
          $cond: {
            if: { $ifNull: ['$componente', false] },
            then: {
              name: '$componente.name',
              stockDisponible: { $subtract: ['$componente.stockActual', '$componente.stockReservado'] },
              necesario: '$bom.quantity',
              posibles: {
                $floor: {
                  $divide: [
                    { $subtract: ['$componente.stockActual', '$componente.stockReservado'] },
                    '$bom.quantity',
                  ],
                },
              },
            },
            else: null,
          },
        },
      },
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        sillasPosibles: { $min: '$posibles' },
        limitantes: { $push: '$limitanteInfo' },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        sillasPosibles: 1,
        limitante: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$limitantes',
                as: 'l',
                cond: {
                  $and: [
                    { $ne: ['$$l', null] },
                    { $eq: ['$$l.posibles', '$sillasPosibles'] },
                  ],
                },
              },
            },
            0,
          ],
        },
      },
    },
    { $sort: { name: 1 } },
  ]);

  const pendingMap = await getPendingChairQuantities();

  const data = resultados.map((r) => {
    const rawPosibles = r.sillasPosibles ?? 0;
    const pending = pendingMap.get(r._id.toString()) || 0;
    
    return {
      _id: r._id.toString(),
      name: r.name,
      sillasPosibles: Math.max(0, rawPosibles - pending),
      limitante: r.limitante
        ? {
            name: r.limitante.name,
            stockDisponible: r.limitante.stockDisponible,
            necesario: r.limitante.necesario,
          }
        : null,
    };
  });

  setCache(SILLAS_CACHE_KEY, data, SILLAS_CACHE_TTL);
  return data;
}

export function invalidateStockCache(): void {
  clearStockCache();
}
