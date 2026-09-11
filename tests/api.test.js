import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLocalStore } from '../server/localStore.js'
import { createApp } from '../server/app.js'
let dir, app, store, agent
const origin = 'http://localhost:5173'
const payload = { vehicle_id: 1, part_ids: [1, 3, 4], paint_color: '#2876d7' }
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mmc-test-'))
  store = await createLocalStore(join(dir, 'builds.json'))
  app = createApp({ store, frontendOrigin: origin })
  agent = request.agent(app)
})
afterEach(async () => rm(dir, { recursive: true, force: true }))
describe('Express API', () => {
  it('lists and filters actual vehicles, exact compatibility and categories', async () => {
    const { body } = await request(app)
      .get('/api/vehicles?year=2018&make=Subaru')
      .expect(200)
    expect(body.map((v) => v.model)).toEqual(['WRX', 'BRZ'])
    const { body: parts } = await request(app)
      .get('/api/vehicles/1/parts?category=wheels')
      .expect(200)
    expect(parts.map((p) => p.id)).toEqual([1, 2])
    await request(app).get('/api/vehicles/999/parts').expect(404)
  })
  it.each([
    '/api/vehicles?year=oops',
    '/api/vehicles?make[x]=y',
    '/api/vehicles?make=',
    '/api/vehicles/-1/parts',
    '/api/vehicles/1x/parts',
    '/api/vehicles/1/parts?category=oops',
    '/api/builds/bad',
  ])('validates %s', async (path) => {
    await request(app).get(path).expect(400)
  })
  it('allows the configured origin and rejects foreign origins including preflight', async () => {
    const result = await request(app)
      .get('/api/vehicles')
      .set('Origin', origin)
      .expect(200)
    expect(result.headers['access-control-allow-origin']).toBe(origin)
    expect(result.headers['access-control-allow-credentials']).toBe('true')
    await request(app)
      .options('/api/builds')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204)
    await request(app)
      .post('/api/builds')
      .set('Origin', 'https://untrusted.invalid')
      .send(payload)
      .expect(403)
    await request(app)
      .options('/api/builds')
      .set('Origin', 'https://untrusted.invalid')
      .expect(403)
  })
  it('saves and loads through HTTP, survives restart, and isolates another browser', async () => {
    const saved = await agent.post('/api/builds').send(payload).expect(201)
    expect(saved.body).toMatchObject(payload)
    expect(saved.body).not.toHaveProperty('owner')
    const cookie = saved.headers['set-cookie'][0].split(';')[0]
    expect(saved.headers['set-cookie'][0]).toContain('HttpOnly')
    const { body } = await agent.get(`/api/builds/${saved.body.id}`).expect(200)
    expect(body).toEqual(saved.body)
    expect((await agent.get('/api/builds')).body).toHaveLength(1)
    await request(app).get(`/api/builds/${body.id}`).expect(404)
    expect((await request(app).get('/api/builds')).body).toEqual([])
    const restarted = createApp({
      store: await createLocalStore(join(dir, 'builds.json')),
      frontendOrigin: origin,
    })
    expect(
      (
        await request(restarted)
          .get(`/api/builds/${body.id}`)
          .set('Cookie', cookie)
      ).body,
    ).toEqual(body)
  })
  it('validates foreign IDs, slot conflicts, incompatible selections, JSON and body size', async () => {
    for (const input of [
      { ...payload, vehicle_id: 999 },
      { ...payload, part_ids: [6] },
      { ...payload, part_ids: [1, 2] },
      { ...payload, paint_color: 'red' },
      { ...payload, user_id: 'injected' },
    ])
      await agent.post('/api/builds').send(input).expect(400)
    await agent
      .post('/api/builds')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400)
    await agent
      .post('/api/builds')
      .send({ text: 'x'.repeat(20000) })
      .expect(413)
  })
  it('serializes concurrent durable saves without losing a build', async () => {
    await agent.get('/api/builds').expect(200)
    await Promise.all(
      Array.from({ length: 8 }, () =>
        agent.post('/api/builds').send(payload).expect(201),
      ),
    )
    expect((await agent.get('/api/builds')).body).toHaveLength(8)
  })
  it('returns a safe error when storage fails', async () => {
    const broken = createApp({
      store: {
        ...store,
        vehicles: async () => {
          throw new Error('private database details')
        },
      },
      frontendOrigin: origin,
    })
    expect(
      (await request(broken).get('/api/vehicles').expect(500)).body.error,
    ).not.toContain('private')
    expect(() => createApp({ store, frontendOrigin: '*' })).toThrow()
  })
})
