import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { ApiError } from '../utils/ApiError';

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  const user = await User.findOne({ username, active: true }).select('+password');
  if (!user) throw ApiError.unauthorized('Usuario o contraseña incorrectos');

  const valida = await bcrypt.compare(password, user.password);
  if (!valida) throw ApiError.unauthorized('Usuario o contraseña incorrectos');

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no definido');

  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    secret,
    { expiresIn: '24h' }
  );

  res.json({
    data: {
      token,
      user: { id: user._id, username: user.username, name: user.name, role: user.role },
    },
  });
}

export async function register(req: Request, res: Response) {
  const { username, password, name, role } = req.body;

  const existe = await User.findOne({ username });
  if (existe) throw ApiError.conflict('El usuario ya existe');

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, password: hash, name, role });

  res.status(201).json({
    data: { id: user._id, username: user.username, name: user.name, role: user.role },
  });
}

export async function listUsers(_req: Request, res: Response) {
  const usuarios = await User.find().sort({ name: 1 });
  res.json({ data: usuarios.map((u) => ({ id: u._id, username: u.username, name: u.name, role: u.role, active: u.active })) });
}

export async function updateProfile(req: Request, res: Response) {
  const { name, password } = req.body;
  const userId = req.user!.userId;

  const update: Record<string, unknown> = {};
  if (name) update.name = name;
  if (password) update.password = await bcrypt.hash(password, 10);

  const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('Usuario no encontrado');

  res.json({ data: { id: user._id, username: user.username, name: user.name, role: user.role } });
}

export async function deleteUser(req: Request, res: Response) {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound('Usuario no encontrado');
  res.json({ data: { id: user._id } });
}
