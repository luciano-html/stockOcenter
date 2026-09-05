import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStop {
  orderId: Types.ObjectId;
  sequence: number;
  status: 'pendiente' | 'en_camino' | 'llegue' | 'entregado' | 'rebotado';
  arrivalTime?: Date;
  departureTime?: Date;
  reason?: string;
}

export interface IDeliveryRoute extends Document {
  routeNumber: number;
  date: Date;
  driver: string;
  assistant?: string;
  stops: IStop[];
  status: 'pendiente' | 'en_curso' | 'finalizada';
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stopSchema = new Schema<IStop>({
  orderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true },
  sequence: { type: Number, required: true },
  status: { type: String, enum: ['pendiente', 'en_camino', 'llegue', 'entregado', 'rebotado'], default: 'pendiente' },
  arrivalTime: { type: Date },
  departureTime: { type: Date },
  reason: { type: String }
}, { _id: false });

const deliveryRouteSchema = new Schema<IDeliveryRoute>(
  {
    routeNumber: { type: Number, unique: true },
    date: { type: Date, required: true, default: Date.now },
    driver: { type: String, required: true },
    assistant: { type: String },
    stops: [stopSchema],
    status: { type: String, enum: ['pendiente', 'en_curso', 'finalizada'], default: 'pendiente' },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-increment routeNumber
deliveryRouteSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastRoute = await mongoose.models.DeliveryRoute.findOne().sort({ routeNumber: -1 });
    this.routeNumber = lastRoute && lastRoute.routeNumber ? lastRoute.routeNumber + 1 : 1;
  }
  next();
});

export const DeliveryRoute = mongoose.model<IDeliveryRoute>('DeliveryRoute', deliveryRouteSchema);
