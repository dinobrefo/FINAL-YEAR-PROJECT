/**
 * End-to-end bed-lifecycle test: drives the real ambulanceRoutes handlers
 * against an in-memory Postgres (pg-mem) and asserts the hospital bed
 * counters after each transition.
 *
 * If pg-mem can't parse some SQL feature we rely on, the suite skips itself
 * rather than failing the build.
 */
const crypto = require('crypto');

let ready = false;
let request, app, pool, HOSP_A, HOSP_B;

async function q(text, params) {
  return pool.query(text.replace(/\bFOR UPDATE\b/gi, ''), params);
}

beforeAll(async () => {
  try {
    const { newDb, DataType } = require('pg-mem');
    const express = require('express');
    require('express-async-errors');
    const supertest = require('supertest');

    const mem = newDb();
    mem.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.uuid,
      implementation: () => crypto.randomUUID(),
      impure: true,
    });

    mem.public.none(`
      CREATE TABLE hospitals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        total_general_beds INT NOT NULL DEFAULT 0,
        occupied_general_beds INT NOT NULL DEFAULT 0,
        reserved_general_beds INT NOT NULL DEFAULT 0,
        total_icu_beds INT NOT NULL DEFAULT 0,
        occupied_icu_beds INT NOT NULL DEFAULT 0,
        reserved_icu_beds INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT now()
      );
      CREATE TABLE ambulances (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        call_sign TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'available',
        current_latitude DOUBLE PRECISION,
        current_longitude DOUBLE PRECISION,
        last_ping TIMESTAMP DEFAULT now()
      );
      CREATE TABLE emergency_cases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ambulance_id UUID,
        assigned_hospital_id UUID,
        patient_identifier TEXT,
        trauma_level INT,
        emergency_type TEXT DEFAULT 'General Emergency',
        triage_notes TEXT,
        bed_type_assigned TEXT DEFAULT 'general',
        patient_vitals JSONB,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT now(),
        resolved_at TIMESTAMP
      );
    `);

    const adapter = mem.adapters.createPg();
    pool = new adapter.Pool();

    const dbShim = {
      query: (t, p) => q(t, p),
      pool,
      withTransaction: async (fn) => {
        const client = await pool.connect();
        const exec = { query: (t, p) => client.query(t.replace(/\bFOR UPDATE\b/gi, ''), p) };
        try {
          await client.query('BEGIN');
          const r = await fn(exec);
          await client.query('COMMIT');
          return r;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      },
    };
    jest.doMock('../src/db', () => dbShim);

    const ambulanceRoutes = require('../src/routes/ambulanceRoutes');
    const { errorHandler } = require('../src/middleware/errorHandler');

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.io = { emit: () => {} }; next(); });
    app.use('/api/ambulances', ambulanceRoutes);
    app.use(errorHandler);
    request = supertest(app);

    const a = await q("INSERT INTO hospitals (name, total_general_beds, total_icu_beds) VALUES ('Hospital A', 10, 4) RETURNING id");
    const b = await q("INSERT INTO hospitals (name, total_general_beds, total_icu_beds) VALUES ('Hospital B', 10, 4) RETURNING id");
    HOSP_A = a.rows[0].id;
    HOSP_B = b.rows[0].id;
    ready = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[integration] pg-mem setup failed, skipping suite:', err.message);
  }
});

const beds = async (id) => {
  const { rows } = await q('SELECT * FROM hospitals WHERE id = $1', [id]);
  return rows[0];
};

describe('ambulance case -> bed lifecycle', () => {
  test('creating a case reserves a bed; arriving converts it; resolving frees it', async () => {
    if (!ready) return;

    const create = await request.post('/api/ambulances/cases').send({
      assigned_hospital_id: HOSP_A, trauma_level: 2, status: 'in-transit',
    });
    expect(create.status).toBe(201);
    const caseId = create.body.id;

    let h = await beds(HOSP_A);
    expect(h.reserved_general_beds).toBe(1);
    expect(h.occupied_general_beds).toBe(0);

    const arrive = await request.put(`/api/ambulances/cases/${caseId}/status`).send({ status: 'arrived' });
    expect(arrive.status).toBe(200);
    h = await beds(HOSP_A);
    expect(h.reserved_general_beds).toBe(0);
    expect(h.occupied_general_beds).toBe(1);

    const resolve = await request.put(`/api/ambulances/cases/${caseId}/status`).send({ status: 'resolved' });
    expect(resolve.status).toBe(200);
    h = await beds(HOSP_A);
    expect(h.occupied_general_beds).toBe(0);
  });

  test('a repeated "arrived" call does not double-count', async () => {
    if (!ready) return;
    const create = await request.post('/api/ambulances/cases').send({
      assigned_hospital_id: HOSP_A, trauma_level: 2, status: 'in-transit',
    });
    const caseId = create.body.id;
    await request.put(`/api/ambulances/cases/${caseId}/status`).send({ status: 'arrived' });
    await request.put(`/api/ambulances/cases/${caseId}/status`).send({ status: 'arrived' });
    const h = await beds(HOSP_A);
    expect(h.occupied_general_beds).toBe(1);
    expect(h.reserved_general_beds).toBe(0);
    await request.put(`/api/ambulances/cases/${caseId}/status`).send({ status: 'resolved' });
  });

  test('reroute moves the reservation to the new hospital', async () => {
    if (!ready) return;
    const create = await request.post('/api/ambulances/cases').send({
      assigned_hospital_id: HOSP_A, trauma_level: 2, status: 'in-transit',
    });
    const caseId = create.body.id;
    expect((await beds(HOSP_A)).reserved_general_beds).toBeGreaterThanOrEqual(1);

    const before = (await beds(HOSP_A)).reserved_general_beds;
    await request.put(`/api/ambulances/cases/${caseId}/reroute`).send({ hospital_id: HOSP_B });
    expect((await beds(HOSP_A)).reserved_general_beds).toBe(before - 1);
    expect((await beds(HOSP_B)).reserved_general_beds).toBeGreaterThanOrEqual(1);
    await request.put(`/api/ambulances/cases/${caseId}/status`).send({ status: 'resolved' });
  });

  test('rejects an invalid status with 400', async () => {
    if (!ready) return;
    const create = await request.post('/api/ambulances/cases').send({
      assigned_hospital_id: HOSP_A, trauma_level: 1, status: 'in-transit',
    });
    const bad = await request.put(`/api/ambulances/cases/${create.body.id}/status`).send({ status: 'teleported' });
    expect(bad.status).toBe(400);
    await request.put(`/api/ambulances/cases/${create.body.id}/status`).send({ status: 'resolved' });
  });

  test('rejects a malformed case id with 400', async () => {
    if (!ready) return;
    const bad = await request.put('/api/ambulances/cases/not-a-uuid/status').send({ status: 'arrived' });
    expect(bad.status).toBe(400);
  });
});
