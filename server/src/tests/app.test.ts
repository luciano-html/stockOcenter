import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('App básica', () => {
  it('responde 404 JSON en rutas /api desconocidas', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('sirve la SPA en rutas no /api', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<!doctype html>');
  });
});
