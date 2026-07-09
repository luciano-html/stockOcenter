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
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.static(path.join(__dirname, '../../client/dist')));

import authRoutes from './routes/authRoutes';
import componentRoutes from './routes/componentRoutes';
import chairTypeRoutes from './routes/chairTypeRoutes';
import workOrderRoutes from './routes/workOrderRoutes';
import stockRoutes from './routes/stockRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/componentes', componentRoutes);
app.use('/api/tipos-silla', chairTypeRoutes);
app.use('/api/ordenes-trabajo', workOrderRoutes);
app.use('/api/stock', stockRoutes);

app.use('/api/*', (_req, _res, next) => {
  next(ApiError.notFound('Ruta no encontrada'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

app.use(errorHandler);

export default app;
