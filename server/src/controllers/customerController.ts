import { Request, Response } from 'express';
import { Customer, WorkOrder } from '../models';
import { ApiError } from '../utils/ApiError';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customerValidator';

export async function list(req: Request, res: Response) {
  // Sincronizar clientes que hayan comprado o se hayan registrado en órdenes de trabajo
  try {
    const ordersWithClient = await WorkOrder.find({
      'cliente.name': { $exists: true, $ne: '' }
    }).lean();

    for (const ord of ordersWithClient) {
      if (ord.cliente?.name && ord.cliente.name.trim()) {
        const name = ord.cliente.name.trim();
        const cuit = ord.cliente.cuit?.trim();
        const email = ord.cliente.email?.trim()?.toLowerCase();

        const matchConditions: any[] = [{ name: { $regex: new RegExp(`^${name}$`, 'i') } }];
        if (cuit) matchConditions.push({ cuit });
        if (email) matchConditions.push({ email });

        let existing = await Customer.findOne({ $or: matchConditions, active: true });
        if (!existing) {
          existing = await Customer.create({
            name,
            razonSocial: ord.cliente.razonSocial?.trim() || name,
            cuit: cuit || undefined,
            condicionIva: ord.cliente.condicionIva || 'Consumidor Final',
            email: email || undefined,
            telefono: ord.cliente.telefono?.trim() || undefined,
            contacto: ord.cliente.contacto?.trim() || name,
            direccion: ord.cliente.domicilio?.trim() || ord.logistica?.direccionEntrega?.trim() || undefined,
            localidad: ord.logistica?.localidadEntrega?.trim() || 'Santa Fe',
            provincia: 'Santa Fe',
          });
        }

        if (existing && !ord.customerId) {
          await WorkOrder.findByIdAndUpdate(ord._id, {
            customerId: existing._id,
            'cliente.customerId': existing._id
          });
        }
      }
    }
  } catch (_e) {
    // sincronización no bloqueante
  }

  const search = req.query.search as string;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const query: any = { active: true };

  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, 'i');
    query.$or = [
      { name: regex },
      { razonSocial: regex },
      { cuit: regex },
      { telefono: regex },
      { email: regex },
      { contacto: regex },
    ];
  }

  const customers = await Customer.find(query).sort({ updatedAt: -1 }).limit(limit).lean();
  res.json({ data: customers });
}

export async function getById(req: Request, res: Response) {
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) {
    throw ApiError.notFound('Cliente no encontrado');
  }

  // Get recent orders for this customer
  const orders = await WorkOrder.find({ customerId: customer._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json({ data: { ...customer, orders } });
}

export async function create(req: Request, res: Response) {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.errors[0]?.message || 'Datos de cliente inválidos');
  }

  const data = parsed.data;

  // If cuit is present and unique, check if exists
  if (data.cuit && data.cuit.trim()) {
    const existing = await Customer.findOne({ cuit: data.cuit.trim(), active: true });
    if (existing) {
      // Update with latest info and return
      Object.assign(existing, data);
      await existing.save();
      return res.status(200).json({ data: existing });
    }
  }

  const customer = await Customer.create(data);
  res.status(201).json({ data: customer });
}

export async function update(req: Request, res: Response) {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.errors[0]?.message || 'Datos de cliente inválidos');
  }

  const customer = await Customer.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  if (!customer) {
    throw ApiError.notFound('Cliente no encontrado');
  }

  res.json({ data: customer });
}

export async function remove(req: Request, res: Response) {
  const customer = await Customer.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!customer) {
    throw ApiError.notFound('Cliente no encontrado');
  }

  res.json({ data: { message: 'Cliente eliminado correctamente' } });
}
