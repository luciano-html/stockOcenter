import { Types } from 'mongoose';
import { BOMItem, Component, ChairType } from '../models';
import { ApiError } from '../utils/ApiError';
import { getCache, setCache, clearStockCache } from '../utils/cache';

const SILLAS_CACHE_KEY = 'sillas:posibles-por-tipo';
const SILLAS_CACHE_TTL = 60; // segundos

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

  return result?.minPosibles ?? 0;
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

  if (!items.length) return { sillasPosibles: 0, limitante: null };

  let minSillas = Infinity;
  let limitante: { name: string; stockDisponible: number; necesario: number } | null = null;

  for (const item of items) {
    if (item.posibles < minSillas) {
      minSillas = item.posibles;
      limitante = {
        name: item.name,
        stockDisponible: item.disponible,
        necesario: item.quantity,
      };
    }
  }

  return {
    sillasPosibles: minSillas === Infinity ? 0 : minSillas,
    limitante,
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

  const data = resultados.map((r) => ({
    _id: r._id.toString(),
    name: r.name,
    sillasPosibles: r.sillasPosibles ?? 0,
    limitante: r.limitante
      ? {
          name: r.limitante.name,
          stockDisponible: r.limitante.stockDisponible,
          necesario: r.limitante.necesario,
        }
      : null,
  }));

  setCache(SILLAS_CACHE_KEY, data, SILLAS_CACHE_TTL);
  return data;
}

export function invalidateStockCache(): void {
  clearStockCache();
}
