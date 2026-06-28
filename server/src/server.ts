import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';

const PORT = Number(process.env.PORT ?? 3000);

function validateEnv() {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET === 'change-this-secret') {
    console.error('JWT_SECRET es el valor por defecto inseguro. Generá uno robusto con: openssl rand -base64 32');
    process.exit(1);
  }

  if (process.env.REFRESH_TOKEN_SECRET === 'change-this-refresh-secret') {
    console.error('REFRESH_TOKEN_SECRET es el valor por defecto inseguro. Generá uno robusto con: openssl rand -base64 32');
    process.exit(1);
  }
}

async function main() {
  validateEnv();
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
