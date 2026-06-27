import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT ?? 3000;

async function main() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
