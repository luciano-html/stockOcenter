import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { ApiError } from '../utils/ApiError';
import { getPagination, getSkip } from '../utils/pagination';

const ACCESS_TOKEN_EXPIRES_IN = '30m';
const REFRESH_TOKEN_EXPIRES_IN = '8h';

function getCookieOptions(maxAgeMs: number): import('express').CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAMESITE as 'strict' | 'lax' | 'none') ?? 'lax',
    maxAge: maxAgeMs,
  };
}

function generateAccessToken(user: { _id: string | import('mongoose').Types.ObjectId; role: string }) {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ userId: user._id.toString(), role: user.role, type: 'access' }, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

function generateRefreshToken(user: { _id: string | import('mongoose').Types.ObjectId; role: string }) {
  const secret = process.env.REFRESH_TOKEN_SECRET!;
  return jwt.sign({ userId: user._id.toString(), role: user.role, type: 'refresh' }, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, getCookieOptions(30 * 60 * 1000)); // 30 min
  res.cookie('refreshToken', refreshToken, getCookieOptions(8 * 60 * 60 * 1000)); // 8 horas
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  const user = await User.findOne({ username, active: true }).select('+password');
  if (!user) throw ApiError.unauthorized('Usuario o contraseña incorrectos');

  const valida = await bcrypt.compare(password, user.password);
  if (!valida) throw ApiError.unauthorized('Usuario o contraseña incorrectos');

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  setAuthCookies(res, accessToken, refreshToken);

  res.json({
    data: {
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

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) throw ApiError.unauthorized('Sesión no válida');

  try {
    const secret = process.env.REFRESH_TOKEN_SECRET!;
    const payload = jwt.verify(refreshToken, secret) as {
      userId: string;
      role: string;
      type: string;
    };

    if (payload.type !== 'refresh') throw ApiError.unauthorized('Token inválido');

    const user = await User.findById(payload.userId);
    if (!user || !user.active) throw ApiError.unauthorized('Usuario no válido');

    const newAccessToken = generateAccessToken(user);
    res.cookie('accessToken', newAccessToken, getCookieOptions(30 * 60 * 1000));

    res.json({
      data: {
        user: { id: user._id, username: user.username, name: user.name, role: user.role },
      },
    });
  } catch {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Sesión expirada');
  }
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookies(res);
  res.json({ data: { message: 'Sesión cerrada' } });
}

export async function me(req: Request, res: Response) {
  const userId = req.user!.userId;
  const user = await User.findById(userId);
  if (!user || !user.active) throw ApiError.unauthorized('Usuario no válido');

  res.json({
    data: { id: user._id, username: user.username, name: user.name, role: user.role },
  });
}

export async function listUsers(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);

  const [usuarios, total] = await Promise.all([
    User.find().sort({ name: 1 }).skip(getSkip(page, limit)).limit(limit).lean(),
    User.countDocuments(),
  ]);

  res.json({
    data: usuarios.map((u) => ({
      id: u._id,
      username: u.username,
      name: u.name,
      role: u.role,
      active: u.active,
    })),
    pagination: getPagination(page, limit, total),
  });
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
