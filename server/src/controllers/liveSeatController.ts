import { Request, Response } from 'express';
import { LiveOrder } from '../models/LiveOrder';
import { ChairType } from '../models/ChairType';
import { BOMItem } from '../models/BOMItem';
import { WorkOrder } from '../models/WorkOrder';
import { Customer } from '../models/Customer';

import { sillasPosiblesPorTipo, invalidateStockCache } from '../services/stockService';
import { ApiError } from '../utils/ApiError';
import { createAuditLog } from '../services/auditService';

export const list = async (req: Request, res: Response) => {
  const tipos = await ChairType.find({ active: true }).lean();
  const posiblesArr = await sillasPosiblesPorTipo();
  const posiblesMap = new Map(posiblesArr.map(p => [p._id.toString(), p.sillasPosibles]));

  const bomItems = await BOMItem.aggregate([
    {
      $lookup: {
        from: 'components',
        localField: 'componentId',
        foreignField: '_id',
        as: 'componente'
      }
    },
    { $unwind: '$componente' },
    {
      $group: {
        _id: '$chairTypeId',
        costo: { $sum: { $multiply: ['$quantity', '$componente.precio'] } }
      }
    }
  ]);

  const costoMap = new Map(bomItems.map(b => [b._id.toString(), b.costo]));

  const seatsData = tipos.map(tipo => {
    const stock = posiblesMap.get(tipo._id.toString()) || 0;
    const costo = costoMap.get(tipo._id.toString()) || 0;
    const price = tipo.precioVenta && tipo.precioVenta > 0 ? tipo.precioVenta : costo * 1.5;
    
    return {
      _id: tipo._id, // Usar el ID real del ChairType como ID de venta
      chairTypeId: tipo._id,
      code: tipo.name,
      imageUrl: tipo.imageUrl,
      price: price,
      stock: stock,
      status: stock > 0 ? 'disponible' : 'agotado'
    };
  });

  res.json(seatsData);
};

export const purchase = async (req: Request, res: Response) => {
  const { items, customer } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Se requieren ítems para la compra');
  }

  const uniqueItems = [...new Set(items)];
  const tipos = await ChairType.find({ _id: { $in: uniqueItems }, active: true });
  if (tipos.length !== uniqueItems.length) {
    throw ApiError.badRequest('Algunos ítems no existen o están inactivos');
  }

  // Verificar stock actual llamando al servicio
  const posiblesArr = await sillasPosiblesPorTipo();
  const posiblesMap = new Map(posiblesArr.map(p => [p._id.toString(), p.sillasPosibles]));

  // Validate all can be fulfilled. Since they might buy multiple of the SAME chair, we need to count them.
  const itemCounts = items.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bomItems = await BOMItem.aggregate([
    { $match: { chairTypeId: { $in: tipos.map(t => t._id) } } },
    {
      $lookup: {
        from: 'components',
        localField: 'componentId',
        foreignField: '_id',
        as: 'componente'
      }
    },
    { $unwind: '$componente' },
    {
      $group: {
        _id: '$chairTypeId',
        costo: { $sum: { $multiply: ['$quantity', '$componente.precio'] } }
      }
    }
  ]);
  const costoMap = new Map(bomItems.map(b => [b._id.toString(), b.costo]));

  let total = 0;

  for (const tipo of tipos) {
    const reqQty = itemCounts[tipo._id.toString()];
    const stock = posiblesMap.get(tipo._id.toString()) || 0;
    
    if (stock < reqQty) {
      throw ApiError.badRequest(`El ítem ${tipo.name} no tiene suficiente stock (${stock} disponibles, ${reqQty} solicitados)`);
    }

    const costo = costoMap.get(tipo._id.toString()) || 0;
    const price = tipo.precioVenta && tipo.precioVenta > 0 ? tipo.precioVenta : costo * 1.5;
    total += (price * reqQty);
  }

  // Procesar / Registrar Cliente
  let customerDoc = null;
  const rawCustomer = req.body.cliente || customer;
  const custName = (typeof rawCustomer === 'object' ? rawCustomer?.name || rawCustomer?.razonSocial : rawCustomer) || (typeof customer === 'string' ? customer : '');
  
  if (custName && custName.trim()) {
    const cObj = typeof rawCustomer === 'object' ? rawCustomer : {};
    const cleanName = custName.trim();
    const cleanCuit = cObj.cuit?.trim();
    const cleanEmail = cObj.email?.trim()?.toLowerCase();

    if (cleanCuit) {
      customerDoc = await Customer.findOne({ cuit: cleanCuit, active: true });
    }
    if (!customerDoc && cleanEmail) {
      customerDoc = await Customer.findOne({ email: cleanEmail, active: true });
    }
    if (!customerDoc) {
      customerDoc = await Customer.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') }, active: true });
    }

    if (!customerDoc) {
      customerDoc = await Customer.create({
        name: cleanName,
        razonSocial: cObj.razonSocial?.trim() || cleanName,
        cuit: cleanCuit || undefined,
        condicionIva: cObj.condicionIva || 'Consumidor Final',
        email: cleanEmail || undefined,
        telefono: cObj.telefono?.trim() || undefined,
        contacto: cObj.contacto?.trim() || cleanName,
        direccion: cObj.domicilio?.trim() || cObj.direccion?.trim() || req.body.logistica?.direccionEntrega?.trim() || undefined,
        localidad: cObj.localidad?.trim() || req.body.logistica?.localidadEntrega?.trim() || 'Santa Fe',
        provincia: 'Santa Fe',
      });
    } else {
      // Actualizar datos de contacto si cambiaron
      if (cObj.telefono) customerDoc.telefono = cObj.telefono.trim();
      if (cObj.domicilio || cObj.direccion) customerDoc.direccion = (cObj.domicilio || cObj.direccion).trim();
      if (cObj.cuit) customerDoc.cuit = cObj.cuit.trim();
      if (cObj.condicionIva) customerDoc.condicionIva = cObj.condicionIva;
      await customerDoc.save();
    }
  }

  // Crear WorkOrder real con Cliente, Logística y Totales
  const sillasArr = Object.entries(itemCounts).map(([chairTypeId, quantity]) => ({
    chairTypeId,
    quantity
  }));

  const logistica = req.body.logistica || {};
  const observaciones = req.body.observaciones || '';

  const wo = await WorkOrder.create({
    sillas: sillasArr,
    status: 'pendiente',
    customerId: customerDoc?._id,
    cliente: customerDoc ? {
      customerId: customerDoc._id,
      name: customerDoc.name,
      razonSocial: customerDoc.razonSocial,
      cuit: customerDoc.cuit,
      condicionIva: customerDoc.condicionIva,
      email: customerDoc.email,
      telefono: customerDoc.telefono,
      contacto: customerDoc.contacto,
      domicilio: customerDoc.direccion,
    } : (customer && typeof customer === 'string' ? { name: customer } : undefined),
    logistica: {
      sucursalOrigen: logistica.sucursalOrigen || 'Santa Fe',
      tipoEntrega: logistica.tipoEntrega || 'Retira',
      direccionEntrega: logistica.direccionEntrega || customerDoc?.direccion,
      localidadEntrega: logistica.localidadEntrega || customerDoc?.localidad || 'Santa Fe',
      pisoAcceso: {
        plantaBaja: Boolean(logistica.pisoAcceso?.plantaBaja),
        ascensor: Boolean(logistica.pisoAcceso?.ascensor),
        escaleraEstrecha: Boolean(logistica.pisoAcceso?.escaleraEstrecha),
      },
      plazoEntrega: logistica.plazoEntrega,
      turnoEntrega: logistica.turnoEntrega || 'Indistinto',
    },
    condicionesComerciales: {
      formaPago: req.body.condicionesComerciales?.formaPago || 'Tienda E-commerce',
      observacionesFactura: observaciones,
      observacionesReparto: req.body.condicionesComerciales?.observacionesReparto || logistica.observacionesReparto,
    },
    totales: {
      subtotalVenta: total,
      bonificacion: 0,
      totalVenta: total,
    },
    createdBy: req.user?.userId,
    statusHistory: [{ 
      status: 'pendiente', 
      at: new Date(), 
      by: req.user?.userId,
      notes: `Generada automáticamente desde Tienda en Vivo (${customerDoc?.name || 'Cliente Web'})`
    }],
    operatorNotes: `Compra en Tienda en Vivo - Cliente: ${customerDoc?.name || (typeof customer === 'string' ? customer : 'Web')}`
  });


  const sillasNombres = sillasArr.map(s => {
    const tipo = tipos.find(t => t._id.toString() === s.chairTypeId);
    return tipo ? `${tipo.name} x${s.quantity}` : `Silla x${s.quantity}`;
  });

  await createAuditLog({
    action: 'work_order_created',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Creación de OT #${wo._id.toString().slice(-6)} desde Tienda en Vivo`,
    metadata: {
      orderId: wo._id,
      sillas: sillasNombres,
      total,
      customer
    },
    req,
  });

  invalidateStockCache();

  const io = req.app.get('io');
  if (io) {
    io.emit('catalog:updated');
    io.emit('work_order:created');
  }

  res.status(201).json({ message: 'Compra concretada, orden de trabajo generada', orderId: wo._id, total });
};
