import { Request, Response } from 'express';
import { ChairType, BOMItem, PricingConfig } from '../models';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/escapeRegex';
import { createAuditLog } from '../services/auditService';

export async function getOrCreatePricingConfig() {
  let config = await PricingConfig.findOne({ key: 'global' });
  if (!config) {
    config = await PricingConfig.create({
      key: 'global',
      manoDeObra: 25000,
      iva: 21,
      gastosGenerales: 5,
      comisiones: 10,
      margenGanancia: 35,
      porcentajeAdicional: 0,
      costosPersonalizados: [],
    });
  }
  return config;
}

export async function getPricingOverview(req: Request, res: Response) {
  const { q, tipo, active } = req.query as {
    q?: string;
    tipo?: string;
    active?: 'true' | 'false' | 'all';
  };

  const filter: Record<string, unknown> = {};
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  if (tipo) filter.tipo = tipo;
  if (active === 'true') filter.active = true;
  if (active === 'false') filter.active = false;

  const [config, chairs, allBomItems] = await Promise.all([
    getOrCreatePricingConfig(),
    ChairType.find(filter).sort({ name: 1 }).lean(),
    BOMItem.find()
      .populate('componentId', 'name unit precio tipo subtipo marca')
      .lean(),
  ]);

  const bomByChair = new Map<string, Array<{ componentId: any; quantity: number }>>();
  for (const item of allBomItems) {
    const cId = item.chairTypeId.toString();
    if (!bomByChair.has(cId)) bomByChair.set(cId, []);
    bomByChair.get(cId)!.push(item as any);
  }

  const manoDeObra = config.manoDeObra || 0;
  const iva = config.iva ?? 21;
  const gastosGenerales = config.gastosGenerales || 0;
  const comisiones = config.comisiones || 0;
  const margenGanancia = config.margenGanancia || 35;
  const costosPersonalizados = config.costosPersonalizados || [];

  let totalCostoSum = 0;
  let totalPrecioVentaSum = 0;
  let chairsWithPriceCount = 0;

  const sillas = chairs.map((chair) => {
    const items = bomByChair.get(chair._id.toString()) || [];

    const bomDetalle = items.map((it) => {
      const comp = it.componentId as {
        _id: string;
        name: string;
        unit: string;
        precio: number;
        tipo?: string;
        subtipo?: string;
        marca?: string;
      } | null;

      const precioUnit = comp?.precio || 0;
      const subtotal = precioUnit * (it.quantity || 1);

      return {
        componentId: comp?._id?.toString() || '',
        name: comp?.name || 'Componente no encontrado',
        unit: comp?.unit || 'unidad',
        tipo: comp?.tipo || '',
        subtipo: comp?.subtipo || '',
        marca: comp?.marca || '',
        precioUnitario: precioUnit,
        cantidad: it.quantity,
        subtotal,
      };
    });

    const costoComponentes = bomDetalle.reduce((acc, it) => acc + it.subtotal, 0);
    const costoBase = costoComponentes + manoDeObra;
    const montoGastosGenerales = Math.round(costoBase * (gastosGenerales / 100));

    let montoCostosPersonalizados = 0;
    const detalleCostosPersonalizados = costosPersonalizados.map((cp) => {
      const monto = cp.tipo === 'porcentaje'
        ? Math.round(costoBase * (cp.valor / 100))
        : Math.round(cp.valor);
      montoCostosPersonalizados += monto;
      return {
        nombre: cp.nombre,
        tipo: cp.tipo,
        valor: cp.valor,
        monto,
      };
    });

    const costoTotal = costoBase + montoGastosGenerales + montoCostosPersonalizados;
    
    // Precio sugerido considerando margen y luego IVA
    const subtotalConMargen = costoTotal * (1 + (margenGanancia / 100));
    const precioSugerido = Math.round(subtotalConMargen * (1 + (iva / 100)));

    const precioVenta = chair.precioVenta || 0;
    const montoComisiones = Math.round(precioVenta * (comisiones / 100));
    const ganancia = precioVenta > 0 ? (precioVenta - costoTotal - montoComisiones) : 0;
    const margenPorcentaje =
      costoTotal > 0 && precioVenta > 0
        ? Math.round(((precioVenta - costoTotal) / costoTotal) * 1000) / 10
        : 0;

    totalCostoSum += costoTotal;
    if (precioVenta > 0) {
      totalPrecioVentaSum += precioVenta;
      chairsWithPriceCount++;
    }

    return {
      _id: chair._id,
      name: chair.name,
      tipo: chair.tipo || '',
      description: chair.description || '',
      imageUrl: chair.imageUrl || '',
      active: chair.active,
      bomCount: items.length,
      bomDetalle,
      costoComponentes,
      manoDeObra,
      gastosGenerales,
      montoGastosGenerales,
      iva,
      comisiones,
      montoComisiones,
      margenGananciaSugerido: margenGanancia,
      detalleCostosPersonalizados,
      montoCostosPersonalizados,
      costoTotal,
      precioSugerido,
      precioVenta,
      ganancia,
      margenPorcentaje,
    };
  });

  const totalSillas = sillas.length;
  const costoPromedio = totalSillas > 0 ? Math.round(totalCostoSum / totalSillas) : 0;
  const precioVentaPromedio =
    chairsWithPriceCount > 0 ? Math.round(totalPrecioVentaSum / chairsWithPriceCount) : 0;
  const margenPromedio =
    costoPromedio > 0 ? Math.round(((precioVentaPromedio - costoPromedio) / costoPromedio) * 1000) / 10 : 0;

  res.json({
    data: {
      config: {
        manoDeObra: config.manoDeObra,
        iva: config.iva,
        gastosGenerales: config.gastosGenerales,
        comisiones: config.comisiones,
        margenGanancia: config.margenGanancia,
        costosPersonalizados: config.costosPersonalizados,
        updatedAt: config.updatedAt,
      },
      summary: {
        totalSillas,
        costoPromedio,
        precioVentaPromedio,
        margenPromedio,
      },
      sillas,
    },
  });
}

export async function updatePricingConfig(req: Request, res: Response) {
  const {
    manoDeObra,
    iva,
    gastosGenerales,
    comisiones,
    margenGanancia,
    costosPersonalizados,
  } = req.body;

  const config = await PricingConfig.findOneAndUpdate(
    { key: 'global' },
    {
      manoDeObra,
      iva,
      gastosGenerales,
      comisiones,
      margenGanancia,
      costosPersonalizados: costosPersonalizados || [],
    },
    { new: true, upsert: true, runValidators: true }
  );

  await createAuditLog({
    action: 'pricing_config_updated' as any,
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Actualización de configuración global de costos: Mano de Obra = $${manoDeObra}, IVA = ${iva}%, Gastos = ${gastosGenerales}%, Comisiones = ${comisiones}%, Margen Sugerido = ${margenGanancia}%`,
    metadata: { manoDeObra, iva, gastosGenerales, comisiones, margenGanancia, costosPersonalizados },
    req,
  });

  res.json({ data: config });
}

export async function updatePrecioVenta(req: Request, res: Response) {
  const { precioVenta } = req.body;
  const chair = await ChairType.findByIdAndUpdate(
    req.params.id,
    { precioVenta },
    { new: true, runValidators: true }
  );

  if (!chair) throw ApiError.notFound('Tipo de silla no encontrado');

  await createAuditLog({
    action: 'chair_type_updated',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Actualización de precio de venta para "${chair.name}": $${precioVenta}`,
    metadata: { chairTypeId: chair._id, name: chair.name, precioVenta },
    req,
  });

  res.json({ data: chair });
}

export async function bulkUpdatePrecios(req: Request, res: Response) {
  const { updates } = req.body as { updates: Array<{ id: string; precioVenta: number }> };

  const bulkOps = updates.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { precioVenta: item.precioVenta } },
    },
  }));

  const result = await ChairType.bulkWrite(bulkOps);

  await createAuditLog({
    action: 'chair_type_updated',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Actualización masiva de precios de venta: ${result.modifiedCount} sillas actualizadas`,
    metadata: { modifiedCount: result.modifiedCount, totalRequested: updates.length },
    req,
  });

  res.json({
    data: {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    },
  });
}

