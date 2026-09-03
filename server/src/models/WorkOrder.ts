import mongoose, { Schema, Document, Types } from 'mongoose';

export type WorkOrderStatus = 'pendiente' | 'en_progreso' | 'pausada' | 'control' | 'espera_reparto' | 'en_reparto' | 'finalizada' | 'cancelada';

export interface IWorkOrderSilla {
  chairTypeId: Types.ObjectId;
  quantity: number;
}

export interface IWorkOrderItem {
  componentId: Types.ObjectId;
  quantity: number;
  type: 'adicional' | 'repuesto';
}

export interface IWorkOrderStatusEntry {
  status: WorkOrderStatus;
  at: Date;
  by?: Types.ObjectId;
  notes?: string;
}

export interface IWorkOrderCliente {
  customerId?: Types.ObjectId;
  name: string;
  razonSocial?: string;
  cuit?: string;
  condicionIva?: string;
  email?: string;
  telefono?: string;
  contacto?: string;
  domicilio?: string;
}

export interface IWorkOrderLogistica {
  sucursalOrigen?: 'Santa Fe' | 'Paraná' | 'Pedido a Fábrica';
  tipoEntrega?: 'Retira' | 'Reparto / Flete';
  direccionEntrega?: string;
  localidadEntrega?: string;
  pisoAcceso?: {
    plantaBaja?: boolean;
    ascensor?: boolean;
    escaleraEstrecha?: boolean;
  };
  plazoEntrega?: string;
  turnoEntrega?: 'Mañana' | 'Tarde' | 'Indistinto';
}

export interface IWorkOrderComercial {
  formaPago?: string;
  observacionesFactura?: string;
  observacionesReparto?: string;
}

export interface IWorkOrderTotales {
  subtotalVenta?: number;
  bonificacion?: number;
  totalVenta?: number;
  totalCosto?: number;
  gananciaEstimada?: number;
}

export interface IWorkOrder extends Document {
  sillas?: IWorkOrderSilla[];
  chairTypeId?: Types.ObjectId;
  quantity?: number;
  status: WorkOrderStatus;
  items?: IWorkOrderItem[];
  statusHistory?: IWorkOrderStatusEntry[];
  customerId?: Types.ObjectId;
  cliente?: IWorkOrderCliente;
  logistica?: IWorkOrderLogistica;
  condicionesComerciales?: IWorkOrderComercial;
  totales?: IWorkOrderTotales;
  orderNumber?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  startedBy?: Types.ObjectId;
  startedAt?: Date;
  finalizedBy?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  operatorNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
}

const workOrderSillaSchema = new Schema<IWorkOrderSilla>(
  {
    chairTypeId: { type: Schema.Types.ObjectId, ref: 'ChairType', required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const workOrderItemSchema = new Schema<IWorkOrderItem>(
  {
    componentId: { type: Schema.Types.ObjectId, ref: 'Component', required: true },
    quantity: { type: Number, required: true, min: 1 },
    type: { type: String, required: true, enum: ['adicional', 'repuesto'] },
  },
  { _id: false }
);

const workOrderStatusEntrySchema = new Schema<IWorkOrderStatusEntry>(
  {
    status: {
      type: String,
      required: true,
      enum: ['pendiente', 'en_progreso', 'pausada', 'control', 'espera_reparto', 'en_reparto', 'finalizada', 'cancelada'],
    },
    at: { type: Date, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const workOrderSchema = new Schema<IWorkOrder>(
  {
    sillas: { type: [workOrderSillaSchema] },
    chairTypeId: { type: Schema.Types.ObjectId, ref: 'ChairType', required: false, index: true },
    quantity: { type: Number, required: false, min: 1 },
    items: { type: [workOrderItemSchema] },
    statusHistory: { type: [workOrderStatusEntrySchema] },
    status: {
      type: String,
      required: true,
      enum: ['pendiente', 'en_progreso', 'pausada', 'control', 'espera_reparto', 'en_reparto', 'finalizada', 'cancelada'],
      default: 'pendiente',
      index: true,
    },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false, index: true },
    cliente: {
      customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
      name: { type: String, trim: true },
      razonSocial: { type: String, trim: true },
      cuit: { type: String, trim: true },
      condicionIva: { type: String, trim: true },
      email: { type: String, trim: true },
      telefono: { type: String, trim: true },
      contacto: { type: String, trim: true },
      domicilio: { type: String, trim: true },
    },
    logistica: {
      sucursalOrigen: {
        type: String,
        enum: ['Santa Fe', 'Paraná', 'Pedido a Fábrica'],
        default: 'Santa Fe',
      },
      tipoEntrega: {
        type: String,
        enum: ['Retira', 'Reparto / Flete'],
        default: 'Retira',
      },
      direccionEntrega: { type: String, trim: true },
      localidadEntrega: { type: String, trim: true },
      pisoAcceso: {
        plantaBaja: { type: Boolean, default: false },
        ascensor: { type: Boolean, default: false },
        escaleraEstrecha: { type: Boolean, default: false },
      },
      plazoEntrega: { type: String, trim: true },
      turnoEntrega: {
        type: String,
        enum: ['Mañana', 'Tarde', 'Indistinto'],
        default: 'Indistinto',
      },
    },
    condicionesComerciales: {
      formaPago: { type: String, trim: true },
      observacionesFactura: { type: String, trim: true },
      observacionesReparto: { type: String, trim: true },
    },
    totales: {
      subtotalVenta: { type: Number, default: 0 },
      bonificacion: { type: Number, default: 0 },
      totalVenta: { type: Number, default: 0 },
      totalCosto: { type: Number, default: 0 },
      gananciaEstimada: { type: Number, default: 0 },
    },
    orderNumber: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    startedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    startedAt: { type: Date },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    operatorNotes: { type: String, trim: true },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

workOrderSchema.index({ status: 1, createdAt: -1 });

export const WorkOrder = mongoose.model<IWorkOrder>('WorkOrder', workOrderSchema);

