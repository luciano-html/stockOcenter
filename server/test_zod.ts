import { movimientosQuerySchema } from './src/validators/stockValidator';
try {
  const result = movimientosQuerySchema.parse({
    componenteId: '',
    tipo: '',
    page: '1'
  });
  console.log('SUCCESS:', result);
} catch (err) {
  console.log('ERROR:', err.errors || err);
}
