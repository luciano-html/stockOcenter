import { Request, Response } from 'express';
import { ChairType, BOMItem, Component } from '../models';
import { ApiError } from '../utils/ApiError';

export async function list(_req: Request, res: Response) {
  const [tipos, componentes] = await Promise.all([
    ChairType.find().sort({ name: 1 }),
    Component.find(),
  ]);

  const compMap = new Map(componentes.map((c) => [c._id.toString(), c]));

  const bomCounts = await BOMItem.aggregate([
    { $group: { _id: '$chairTypeId', count: { $sum: 1 }, bom: { $push: '$$ROOT' } } },
  ]);
  const bomMap = new Map(bomCounts.map((c) => [c._id.toString(), c]));

  const data = tipos.map((t) => {
    const b = bomMap.get(t._id.toString());
    let sillasPosibles = 0;
    if (b) {
      let min = Infinity;
      for (const item of b.bom) {
        const comp = compMap.get(item.componentId.toString());
        if (!comp) { min = 0; break; }
        const disponible = comp.stockActual - comp.stockReservado;
        const posibles = Math.floor(disponible / item.quantity);
        if (posibles < min) min = posibles;
      }
      sillasPosibles = min === Infinity ? 0 : min;
    }
    return { ...t.toJSON(), bomCount: b?.count ?? 0, sillasPosibles };
  });

  res.json({ data });
}

export async function getById(req: Request, res: Response) {
  const tipo = await ChairType.findById(req.params.id);
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  const bom = await BOMItem.find({ chairTypeId: tipo._id }).populate('componentId', 'name unit');
  res.json({ data: { ...tipo.toJSON(), bom } });
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

  const bomCompleto = await BOMItem.find({ chairTypeId: tipo._id }).populate('componentId', 'name unit');
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

  const bomCompleto = await BOMItem.find({ chairTypeId: tipo._id }).populate('componentId', 'name unit');
  res.json({ data: { ...tipo.toJSON(), bom: bomCompleto } });
}

export async function remove(req: Request, res: Response) {
  const tipo = await ChairType.findByIdAndDelete(req.params.id);
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  await BOMItem.deleteMany({ chairTypeId: tipo._id });
  res.json({ data: tipo });
}

export async function sillasPosibles(req: Request, res: Response) {
  const tipo = await ChairType.findById(req.params.id);
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  const bom = await BOMItem.find({ chairTypeId: tipo._id });
  if (!bom.length) {
    res.json({ data: { sillasPosibles: 0, limitante: null } });
    return;
  }

  const componentIds = bom.map((item) => item.componentId);
  const componentes = await Component.find({ _id: { $in: componentIds } });
  const compMap = new Map(componentes.map((c) => [c._id.toString(), c]));

  let minSillas = Infinity;
  let limitante: { componentId: string; name: string; stockDisponible: number; necesario: number } | null = null;

  for (const item of bom) {
    const comp = compMap.get(item.componentId.toString());
    if (!comp) {
      minSillas = 0;
      limitante = { componentId: item.componentId.toString(), name: 'Desconocido', stockDisponible: 0, necesario: item.quantity };
      break;
    }
    const disponible = comp.stockActual - comp.stockReservado;
    const posibles = Math.floor(disponible / item.quantity);
    if (posibles < minSillas) {
      minSillas = posibles;
      limitante = {
        componentId: comp._id.toString(),
        name: comp.name,
        stockDisponible: disponible,
        necesario: item.quantity,
      };
    }
  }

  res.json({
    data: {
      chairType: { _id: tipo._id, name: tipo.name },
      sillasPosibles: minSillas === Infinity ? 0 : minSillas,
      limitante,
    },
  });
}

export async function bomDetalle(req: Request, res: Response) {
  const tipo = await ChairType.findById(req.params.id);
  if (!tipo) throw ApiError.notFound('Tipo de silla no encontrado');

  const bom = await BOMItem.find({ chairTypeId: tipo._id }).populate('componentId', 'name unit tipo subtipo marca stockActual stockReservado stockMinimo');
  if (!bom.length) {
    res.json({ data: { chairType: { _id: tipo._id, name: tipo.name }, sillasPosibles: 0, items: [] } });
    return;
  }

  let minSillas = Infinity;
  let limitante: { componentId: string; name: string; stockDisponible: number; necesario: number } | null = null;

  const items = bom.map((item) => {
    const comp = item.componentId as unknown as { _id: string; name: string; unit: string; tipo: string; subtipo?: string; marca?: string; stockActual: number; stockReservado: number; stockMinimo: number };
    const disponible = comp.stockActual - comp.stockReservado;
    const posibles = Math.floor(disponible / item.quantity);
    if (posibles < minSillas) {
      minSillas = posibles;
      limitante = {
        componentId: comp._id.toString(),
        name: comp.name,
        stockDisponible: disponible,
        necesario: item.quantity,
      };
    }
    return {
      componentId: { _id: comp._id, name: comp.name, unit: comp.unit, tipo: comp.tipo, subtipo: comp.subtipo, marca: comp.marca },
      quantity: item.quantity,
      stockActual: comp.stockActual,
      stockReservado: comp.stockReservado,
      stockDisponible: disponible,
    };
  });

  res.json({
    data: {
      chairType: { _id: tipo._id, name: tipo.name },
      sillasPosibles: minSillas === Infinity ? 0 : minSillas,
      limitante,
      items,
    },
  });
}
