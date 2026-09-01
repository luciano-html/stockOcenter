import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Endpoints de Pricing y Costos', () => {
  it('requiere autenticación para GET /api/pricing', async () => {
    const res = await request(app).get('/api/pricing');
    expect(res.status).toBe(401);
  });

  it('requiere autenticación para PUT /api/pricing/config', async () => {
    const res = await request(app)
      .put('/api/pricing/config')
      .send({ manoDeObra: 30000, porcentajeAdicional: 15 });
    expect(res.status).toBe(401);
  });

  it('requiere autenticación para PUT /api/tipos-silla/pricing/config', async () => {
    const res = await request(app)
      .put('/api/tipos-silla/pricing/config')
      .send({ manoDeObra: 30000, porcentajeAdicional: 15 });
    expect(res.status).toBe(401);
  });
});
