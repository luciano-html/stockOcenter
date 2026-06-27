import { Request, Response } from 'express';
import { Component } from '../models';
import { ApiError } from '../utils/ApiError';

export async function list(_req: Request, res: Response) {
  const { search, stockBajo } = _req.query as { search?: string; stockBajo?: string };

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if (stockBajo === 'true') {
    filter.$expr = { $lte: ['$stockActual', '$stockMinimo'] };
  }

  const componentes = await Component.find(filter).sort({ name: 1 });
  res.json({ data: componentes });
}

export async function getById(req: Request, res: Response) {
  const componente = await Component.findById(req.params.id);
  if (!componente) throw ApiError.notFound('Componente no encontrado');
  res.json({ data: componente });
}

export async function create(req: Request, res: Response) {
  const existe = await Component.findOne({ name: req.body.name });
  if (existe) throw ApiError.conflict('Ya existe un componente con ese nombre');

  const componente = await Component.create(req.body);
  res.status(201).json({ data: componente });
}

export async function update(req: Request, res: Response) {
  const { name } = req.body;
  if (name) {
    const duplicado = await Component.findOne({ name, _id: { $ne: req.params.id } });
    if (duplicado) throw ApiError.conflict('Ya existe otro componente con ese nombre');
  }

  const componente = await Component.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!componente) throw ApiError.notFound('Componente no encontrado');
  res.json({ data: componente });
}

export async function remove(req: Request, res: Response) {
  const componente = await Component.findByIdAndDelete(req.params.id);
  if (!componente) throw ApiError.notFound('Componente no encontrado');
  res.json({ data: componente });
}
