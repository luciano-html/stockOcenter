"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movimientosQuerySchema = exports.egresoStockSchema = exports.ingresoMasivoSchema = exports.ingresoStockSchema = void 0;
var zod_1 = require("zod");
var common_1 = require("./common");
exports.ingresoStockSchema = zod_1.z.object({
    componenteId: common_1.objectIdSchema,
    cantidad: zod_1.z.number().int().min(1, 'La cantidad debe ser al menos 1'),
    notas: zod_1.z.string().trim().optional(),
});
exports.ingresoMasivoSchema = zod_1.z.object({
    notasGenerales: zod_1.z.string().trim().optional(),
    items: zod_1.z
        .array(zod_1.z.object({
        componenteId: common_1.objectIdSchema,
        cantidad: zod_1.z.number().int().min(1, 'La cantidad debe ser al menos 1'),
        notas: zod_1.z.string().trim().optional(),
    }))
        .min(1, 'Debe enviar al menos un ítem'),
});
exports.egresoStockSchema = zod_1.z.object({
    componenteId: common_1.objectIdSchema,
    cantidad: zod_1.z.number().int().min(1, 'La cantidad debe ser al menos 1'),
    notas: zod_1.z.string().trim().optional(),
});
exports.movimientosQuerySchema = zod_1.z.object({
    componenteId: common_1.objectIdSchema.optional(),
    tipo: zod_1.z.enum(['ingreso', 'egreso']).optional(),
    desde: zod_1.z.string().optional(),
    hasta: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
