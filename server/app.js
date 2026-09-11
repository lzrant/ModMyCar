import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'
import { CATEGORIES } from '../shared/renderPresets.js'
import {
  ValidationError,
  parseBuildPayload,
  validateSelection,
  positiveId,
  parseBuildId,
} from '../shared/build.js'

export function createApp({ store, frontendOrigin }) {
  if (!frontendOrigin || new URL(frontendOrigin).origin !== frontendOrigin)
    throw new Error(
      'FRONTEND_ORIGIN must be an exact origin without a trailing slash.',
    )
  const app = express()
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    if (req.headers.origin && req.headers.origin !== frontendOrigin)
      return res.status(403).json({ error: 'Origin is not allowed.' })
    next()
  })
  app.use(
    cors({
      origin: frontendOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
    }),
  )
  app.use(express.json({ limit: '16kb' }))
  app.get('/api/health', (req, res) => res.json({ ok: true, mode: store.mode }))
  app.get('/api/vehicles', async (req, res) => {
    if (
      Object.keys(req.query).some(
        (key) => !['year', 'make', 'model'].includes(key),
      )
    )
      throw new ValidationError('Unknown vehicle filter.')
    const { year, make, model } = req.query
    if (
      year !== undefined &&
      (typeof year !== 'string' ||
        !/^\d{4}$/.test(year) ||
        +year < 1886 ||
        +year > 2100)
    )
      throw new ValidationError('Invalid year.')
    for (const value of [make, model])
      if (
        value !== undefined &&
        (typeof value !== 'string' || !value.trim() || value.length > 80)
      )
        throw new ValidationError('Invalid vehicle filter.')
    const vehicles = (await store.vehicles()).filter(
      (v) =>
        (!year || v.year === +year) &&
        (!make || v.make === make) &&
        (!model || v.model === model),
    )
    res.json(vehicles)
  })
  app.get('/api/vehicles/:id/parts', async (req, res) => {
    const vehicleId = routeId(req.params.id)
    if (Object.keys(req.query).some((key) => key !== 'category'))
      throw new ValidationError('Unknown parts filter.')
    const category = req.query.category
    if (category !== undefined && !CATEGORIES.includes(category))
      throw new ValidationError('Unknown part category.')
    if (!(await store.vehicles()).some((v) => v.id === vehicleId))
      return res.status(404).json({ error: 'Vehicle not found.' })
    res.json(await store.parts(vehicleId, category))
  })
  app.use('/api/builds', async (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    const cookies = Object.fromEntries(
      (req.headers.cookie || '').split(';').map((c) => c.trim().split('=')),
    )
    const options = {
      httpOnly: true,
      sameSite: 'lax',
      secure: frontendOrigin.startsWith('https:'),
      path: '/api',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    }
    if (store.mode === 'local') {
      // Local development uses a high-entropy browser capability, never a public user ID.
      const value = cookies.mmc_local
      req.owner = value && /^[a-f0-9-]{36}$/.test(value) ? value : randomUUID()
      if (req.owner !== value) res.cookie('mmc_local', req.owner, options)
    } else {
      const session = await store.session(
        cookies.mmc_access,
        cookies.mmc_refresh,
      )
      req.owner = session.owner
      if (session.access) {
        res.cookie('mmc_access', session.access, options)
        res.cookie('mmc_refresh', session.refresh, options)
      }
    }
    next()
  })
  app.get('/api/builds', async (req, res) =>
    res.json(await store.listBuilds(req.owner)),
  )
  app.get('/api/builds/:id', async (req, res) => {
    const build = await store.getBuild(req.owner, parseBuildId(req.params.id))
    if (!build)
      return res
        .status(404)
        .json({ error: 'Build not found in this browser’s garage.' })
    res.json(build)
  })
  app.post('/api/builds', async (req, res) => {
    const payload = parseBuildPayload(req.body)
    if (!(await store.vehicles()).some((v) => v.id === payload.vehicle_id))
      throw new ValidationError('Unknown vehicle.')
    validateSelection(payload, await store.parts(payload.vehicle_id))
    res.status(201).json(await store.saveBuild(req.owner, payload))
  })
  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }))
  app.use((error, req, res, _next) => {
    const status =
      error.status === 400 || error.type === 'entity.parse.failed'
        ? 400
        : error.status === 401
          ? 401
          : error.status === 413
            ? 413
            : 500
    res
      .status(status)
      .json({
        error:
          status < 500
            ? error.message
            : 'The server could not complete this request.',
      })
  })
  return app
}
function routeId(value) {
  if (!/^\d+$/.test(value)) throw new ValidationError('Invalid vehicle ID.')
  return positiveId(Number(value), 'Vehicle ID')
}
