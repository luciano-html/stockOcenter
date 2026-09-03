import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDeliveryRoute extends Document {
  routeNumber: number;
  date: Date;
  driver: string;
  assistant?: string;
  orders: Types.ObjectId[];
  status: 'pendiente' | 'en_curso' | 'finalizada';
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryRouteSchema = new Schema<IDeliveryRoute>(
  {
    routeNumber: { type: Number, unique: true },
    date: { type: Date, required: true, default: Date.now },
    driver: { type: String, required: true },
    assistant: { type: String },
    orders: [{ type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true }],
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
