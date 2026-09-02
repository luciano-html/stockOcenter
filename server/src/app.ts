import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { ApiError } from './utils/ApiError';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (ej. curl, postman) o si coincide con la lista
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    credentials: true,
  })
);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/sillas', express.static(path.join(__dirname, '../../client/public/sillas')));
app.use(express.static(path.join(__dirname, '../../client/dist')));

import authRoutes from './routes/authRoutes';
import componentRoutes from './routes/componentRoutes';
import chairTypeRoutes from './routes/chairTypeRoutes';
import workOrderRoutes from './routes/workOrderRoutes';
import stockRoutes from './routes/stockRoutes';
import liveSeatRoutes from './routes/liveSeatRoutes';
import pricingRoutes from './routes/pricingRoutes';
import customerRoutes from './routes/customerRoutes';

import deliveryRouteRoutes from './routes/deliveryRouteRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/componentes', componentRoutes);
app.use('/api/tipos-silla/pricing', pricingRoutes);
app.use('/api/tipos-silla', chairTypeRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/ordenes-trabajo', workOrderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/live-seats', liveSeatRoutes);
app.use('/api/delivery-routes', deliveryRouteRoutes);


app.use('/api/*', (_req, _res, next) => {
  next(ApiError.notFound('Ruta no encontrada'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

app.use(errorHandler);

export default app;
