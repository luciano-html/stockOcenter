import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { User } from './models';

async function seed() {
  await connectDB();

  const adminExiste = await User.findOne({ username: 'admin' });
  if (adminExiste) {
    console.log('El usuario admin ya existe');
    process.exit(0);
  }

  const hash = await bcrypt.hash('admin123', 10);
  await User.create({
    username: 'admin',
    password: hash,
    name: 'Administrador',
    role: 'admin',
  });

  console.log('Usuario admin creado: admin / admin123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
