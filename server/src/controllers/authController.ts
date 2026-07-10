import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, AuditLog } from '../models';
import { ApiError } from '../utils/ApiError';
import { getPagination, getSkip } from '../utils/pagination';
import { createAuditLog } from '../services/auditService';

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
  if (!user) {
    await createAuditLog({
      action: 'login_failed',
      severity: 'warning',
      username,
      description: `Intento fallido de login para el usuario "${username}" (no existe o inactivo)`,
      metadata: { reason: 'user_not_found_or_inactive', username },
      req,
    });
    throw ApiError.unauthorized('Usuario o contraseña incorrectos');
  }

  const valida = await bcrypt.compare(password, user.password);
  if (!valida) {
    await createAuditLog({
      action: 'login_failed',
      severity: 'warning',
      username: user.username,
      description: `Contraseña incorrecta para el usuario "${user.username}"`,
      metadata: { reason: 'invalid_password', username: user.username },
      req,
    });
    throw ApiError.unauthorized('Usuario o contraseña incorrectos');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  setAuthCookies(res, accessToken, refreshToken);

  await createAuditLog({
    action: 'login_success',
    severity: 'info',
    userId: user._id,
    userRole: user.role,
    username: user.username,
    description: `Inicio de sesión de "${user.username}" (${user.role})`,
    metadata: { username: user.username, role: user.role },
    req,
  });

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

  const admin = await User.findById(req.user!.userId);
  await createAuditLog({
    action: 'user_created',
    severity: 'info',
    userId: admin?._id,
    userRole: admin?.role,
    username: admin?.username,
    description: `El usuario "${admin?.username}" creó a "${user.username}" (${user.role})`,
    metadata: { createdUserId: user._id, createdUsername: user.username, createdRole: user.role },
    req,
  });

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

export async function logout(req: Request, res: Response) {
  const user = req.user ? await User.findById(req.user.userId) : null;
  if (user) {
    await createAuditLog({
      action: 'logout',
      severity: 'info',
      userId: user._id,
      userRole: user.role,
      username: user.username,
      description: `Cierre de sesión de "${user.username}"`,
      metadata: { username: user.username },
      req,
    });
  }
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
  const changedFields: string[] = [];
  if (name) {
    update.name = name;
    changedFields.push('name');
  }
  if (password) {
    update.password = await bcrypt.hash(password, 10);
    changedFields.push('password');
  }

  const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('Usuario no encontrado');

  await createAuditLog({
    action: 'profile_updated',
    severity: 'info',
    userId: user._id,
    userRole: user.role,
    username: user.username,
    description: `"${user.username}" actualizó su perfil (${changedFields.join(', ')})`,
    metadata: { changedFields },
    req,
  });

  res.json({ data: { id: user._id, username: user.username, name: user.name, role: user.role } });
}

export async function deleteUser(req: Request, res: Response) {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound('Usuario no encontrado');

  const admin = await User.findById(req.user!.userId);
  await createAuditLog({
    action: 'user_deleted',
    severity: 'warning',
    userId: admin?._id,
    userRole: admin?.role,
    username: admin?.username,
    description: `El usuario "${admin?.username}" eliminó a "${user.username}" (${user.role})`,
    metadata: { deletedUserId: user._id, deletedUsername: user.username, deletedRole: user.role },
    req,
  });

  res.json({ data: { id: user._id } });
}

export async function listLogs(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const { userId, action, severity, desde, hasta } = req.query as {
    userId?: string;
    action?: string;
    severity?: string;
    desde?: string;
    hasta?: string;
  };

  const filter: Record<string, unknown> = {};
  if (userId) filter.userId = userId;
  if (action) filter.action = action;
  if (severity) filter.severity = severity;
  if (desde || hasta) {
    filter.createdAt = {};
    if (desde) (filter.createdAt as Record<string, Date>).$gte = new Date(desde);
    if (hasta) (filter.createdAt as Record<string, Date>).$lte = new Date(hasta);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    data: logs,
    pagination: getPagination(page, limit, total),
  });
}
