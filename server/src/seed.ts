import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { User } from './models';

async function seed() {
  await connectDB();

  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', password: hash, name: 'Administrador', role: 'admin' });
    console.log('✓ Usuario admin creado (admin / admin123)');
  } else {
    console.log('✓ Usuario admin ya existe');
  }

  console.log('\n✅ Seed completo (no se modificaron datos existentes)');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
