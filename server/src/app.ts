import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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
app.use('/api', stockRoutes); // /api/movimientos

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

app.use(errorHandler);

export default app;
