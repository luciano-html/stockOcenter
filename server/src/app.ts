import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

import componentRoutes from './routes/componentRoutes';

app.use('/api/componentes', componentRoutes);

app.use(errorHandler);

export default app;
