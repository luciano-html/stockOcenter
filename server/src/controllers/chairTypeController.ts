import { Request, Response } from 'express';
import { ChairType, BOMItem, Component } from '../models';
import { ApiError } from '../utils/ApiError';
import { calcularSillasPosiblesConDetalle, sillasPosiblesPorTipo } from '../services/stockService';
import { getPagination, getSkip } from '../utils/pagination';
import { clearStockCache } from '../utils/cache';
import { escapeRegex } from '../utils/escapeRegex';
import { createAuditLog } from '../services/auditService';

export async function list(req: Request, res: Response) {
  const { q, tipo, subtipo, marca, page, limit, sort, order } = req.query as {
    q?: string;
    tipo?: string;
    subtipo?: string;
    marca?: string;
    page?: string;
    limit?: string;
    sort?: 'nombre' | 'posibles' | 'activo';
    order?: 'asc' | 'desc';
  };
  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? 50);
  const sortField = sort ?? 'posibles';
  const sortOrder = order ?? 'desc';

  const componentFilters: Record<string, unknown> = {};
  if (tipo) componentFilters['componente.tipo'] = tipo;
  if (subtipo) componentFilters['componente.subtipo'] = subtipo;
  if (marca) componentFilters['componente.marca'] = marca;

  let chairTypeIds: string[] | null = null;
  if (tipo || subtipo || marca) {
    const matched = await BOMItem.aggregate([
      {
        $lookup: {
          from: 'components',
          localField: 'componentId',
          foreignField: '_id',
          as: 'componente',
        },
      },
      { $unwind: '$componente' },
      { $match: componentFilters },
      { $group: { _id: '$chairTypeId' } },
    ]);
    chairTypeIds = matched.map((m) => m._id.toString());
    if (chairTypeIds.length === 0) {
      res.json({ data: [], pagination: getPagination(pageNum, limitNum, 0) });
      return;
    }
  }

  const filter: Record<string, unknown> = {};
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  if (chairTypeIds) filter._id = { $in: chairTypeIds };

  const [sillasPosiblesArr, bomCounts, total] = await Promise.all([
    sillasPosiblesPorTipo(),
    BOMItem.aggregate([{ $group: { _id: '$chairTypeId', count: { $sum: 1 } } }]),
    ChairType.countDocuments(filter),
  ]);

  const sillasMap = new Map(sillasPosiblesArr.map((s) => [s._id, s]));
  const bomCountMap = new Map(bomCounts.map((c) => [c._id.toString(), c.count]));

  let data: Array<Record<string, unknown> & { bomCount: number; sillasPosibles: number }>;

  const enrich = (tipos: unknown[]) =>
    (tipos as Array<{ _id: { toString(): string }; name: string; active: boolean }>).map((t) => {
      const s = sillasMap.get(t._id.toString());
      return {
        ...t,
        bomCount: bomCountMap.get(t._id.toString()) ?? 0,
        sillasPosibles: s?.sillasPosibles ?? 0,
      };
    });

  if (sortField === 'posibles') {
    const allTipos = await ChairType.find(filter).sort({ name: 1 }).lean();
    const enriched = enrich(allTipos);
    enriched.sort((a, b) => {
      const diff = (a.sillasPosibles ?? 0) - (b.sillasPosibles ?? 0);
      if (diff !== 0) return sortOrder === 'asc' ? diff : -diff;
      return a.name.localeCompare(b.name);
    });
    data = enriched.slice(getSkip(pageNum, limitNum), getSkip(pageNum, limitNum) + limitNum);
  } else {
    const sortObj: Record<string, 1 | -1> =
      sortField === 'nombre'
        ? { name: sortOrder === 'asc' ? 1 : -1 }
        : { active: sortOrder === 'asc' ? 1 : -1, name: 1 };
    const tipos = await ChairType.find(filter).sort(sortObj).skip(getSkip(pageNum, limitNum)).limit(limitNum).lean();
    data = enrich(tipos);
  }

  res.json({ data, pagination: getPagination(pageNum, limitNum, total) });
}

export async function getById(req: Request, res: Response) {
  const tipo = await ChairType.findById(req.params.id).lean();
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  const bom = await BOMItem.find({ chairTypeId: tipo._id })
    .populate('componentId', 'name unit')
    .lean();
  res.json({ data: { ...tipo, bom } });
}

async function validateBOMComponents(bom: { componentId: string; quantity: number }[]) {
  const ids = bom.map((item) => item.componentId);
  const existing = await Component.find({ _id: { $in: ids } }).select('_id').lean();
  const existingIds = new Set(existing.map((c) => c._id.toString()));
  const invalid = ids.filter((id) => !existingIds.has(id));
  if (invalid.length > 0) {
    throw ApiError.badRequest('Algunos componentes del BOM no existen', { invalid });
  }
}

export async function create(req: Request, res: Response) {
  const { bom, ...data } = req.body;

  const existe = await ChairType.findOne({ name: data.name });
  if (existe) throw ApiError.conflict('Ya existe un tipo de silla con ese nombre');

  if (bom?.length) {
    await validateBOMComponents(bom);
  }

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

  await createAuditLog({
    action: 'chair_type_created',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Creación del tipo de silla "${tipo.name}"`,
    metadata: { chairTypeId: tipo._id, name: tipo.name, bomCount: bom?.length ?? 0 },
    req,
  });

  res.status(201).json({ data: { ...tipo.toJSON(), bom: bomCompleto } });
}

export async function update(req: Request, res: Response) {
  const { bom, ...data } = req.body;

  if (data.name) {
    const duplicado = await ChairType.findOne({ name: data.name, _id: { $ne: req.params.id } });
    if (duplicado) throw ApiError.conflict('Ya existe otro tipo de silla con ese nombre');
  }

  if (bom?.length) {
    await validateBOMComponents(bom);
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

  await createAuditLog({
    action: 'chair_type_updated',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Actualización del tipo de silla "${tipo.name}"`,
    metadata: { chairTypeId: tipo._id, name: tipo.name, bomCount: bom?.length ?? 0, changes: data },
    req,
  });

  res.json({ data: { ...tipo.toJSON(), bom: bomCompleto } });
}

export async function remove(req: Request, res: Response) {
  const tipo = await ChairType.findByIdAndDelete(req.params.id);
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  await BOMItem.deleteMany({ chairTypeId: tipo._id });
  clearStockCache();

  await createAuditLog({
    action: 'chair_type_deleted',
    severity: 'warning',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Eliminación del tipo de silla "${tipo.name}"`,
    metadata: { chairTypeId: tipo._id, name: tipo.name },
    req,
  });

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

export async function cleanupOrphans(req: Request, res: Response) {
  const allBOMItems = await BOMItem.find().lean();
  const componentIds = [...new Set(allBOMItems.map((item) => item.componentId.toString()))];
  const existing = await Component.find({ _id: { $in: componentIds } }).select('_id').lean();
  const existingIds = new Set(existing.map((c) => c._id.toString()));

  const orphans = allBOMItems.filter((item) => !existingIds.has(item.componentId.toString()));
  if (orphans.length === 0) {
    res.json({ data: { removed: 0, details: [] } });
    return;
  }

  const orphanIds = orphans.map((item) => item._id.toString());
  await BOMItem.deleteMany({ _id: { $in: orphanIds } });
  clearStockCache();

  const details = orphans.map((item) => ({
    bomItemId: item._id.toString(),
    chairTypeId: item.chairTypeId.toString(),
    componentId: item.componentId.toString(),
  }));

  res.json({ data: { removed: orphans.length, details } });
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
