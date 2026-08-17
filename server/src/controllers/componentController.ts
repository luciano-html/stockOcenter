import { Request, Response } from 'express';
import { Component, WorkOrder, BOMItem, ChairType } from '../models';
import { ApiError } from '../utils/ApiError';
import { getPagination, getSkip } from '../utils/pagination';
import { escapeRegex } from '../utils/escapeRegex';
import { createAuditLog } from '../services/auditService';

export async function reservas(_req: Request, res: Response) {
  const ordenes = await WorkOrder.find({ status: { $in: ['en_progreso', 'pausada'] } })
    .populate('sillas.chairTypeId', 'name')
    .populate('chairTypeId', 'name')
    .lean();

  const chairTypeIds = ordenes
    .flatMap((ot) => {
      const ids = ot.sillas?.map((s) => (s.chairTypeId as unknown as { _id: string })?._id) ?? [];
      const legacy = (ot.chairTypeId as unknown as { _id: string })?._id;
      return [...ids, legacy];
    })
    .filter((id) => !!id);

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
    const sillas =
      ot.sillas && ot.sillas.length > 0
        ? ot.sillas
        : ot.chairTypeId
          ? [{ chairTypeId: ot.chairTypeId, quantity: ot.quantity ?? 1 }]
          : [];

    const sillaLabels = sillas.map((s) => {
      const name = (s.chairTypeId as unknown as { name?: string })?.name ?? 'Silla';
      return `${name} x${s.quantity}`;
    });
    const sillaName = sillaLabels.length > 0 ? sillaLabels.join(', ') : 'Solo repuestos';

    for (const silla of sillas) {
      const chairId = (silla.chairTypeId as unknown as { _id: string })._id.toString();
      const bom = bomMap.get(chairId) ?? [];
      for (const item of bom) {
        const comp = componentMap.get((item.componentId as unknown as { _id: string })._id.toString());
        if (!comp) continue;
        const key = comp._id.toString();
        if (!resultado[key]) {
          resultado[key] = { componente: { _id: key, name: comp.name }, cantidadReservada: 0, ordenes: [] };
        }
        resultado[key].cantidadReservada += item.quantity * silla.quantity;
        resultado[key].ordenes.push({ id: ot._id.toString(), silla: sillaName, cantidad: silla.quantity });
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
  const { search, stockBajo, tipo, subtipo, marca, tipoSilla, page, limit } = req.query as {
    search?: string;
    stockBajo?: string;
    tipo?: string;
    subtipo?: string;
    marca?: string;
    tipoSilla?: string;
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
  if (tipoSilla) filter.tipoSilla = { $in: [tipoSilla, 'Ambas'] };

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

  await createAuditLog({
    action: 'component_created',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Creación del componente "${componente.name}"`,
    metadata: { componentId: componente._id, name: componente.name },
    req,
  });

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

  await createAuditLog({
    action: 'component_updated',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Actualización del componente "${componente.name}"`,
    metadata: { componentId: componente._id, name: componente.name, changes: req.body },
    req,
  });

  res.json({ data: componente });
}

export async function remove(req: Request, res: Response) {
  const componente = await Component.findByIdAndDelete(req.params.id);
  if (!componente) throw ApiError.notFound('Componente no encontrado');

  await createAuditLog({
    action: 'component_deleted',
    severity: 'warning',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Eliminación del componente "${componente.name}"`,
    metadata: { componentId: componente._id, name: componente.name },
    req,
  });

  res.json({ data: componente });
}

export async function filtros(req: Request, res: Response) {
  const { tipo, subtipo, marca } = req.query as { tipo?: string; subtipo?: string; marca?: string };

  const scope: Record<string, unknown> = {};
  if (tipo) scope.tipo = tipo;
  if (subtipo) scope.subtipo = subtipo;
  if (marca) scope.marca = marca;

  const fieldQuery = (field: 'tipo' | 'subtipo' | 'marca', value?: string) => ({
    ...scope,
    ...(value ? { [field]: value } : { [field]: { $ne: null } }),
  });

  const { tipo: _tipo, ...countScope } = scope;

  const [tipos, subTipos, marcas, tiposCount] = await Promise.all([
    Component.distinct('tipo', fieldQuery('tipo', tipo)),
    Component.distinct('subtipo', fieldQuery('subtipo', subtipo)),
    Component.distinct('marca', fieldQuery('marca', marca)),
    Component.aggregate([
      { $match: { ...countScope, tipo: { $nin: [null, ''] } } },
      { $group: { _id: '$tipo', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  res.json({
    data: {
      tipos: tipos.sort(),
      subTipos: subTipos.sort(),
      marcas: marcas.sort(),
      tiposCount: tiposCount.map((r) => ({ tipo: r._id, count: r.count })),
    },
  });
}

const ORDEN_TIPOS_GIRATORIA = [
  'Rueda',
  'Estrella',
  'Cilindro',
  'Chapon',
  'Fuelle',
  'Mecanismo',
  'Espuma',
  'Tapizado',
  'Apoyabrazo',
  'Apoyacabezas',
  'Tornilleria',
];

export async function grupos(req: Request, res: Response) {
  const { tipoSilla } = req.query as { tipoSilla?: string };

  const scope: Record<string, unknown> = {};
  if (tipoSilla === 'Giratoria' || tipoSilla === 'Fija') {
    scope.tipoSilla = { $in: [tipoSilla, 'Ambas'] };
  }

  const componentes = await Component.find(scope).sort({ name: 1 }).lean();

  const gruposMap = new Map<string, (typeof componentes)[number][]>();
  for (const c of componentes) {
    const tipo = (c.tipo ?? '').trim() || 'Otros';
    if (!gruposMap.has(tipo)) gruposMap.set(tipo, []);
    gruposMap.get(tipo)!.push(c);
  }

  const grupos = Array.from(gruposMap.entries()).map(([tipo, comps]) => ({
    tipo,
    componentes: comps.map((c) => ({
      ...c,
      stockDisponible: (c.stockActual ?? 0) - (c.stockReservado ?? 0),
      stockBajo: (c.stockActual ?? 0) - (c.stockReservado ?? 0) <= (c.stockMinimo ?? 0),
    })),
  }));

  grupos.sort((a, b) => {
    const ia = ORDEN_TIPOS_GIRATORIA.indexOf(a.tipo);
    const ib = ORDEN_TIPOS_GIRATORIA.indexOf(b.tipo);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.tipo.localeCompare(b.tipo, 'es');
  });

  res.json({ data: grupos });
}
