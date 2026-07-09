import { Request, Response } from 'express';
import { Component, WorkOrder, BOMItem, ChairType } from '../models';
import { ApiError } from '../utils/ApiError';
import { getPagination, getSkip } from '../utils/pagination';
import { escapeRegex } from '../utils/escapeRegex';

export async function reservas(_req: Request, res: Response) {
  const ordenes = await WorkOrder.find({ status: { $in: ['en_progreso', 'pausada'] } })
    .populate('chairTypeId', 'name')
    .lean();

  const chairTypeIds = ordenes
    .map((ot) => (ot.chairTypeId as unknown as { _id: string })?._id)
    .filter(Boolean);

  const [bomItems, components] = await Promise.all([
    BOMItem.find({ chairTypeId: { $in: chairTypeIds } })
      .populate('componentId', 'name')
      .lean(),
    Component.find().lean(),
  ]);

  const componentMap = new Map(components.map((c) => [c._id.toString(), c]));
  const bomMap = new Map<string, typeof bomItems>();
  for (const item of bomItems) {
    const key = (item.chairTypeId as unknown as { _id: string })._id.toString();
    if (!bomMap.has(key)) bomMap.set(key, []);
    bomMap.get(key)!.push(item);
  }

  const resultado: Record<
    string,
    {
      componente: { _id: string; name: string };
      cantidadReservada: number;
      ordenes: { id: string; silla: string; cantidad: number }[];
    }
  > = {};

  for (const ot of ordenes) {
    const sillaName = ot.chairTypeId
      ? (ot.chairTypeId as unknown as { name: string }).name
      : 'Solo repuestos';

    if (ot.chairTypeId) {
      const chairId = (ot.chairTypeId as unknown as { _id: string })._id.toString();
      const bom = bomMap.get(chairId) ?? [];
      for (const item of bom) {
        const comp = componentMap.get((item.componentId as unknown as { _id: string })._id.toString());
        if (!comp) continue;
        const key = comp._id.toString();
        if (!resultado[key]) {
          resultado[key] = { componente: { _id: key, name: comp.name }, cantidadReservada: 0, ordenes: [] };
        }
        resultado[key].cantidadReservada += item.quantity * ot.quantity;
        resultado[key].ordenes.push({ id: ot._id.toString(), silla: sillaName, cantidad: ot.quantity });
      }
    }

    if (ot.items) {
      for (const item of ot.items) {
        const comp = componentMap.get(item.componentId.toString());
        if (!comp) continue;
        const key = comp._id.toString();
        if (!resultado[key]) {
          resultado[key] = { componente: { _id: key, name: comp.name }, cantidadReservada: 0, ordenes: [] };
        }
        resultado[key].cantidadReservada += item.quantity;
        resultado[key].ordenes.push({ id: ot._id.toString(), silla: sillaName, cantidad: item.quantity });
      }
    }
  }

  res.json({ data: Object.values(resultado) });
}

export async function list(req: Request, res: Response) {
  const { search, stockBajo, tipo, subtipo, marca, page, limit } = req.query as {
    search?: string;
    stockBajo?: string;
    tipo?: string;
    subtipo?: string;
    marca?: string;
    page?: string;
    limit?: string;
  };

  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? 50);

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: 'i' };
  }
  if (stockBajo === 'true') {
    filter.$expr = { $lte: [{ $subtract: ['$stockActual', '$stockReservado'] }, '$stockMinimo'] };
  }
  if (tipo) filter.tipo = tipo;
  if (subtipo) filter.subtipo = subtipo;
  if (marca) filter.marca = marca;

  const total = await Component.countDocuments(filter);
  const componentes = await Component.find(filter)
    .sort({ name: 1 })
    .skip(getSkip(pageNum, limitNum))
    .limit(limitNum)
    .lean();

  const data = componentes.map((c) => ({
    ...c,
    stockDisponible: c.stockActual - c.stockReservado,
  }));

  res.json({
    data,
    pagination: getPagination(pageNum, limitNum, total),
  });
}

export async function getById(req: Request, res: Response) {
  const componente = await Component.findById(req.params.id).lean();
  if (!componente) throw ApiError.notFound('Componente no encontrado');
  res.json({ data: { ...componente, stockDisponible: componente.stockActual - componente.stockReservado } });
}

export async function create(req: Request, res: Response) {
  const existe = await Component.findOne({ name: req.body.name });
  if (existe) throw ApiError.conflict('Ya existe un componente con ese nombre');

  const componente = await Component.create(req.body);
  res.status(201).json({ data: componente });
}

export async function update(req: Request, res: Response) {
  const { name } = req.body;
  if (name) {
    const duplicado = await Component.findOne({ name, _id: { $ne: req.params.id } });
    if (duplicado) throw ApiError.conflict('Ya existe otro componente con ese nombre');
  }

  const componente = await Component.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!componente) throw ApiError.notFound('Componente no encontrado');
  res.json({ data: componente });
}

export async function remove(req: Request, res: Response) {
  const componente = await Component.findByIdAndDelete(req.params.id);
  if (!componente) throw ApiError.notFound('Componente no encontrado');
  res.json({ data: componente });
}

export async function filtros(_req: Request, res: Response) {
  const [tipos, subTipos, marcas] = await Promise.all([
    Component.distinct('tipo', { tipo: { $ne: null } }),
    Component.distinct('subtipo', { subtipo: { $ne: null } }),
    Component.distinct('marca', { marca: { $ne: null } }),
  ]);
  res.json({ data: { tipos: tipos.sort(), subTipos: subTipos.sort(), marcas: marcas.sort() } });
}
