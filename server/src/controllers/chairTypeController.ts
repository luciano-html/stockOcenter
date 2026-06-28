import { Request, Response } from 'express';
import { ChairType, BOMItem, Component } from '../models';
import { ApiError } from '../utils/ApiError';
import { calcularSillasPosiblesConDetalle, sillasPosiblesPorTipo } from '../services/stockService';
import { getPagination, getSkip } from '../utils/pagination';
import { clearStockCache } from '../utils/cache';

export async function list(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);

  const [tipos, sillasPosiblesArr, bomCounts, total] = await Promise.all([
    ChairType.find().sort({ name: 1 }).skip(getSkip(page, limit)).limit(limit).lean(),
    sillasPosiblesPorTipo(),
    BOMItem.aggregate([{ $group: { _id: '$chairTypeId', count: { $sum: 1 } } }]),
    ChairType.countDocuments(),
  ]);

  const sillasMap = new Map(sillasPosiblesArr.map((s) => [s._id, s]));
  const bomCountMap = new Map(bomCounts.map((c) => [c._id.toString(), c.count]));

  const data = tipos.map((t) => {
    const s = sillasMap.get(t._id.toString());
    return {
      ...t,
      bomCount: bomCountMap.get(t._id.toString()) ?? 0,
      sillasPosibles: s?.sillasPosibles ?? 0,
    };
  });

  res.json({ data, pagination: getPagination(page, limit, total) });
}

export async function getById(req: Request, res: Response) {
  const tipo = await ChairType.findById(req.params.id).lean();
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  const bom = await BOMItem.find({ chairTypeId: tipo._id })
    .populate('componentId', 'name unit')
    .lean();
  res.json({ data: { ...tipo, bom } });
}

export async function create(req: Request, res: Response) {
  const { bom, ...data } = req.body;

  const existe = await ChairType.findOne({ name: data.name });
  if (existe) throw ApiError.conflict('Ya existe un tipo de silla con ese nombre');

  const tipo = await ChairType.create(data);

  if (bom?.length) {
    const bomItems = bom.map((item: { componentId: string; quantity: number }) => ({
      chairTypeId: tipo._id,
      componentId: item.componentId,
      quantity: item.quantity,
    }));
    await BOMItem.insertMany(bomItems);
  }

  clearStockCache();

  const bomCompleto = await BOMItem.find({ chairTypeId: tipo._id })
    .populate('componentId', 'name unit')
    .lean();
  res.status(201).json({ data: { ...tipo.toJSON(), bom: bomCompleto } });
}

export async function update(req: Request, res: Response) {
  const { bom, ...data } = req.body;

  if (data.name) {
    const duplicado = await ChairType.findOne({ name: data.name, _id: { $ne: req.params.id } });
    if (duplicado) throw ApiError.conflict('Ya existe otro tipo de silla con ese nombre');
  }

  const tipo = await ChairType.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  if (bom) {
    await BOMItem.deleteMany({ chairTypeId: tipo._id });
    if (bom.length > 0) {
      const bomItems = bom.map((item: { componentId: string; quantity: number }) => ({
        chairTypeId: tipo._id,
        componentId: item.componentId,
        quantity: item.quantity,
      }));
      await BOMItem.insertMany(bomItems);
    }
  }

  clearStockCache();

  const bomCompleto = await BOMItem.find({ chairTypeId: tipo._id })
    .populate('componentId', 'name unit')
    .lean();
  res.json({ data: { ...tipo.toJSON(), bom: bomCompleto } });
}

export async function remove(req: Request, res: Response) {
  const tipo = await ChairType.findByIdAndDelete(req.params.id);
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  await BOMItem.deleteMany({ chairTypeId: tipo._id });
  clearStockCache();
  res.json({ data: tipo });
}

export async function sillasPosibles(req: Request, res: Response) {
  const tipo = await ChairType.findById(req.params.id).lean();
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  const detalle = await calcularSillasPosiblesConDetalle(tipo._id.toString());

  res.json({
    data: {
      chairType: { _id: tipo._id, name: tipo.name },
      ...detalle,
    },
  });
}

export async function bomDetalle(req: Request, res: Response) {
  const tipo = await ChairType.findById(req.params.id).lean();
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  const items = await BOMItem.aggregate([
    { $match: { chairTypeId: tipo._id } },
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
        componentId: {
          _id: '$componente._id',
          name: '$componente.name',
          unit: '$componente.unit',
          tipo: '$componente.tipo',
          subtipo: '$componente.subtipo',
          marca: '$componente.marca',
        },
        quantity: '$quantity',
        stockActual: '$componente.stockActual',
        stockReservado: '$componente.stockReservado',
        stockDisponible: { $subtract: ['$componente.stockActual', '$componente.stockReservado'] },
      },
    },
  ]);

  if (!items.length) {
    res.json({ data: { chairType: { _id: tipo._id, name: tipo.name }, sillasPosibles: 0, items: [] } });
    return;
  }

  let minSillas = Infinity;
  let limitante: { componentId: string; name: string; stockDisponible: number; necesario: number } | null = null;

  for (const item of items) {
    const posibles = Math.floor(item.stockDisponible / item.quantity);
    if (posibles < minSillas) {
      minSillas = posibles;
      limitante = {
        componentId: item.componentId._id.toString(),
        name: item.componentId.name,
        stockDisponible: item.stockDisponible,
        necesario: item.quantity,
      };
    }
  }

  res.json({
    data: {
      chairType: { _id: tipo._id, name: tipo.name },
      sillasPosibles: minSillas === Infinity ? 0 : minSillas,
      limitante,
      items,
    },
  });
}
