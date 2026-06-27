import { Request, Response } from 'express';
import { Component, WorkOrder, BOMItem, ChairType } from '../models';
import { ApiError } from '../utils/ApiError';

export async function reservas(_req: Request, res: Response) {
  const ordenes = await WorkOrder.find({ status: { $in: ['en_progreso', 'pausada'] } }).populate('chairTypeId', 'name');

  const resultado: Record<string, { componente: { _id: string; name: string }; cantidadReservada: number; ordenes: { id: string; silla: string; cantidad: number }[] }> = {};

  for (const ot of ordenes) {
    if (ot.chairTypeId) {
      const bom = await BOMItem.find({ chairTypeId: ot.chairTypeId._id });
      const sillaName = (ot.chairTypeId as unknown as { name: string }).name;

      for (const item of bom) {
        const comp = await Component.findById(item.componentId);
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
        const comp = await Component.findById(item.componentId);
        if (!comp) continue;

        const key = comp._id.toString();
        if (!resultado[key]) {
          resultado[key] = { componente: { _id: key, name: comp.name }, cantidadReservada: 0, ordenes: [] };
        }
        resultado[key].cantidadReservada += item.quantity;
        resultado[key].ordenes.push({
          id: ot._id.toString(),
          silla: ot.chairTypeId ? (ot.chairTypeId as unknown as { name: string }).name : 'Solo repuestos',
          cantidad: item.quantity,
        });
      }
    }
  }

  res.json({ data: Object.values(resultado) });
}

export async function list(_req: Request, res: Response) {
  const { search, stockBajo, tipo, subtipo, marca } = _req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if (stockBajo === 'true') {
    filter.$expr = { $lte: [{ $subtract: ['$stockActual', '$stockReservado'] }, '$stockMinimo'] };
  }
  if (tipo) filter.tipo = tipo;
  if (subtipo) filter.subtipo = subtipo;
  if (marca) filter.marca = marca;

  const componentes = await Component.find(filter).sort({ name: 1 });
  res.json({ data: componentes });
}

export async function getById(req: Request, res: Response) {
  const componente = await Component.findById(req.params.id);
  if (!componente) throw ApiError.notFound('Componente no encontrado');
  res.json({ data: componente });
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
