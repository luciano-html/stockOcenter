import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { WorkOrder, BOMItem, ChairType, User, PricingConfig, Customer } from '../models';


import { ApiError } from '../utils/ApiError';
import {
  canTransition,
  reservarStock,
  descontarStock,
  liberarReserva,
  resolveSillas,
  SillaReq,
} from '../services/workOrderService';
import { getPagination, getSkip } from '../utils/pagination';
import { createAuditLog } from '../services/auditService';
import { invalidateStockCache } from '../services/stockService';

const USER_POPULATE = {
  path: 'createdBy updatedBy startedBy finalizedBy assignedTo statusHistory.by',
  select: 'name role',
};

const CHAIR_POPULATE = [
  { path: 'sillas.chairTypeId', select: 'name precioVenta imageUrl' },
  { path: 'chairTypeId', select: 'name precioVenta imageUrl' },
  { path: 'customerId', select: 'name razonSocial cuit condicionIva email telefono direccion localidad' },
];

function sillasFromBody(body: Record<string, unknown>): SillaReq[] {
  return ((body.sillas as SillaReq[]) ?? []).map((s) => ({
    chairTypeId: s.chairTypeId,
    quantity: Number(s.quantity),
  }));
}


function getSillasNames(ot: {
  sillas?: { chairTypeId: { _id: string; name: string } | string; quantity: number }[];
  chairTypeId?: { _id: string; name: string } | string | null;
  quantity?: number;
}): string[] {
  if (ot.sillas && ot.sillas.length > 0) {
    return ot.sillas.map((s) => {
      const name = typeof s.chairTypeId === 'object' ? s.chairTypeId.name : 'Silla';
      return `${name} x${s.quantity}`;
    });
  }
  if (ot.chairTypeId) {
    const name = typeof ot.chairTypeId === 'object' ? ot.chairTypeId.name : 'Silla';
    return [`${name} x${ot.quantity ?? 1}`];
  }
  return [];
}

const STATUS_KEYS = ['pendiente', 'en_progreso', 'pausada', 'control', 'finalizada', 'cancelada'] as const;

export async function counts(req: Request, res: Response) {
  const match: any = {};
  if (req.user?.role === 'operario') {
    match.assignedTo = new mongoose.Types.ObjectId(req.user.userId);
  }
  const result = await WorkOrder.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts: Record<string, number> = {};
  for (const key of STATUS_KEYS) counts[key] = 0;
  for (const r of result) {
    if (typeof r._id === 'string' && r._id in counts) counts[r._id] = r.count;
  }
  res.json({ data: counts });
}

export async function list(req: Request, res: Response) {
  const { estado, page, limit } = req.query as { estado?: string; page?: string; limit?: string };
  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? 50);

  const filter: Record<string, unknown> = {};
  if (estado) filter.status = estado;
  if (req.user?.role === 'operario') {
    filter.assignedTo = req.user.userId;
  }

  const [ordenes, total] = await Promise.all([
    WorkOrder.find(filter)
      .populate(CHAIR_POPULATE)
      .populate(USER_POPULATE)
      .sort({ createdAt: -1 })
      .skip(getSkip(pageNum, limitNum))
      .limit(limitNum)
      .lean(),
    WorkOrder.countDocuments(filter),
  ]);

  res.json({ data: ordenes, pagination: getPagination(pageNum, limitNum, total) });
}

export async function getById(req: Request, res: Response) {
  const ot = await WorkOrder.findById(req.params.id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');
  res.json({ data: ot });
}

export async function getDetalle(req: Request, res: Response) {
  const ot = await WorkOrder.findById(req.params.id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .populate('items.componentId', 'name unit tipo subtipo marca')
    .lean();
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  const sillas = resolveSillas(
    ot.sillas?.map((s) => ({
      chairTypeId: (s.chairTypeId as unknown as { _id: string })._id?.toString() ?? s.chairTypeId.toString(),
      quantity: s.quantity,
    })),
    (ot.chairTypeId as unknown as { _id?: string })?._id?.toString() ?? ot.chairTypeId?.toString(),
    ot.quantity
  );

  let bom: Array<Record<string, unknown>> = [];

  if (sillas.length > 0) {
    const bomItems = await BOMItem.find({ chairTypeId: { $in: sillas.map((s) => s.chairTypeId) } })
      .populate('componentId', 'name unit tipo subtipo marca')
      .lean();

    const bomMap = new Map<string, typeof bomItems>();
    for (const item of bomItems) {
      const key = (item.chairTypeId as unknown as { _id: string })._id.toString();
      if (!bomMap.has(key)) bomMap.set(key, []);
      bomMap.get(key)!.push(item);
    }

    for (const silla of sillas) {
      for (const item of bomMap.get(silla.chairTypeId) ?? []) {
        bom.push({
          componentId: item.componentId,
          quantity: item.quantity * silla.quantity,
          unit: (item.componentId as unknown as { unit: string })?.unit ?? '',
          tipo: 'bom',
        });
      }
    }
  }

  const extraItems = (ot.items ?? []).map((i) => ({
    componentId: i.componentId,
    quantity: i.quantity,
    unit: (i.componentId as unknown as { unit: string })?.unit ?? '',
    tipo: i.type,
  }));

  res.json({ data: { orden: ot, items: [...bom, ...extraItems] } });
}

export async function create(req: Request, res: Response) {
  const {
    chairTypeId,
    quantity,
    items,
    assignedTo,
    customerId,
    cliente,
    logistica,
    condicionesComerciales,
    totales,
    operatorNotes,
  } = req.body;
  const sillas = sillasFromBody(req.body);

  let finalCliente = cliente;
  let finalCustomerId = customerId;

  if (customerId && !finalCliente) {
    const custDoc = await Customer.findById(customerId).lean();
    if (custDoc) {
      finalCliente = {
        customerId: custDoc._id,
        name: custDoc.name,
        razonSocial: custDoc.razonSocial,
        cuit: custDoc.cuit,
        condicionIva: custDoc.condicionIva,
        email: custDoc.email,
        telefono: custDoc.telefono,
        contacto: custDoc.contacto,
        domicilio: custDoc.direccion,
      };
    }
  } else if (finalCliente && finalCliente.name && finalCliente.name.trim()) {
    const cleanName = finalCliente.name.trim();
    const cleanCuit = finalCliente.cuit?.trim();
    const cleanEmail = finalCliente.email?.trim()?.toLowerCase();

    const matchConditions: any[] = [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }];
    if (cleanCuit) matchConditions.push({ cuit: cleanCuit });
    if (cleanEmail) matchConditions.push({ email: cleanEmail });

    let custDoc = await Customer.findOne({ $or: matchConditions, active: true });
    if (!custDoc) {
      custDoc = await Customer.create({
        name: cleanName,
        razonSocial: finalCliente.razonSocial?.trim() || cleanName,
        cuit: cleanCuit || undefined,
        condicionIva: finalCliente.condicionIva || 'Consumidor Final',
        email: cleanEmail || undefined,
        telefono: finalCliente.telefono?.trim() || undefined,
        contacto: finalCliente.contacto?.trim() || cleanName,
        direccion: finalCliente.domicilio?.trim() || logistica?.direccionEntrega?.trim() || undefined,
        localidad: logistica?.localidadEntrega?.trim() || 'Santa Fe',
        provincia: 'Santa Fe',
      });
    } else {
      if (finalCliente.telefono) custDoc.telefono = finalCliente.telefono.trim();
      if (finalCliente.domicilio) custDoc.direccion = finalCliente.domicilio.trim();
      if (finalCliente.cuit) custDoc.cuit = finalCliente.cuit.trim();
      if (finalCliente.condicionIva) custDoc.condicionIva = finalCliente.condicionIva;
      await custDoc.save();
    }

    if (custDoc) {
      finalCustomerId = custDoc._id;
      finalCliente.customerId = custDoc._id;
    }
  }

  const ot = await WorkOrder.create({
    sillas: sillas.length > 0 ? sillas : undefined,
    chairTypeId,
    quantity,
    items: items ?? [],
    assignedTo: assignedTo ?? undefined,
    customerId: finalCustomerId ?? undefined,
    cliente: finalCliente,
    logistica: logistica ?? undefined,
    condicionesComerciales: condicionesComerciales ?? undefined,
    totales: totales ?? undefined,
    operatorNotes: operatorNotes ?? undefined,
    createdBy: req.user?.userId,
    statusHistory: [{ status: 'pendiente', at: new Date(), by: req.user?.userId }],
  });
  
  invalidateStockCache();

  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();

  await createAuditLog({
    action: 'work_order_created',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Creación de OT #${ot._id.toString().slice(-6)}`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      chairTypeId: chairTypeId,
      quantity,
      cliente: finalCliente?.name,
    },
    req,
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('work_order:created');
    io.emit('catalog:updated');
  }

  res.status(201).json({ data: populated });
}

export async function update(req: Request, res: Response) {
  const {
    chairTypeId,
    quantity,
    items,
    assignedTo,
    customerId,
    cliente,
    logistica,
    condicionesComerciales,
    totales,
    operatorNotes,
  } = req.body;
  const sillas = sillasFromBody(req.body);
  const ot = await WorkOrder.findById(req.params.id);
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  if (ot.status !== 'pendiente') {
    throw ApiError.badRequest('Solo se pueden editar órdenes en estado pendiente');
  }

  ot.sillas = sillas.length > 0 ? (sillas as never) : undefined;
  ot.chairTypeId = chairTypeId ?? undefined;
  ot.quantity = quantity ?? undefined;
  ot.items = items ?? [];
  ot.assignedTo = assignedTo ?? undefined;
  if (customerId !== undefined) ot.customerId = customerId ?? undefined;
  if (cliente !== undefined) ot.cliente = cliente;
  if (logistica !== undefined) ot.logistica = logistica;
  if (condicionesComerciales !== undefined) ot.condicionesComerciales = condicionesComerciales;
  if (totales !== undefined) ot.totales = totales;
  if (operatorNotes !== undefined) ot.operatorNotes = operatorNotes;

  ot.updatedBy = req.user?.userId as any;
  await ot.save();
  
  invalidateStockCache();

  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();


  await createAuditLog({
    action: 'work_order_updated',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Edición de OT #${ot._id.toString().slice(-6)}`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      chairTypeId: chairTypeId ?? ot.chairTypeId,
      quantity,
    },
    req,
  });

  res.json({ data: populated });
}

export async function finalizar(req: Request, res: Response) {
  const { cantidades, notas } = req.body;
  const ot = await WorkOrder.findById(req.params.id);
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  if (!['pendiente', 'en_progreso', 'pausada', 'control'].includes(ot.status)) {
    throw ApiError.badRequest('La orden no puede ser finalizada en su estado actual');
  }

  const sillas = resolveSillas(
    ot.sillas?.map((s) => ({ chairTypeId: s.chairTypeId.toString(), quantity: s.quantity })),
    ot.chairTypeId?.toString(),
    ot.quantity
  );

  // Calcular ítems esperados
  let bom: Array<{ componentId: string; quantity: number; tipo: 'bom' }> = [];

  if (sillas.length > 0) {
    const bomItems = await BOMItem.find({ chairTypeId: { $in: sillas.map((s) => s.chairTypeId) } }).lean();
    const bomMap = new Map<string, typeof bomItems>();
    for (const item of bomItems) {
      const key = item.chairTypeId.toString();
      if (!bomMap.has(key)) bomMap.set(key, []);
      bomMap.get(key)!.push(item);
    }
    for (const silla of sillas) {
      for (const item of bomMap.get(silla.chairTypeId) ?? []) {
        bom.push({
          componentId: item.componentId.toString(),
          quantity: item.quantity * silla.quantity,
          tipo: 'bom',
        });
      }
    }
  }

  const extraItems = (ot.items ?? []).map((i) => ({
    componentId: (i.componentId as any).toString?.() ?? i.componentId,
    quantity: i.quantity,
    tipo: i.type,
  }));

  const expectedItems = [...bom, ...extraItems];

  if (!Array.isArray(cantidades) || cantidades.length !== expectedItems.length) {
    throw ApiError.badRequest('Debes confirmar la cantidad preparada de cada ítem');
  }

  for (let i = 0; i < expectedItems.length; i++) {
    const prepared = Number(cantidades[i]);
    if (Number.isNaN(prepared) || prepared < expectedItems[i].quantity) {
      throw ApiError.badRequest(
        `La cantidad preparada no coincide con la cantidad requerida para el ítem ${i + 1}`
      );
    }
    if (prepared > expectedItems[i].quantity) {
      throw ApiError.badRequest(
        `La cantidad preparada no puede superar la cantidad requerida para el ítem ${i + 1}`
      );
    }
  }

  // Si estaba pendiente, reservar stock antes de descontar
  if (ot.status === 'pendiente') {
    await reservarStock(sillas, ot.items);
    if (!ot.startedBy) {
      ot.startedBy = req.user?.userId as any;
      ot.startedAt = new Date();
    }
  }

  await descontarStock(
    sillas,
    ot._id.toString(),
    ot.items,
    req.user?.userId,
    req.user?.role
  );

  ot.status = 'finalizada';
  ot.finalizedAt = new Date();
  ot.finalizedBy = req.user?.userId as any;
  ot.operatorNotes = notas?.trim() || undefined;
  ot.statusHistory = ot.statusHistory ?? [];
  ot.statusHistory.push({
    status: 'finalizada',
    at: new Date(),
    by: req.user?.userId as any,
    notes: notas?.trim() || undefined,
  });
  await ot.save();
  
  invalidateStockCache();

  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();

  await createAuditLog({
    action: 'work_order_finished',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Finalización de OT #${ot._id.toString().slice(-6)}`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      quantity: ot.quantity,
      notas,
    },
    req,
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('work_order:created');
    io.emit('catalog:updated');
  }

  res.json({ data: populated });
}

export async function asignar(req: Request, res: Response) {
  const { assignedTo } = req.body;
  const ot = await WorkOrder.findById(req.params.id);
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  ot.assignedTo = assignedTo ?? undefined;
  ot.updatedBy = req.user?.userId as any;
  await ot.save();

  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();

  const assignedUser = assignedTo ? await User.findById(assignedTo).lean() : null;
  const assignedName = assignedUser ? (assignedUser.name || assignedUser.username) : null;

  await createAuditLog({
    action: 'work_order_assigned',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: assignedTo
      ? `OT #${ot._id.toString().slice(-6)} asignada a "${assignedName}"`
      : `OT #${ot._id.toString().slice(-6)} sin asignar`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      assignedTo: assignedTo ?? null,
      assignedName,
    },
    req,
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('work_order:updated', { id: ot._id.toString() });
  }

  res.json({ data: populated });
}

export async function updateStatus(req: Request, res: Response) {
  const { status, notas } = req.body;
  const ot = await WorkOrder.findById(req.params.id);
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  if (!canTransition(ot.status, status)) {
    throw ApiError.badRequest(`No se puede pasar de "${ot.status}" a "${status}"`);
  }

  if (req.user?.role === 'operario') {
    if (['pausada', 'cancelada', 'finalizada'].includes(status)) {
      throw ApiError.forbidden('Los operarios solo pueden iniciar órdenes o enviarlas a control');
    }
    if (ot.assignedTo && ot.assignedTo.toString() !== req.user.userId) {
      throw ApiError.forbidden('No tienes permiso para modificar una orden asignada a otro operario');
    }
  }

  const sillas = resolveSillas(
    ot.sillas?.map((s) => ({ chairTypeId: s.chairTypeId.toString(), quantity: s.quantity })),
    ot.chairTypeId?.toString(),
    ot.quantity
  );

  switch (status) {
    case 'en_progreso':
      if (ot.status === 'pendiente') {
        await reservarStock(sillas, ot.items);
      }
      if (!ot.startedBy) {
        ot.startedBy = req.user?.userId as any;
        ot.startedAt = new Date();
      }
      if (!ot.assignedTo && req.user?.role === 'operario') {
        ot.assignedTo = req.user.userId as any;
      }
      break;
    case 'control':
      // El stock permanece reservado mientras se realiza el control
      break;
    case 'finalizada':
      await descontarStock(
        sillas,
        ot._id.toString(),
        ot.items,
        req.user?.userId,
        req.user?.role
      );
      ot.finalizedAt = new Date();
      ot.finalizedBy = req.user?.userId as any;
      break;
    case 'cancelada':
      if (ot.status === 'en_progreso' || ot.status === 'pausada' || ot.status === 'control') {
        await liberarReserva(sillas, ot.items);
      }
      break;
  }

  const previousStatus = ot.status;

  ot.status = status;
  if (typeof notas === 'string') {
    ot.operatorNotes = notas.trim() || undefined;
  }
  ot.statusHistory = ot.statusHistory ?? [];
  ot.statusHistory.push({
    status,
    at: new Date(),
    by: req.user?.userId as any,
    notes: typeof notas === 'string' ? notas.trim() || undefined : undefined,
  });
  ot.updatedBy = req.user?.userId as any;
  await ot.save();
  
  invalidateStockCache();

  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();

  await createAuditLog({
    action: 'work_order_status_changed',
    severity: status === 'cancelada' ? 'warning' : 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Cambio de estado en OT #${ot._id.toString().slice(-6)}: ${previousStatus} → ${status}`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      previousStatus,
      newStatus: status,
    },
    req,
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('work_order:created');
    io.emit('work_order:updated', { id: ot._id.toString() });
    io.emit('catalog:updated');
  }

  res.json({ data: populated });
}

export async function getRankingSillas(req: Request, res: Response) {
  const match: any = { status: 'finalizada' };
  
  if (req.query.month && req.query.year) {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    match.createdAt = { $gte: startDate, $lt: endDate };
  } else if (req.query.year) {
    const year = parseInt(req.query.year as string);
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    match.createdAt = { $gte: startDate, $lt: endDate };
  }

  const rankingAggr = await WorkOrder.aggregate([
    { $match: match },
    {
      $project: {
        sillas: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ['$sillas', []] } }, 0] },
            then: '$sillas',
            else: [
              {
                chairTypeId: '$chairTypeId',
                quantity: '$quantity',
              }
            ]
          }
        },
        createdAt: 1
      }
    },
    { $unwind: '$sillas' },
    {
      $match: {
        'sillas.chairTypeId': { $ne: null }
      }
    },
    {
      $group: {
        _id: { $toObjectId: '$sillas.chairTypeId' },
        totalProducidas: { $sum: '$sillas.quantity' }
      }
    },
    {
      $lookup: {
        from: 'chairtypes',
        localField: '_id',
        foreignField: '_id',
        as: 'chairType'
      }
    },
    { $unwind: { path: '$chairType', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: { $ifNull: ['$chairType.name', 'Desconocida'] },
        totalProducidas: 1
      }
    },
    { $sort: { totalProducidas: -1 } }
  ]);

  const timelineAggr = await WorkOrder.aggregate([
    { $match: match },
    {
      $project: {
        sillas: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ['$sillas', []] } }, 0] },
            then: '$sillas',
            else: [
              {
                chairTypeId: '$chairTypeId',
                quantity: '$quantity',
              }
            ]
          }
        },
        createdAt: 1
      }
    },
    { $unwind: '$sillas' },
    {
      $match: {
        'sillas.chairTypeId': { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        totalProducidas: { $sum: '$sillas.quantity' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  const timeline = timelineAggr.map(item => {
    const y = item._id.year;
    const m = String(item._id.month).padStart(2, '0');
    return {
      date: y + '-' + m,
      totalProducidas: item.totalProducidas
    };
  });

  res.json({ data: { ranking: rankingAggr, timeline } });
}

export async function getVentasStats(req: Request, res: Response) {
  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  // Pre-calculate BOM costs and fetch PricingConfig
  const [pricingConfig, bomItems, orders] = await Promise.all([
    PricingConfig.findOne({ key: 'global' }).lean(),
    BOMItem.find().populate('componentId', 'precio').lean(),
    WorkOrder.find({ createdAt: { $gte: startDate, $lt: endDate } })
      .populate('sillas.chairTypeId chairTypeId')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const manoDeObraGlobal = pricingConfig?.manoDeObra || 0;
  const gastosGeneralesPct = pricingConfig?.gastosGenerales || 0;
  const costosPersonalizados = pricingConfig?.costosPersonalizados || [];

  const chairCosts: Record<string, number> = {};
  for (const item of bomItems) {
    const chairId = item.chairTypeId.toString();
    const comp = item.componentId as any;
    if (comp && comp.precio) {
      chairCosts[chairId] = (chairCosts[chairId] || 0) + (comp.precio * item.quantity);
    }
  }

  const timeline = Array.from({ length: 12 }, (_, i) => ({
    date: `${year}-${String(i + 1).padStart(2, '0')}`,
    ventas: 0,
    aCobrar: 0
  }));

  const history = orders.map((o: any) => {
    const sillasArray = (o.sillas && o.sillas.length > 0) ? o.sillas : (o.chairTypeId ? [{ chairTypeId: o.chairTypeId, quantity: o.quantity }] : []);
    
    if (req.query.chairTypeId) {
      const hasChair = sillasArray.some((s: any) => s.chairTypeId && s.chairTypeId._id.toString() === req.query.chairTypeId);
      if (!hasChair) return null;
    }
    
    let totalVenta = 0;
    let totalCosto = 0;
    let gananciaTotal = 0;
    const descSillas: string[] = [];
    const sillasDetail: any[] = [];
    
    sillasArray.forEach((s: any) => {
      const chair = s.chairTypeId;
      const q = s.quantity || 0;
      const pVenta = chair ? (chair.precioVenta || 0) : 0;
      
      const chairIdStr = chair ? chair._id.toString() : '';
      const costoPiezas = chairCosts[chairIdStr] || 0;

      // Costo total de fabricación
      const costoBase = costoPiezas + manoDeObraGlobal;
      const montoGastos = Math.round(costoBase * (gastosGeneralesPct / 100));
      let montoCustom = 0;
      costosPersonalizados.forEach((cp: any) => {
        montoCustom += cp.tipo === 'porcentaje' ? Math.round(costoBase * (cp.valor / 100)) : Math.round(cp.valor);
      });
      const costoUnitario = costoBase + montoGastos + montoCustom;

      const gananciaUnitaria = pVenta > 0 ? pVenta - costoUnitario : 0;
      const subtotalVenta = q * pVenta;
      const subtotalCosto = q * costoUnitario;
      const subtotalGanancia = q * gananciaUnitaria;
      
      totalVenta += subtotalVenta;
      totalCosto += subtotalCosto;
      gananciaTotal += subtotalGanancia;
      
      const name = chair ? chair.name : 'Silla';
      descSillas.push(`${name} x${q}`);
      
      sillasDetail.push({
        name,
        quantity: q,
        precioVenta: pVenta,
        costoPiezas,
        costoUnitario,
        gananciaUnitaria,
        subtotalVenta,
        subtotalCosto,
        subtotalGanancia,
        price: pVenta > 0 ? pVenta : gananciaUnitaria,
        subtotal: subtotalGanancia
      });
    });

    const mIndex = new Date(o.createdAt).getMonth();
    if (o.status === 'finalizada') {
      timeline[mIndex].ventas += gananciaTotal;
    } else if (['pendiente', 'en_progreso', 'pausada', 'control'].includes(o.status)) {
      timeline[mIndex].aCobrar += gananciaTotal;
    }

    const origen = o.operatorNotes?.includes('Tienda en Vivo') ? 'Tienda' : 'Negocio';

    return {
      _id: o._id,
      orderNumber: o.orderNumber || o._id.toString().substring(0, 8),
      status: o.status,
      origen,
      date: o.createdAt,
      sillasDesc: descSillas.join(', '),
      sillasDetail,
      totalVenta,
      totalCosto,
      totalGanancia: gananciaTotal,
      total: gananciaTotal
    };

  }).filter(Boolean);

  res.json({ data: { timeline, history } });
}

