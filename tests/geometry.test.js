import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { readFile } from 'node:fs/promises'
import profiles from '../shared/profiles.json'
import {
  createSmoothBodyGeometry,
  getBodySilhouette,
} from '../src/three/body.js'
import { createGlassGeometry, getGlassSilhouette } from '../src/three/glass.js'
import { validateDimensions } from '../src/three/dimensions.js'
import { wheelParameters } from '../src/three/wheels.js'
import { exhaustParameters } from '../src/three/exhaust.js'
import { buildCarScene } from '../src/three/car.js'
import { disposeObject } from '../src/three/dispose.js'
import { createRenderPlan, RENDER_PRESETS } from '../shared/renderPresets.js'
const peaks = [1.5090711, 1.6165608, 1.7240505, 1.9721037, 1.724369]
describe('preserved parametric geometry', () => {
  profiles.forEach((profile, i) =>
    it(`preserves ${profile.id} topology and measured bounds`, () => {
      const d = profile.dimensions,
        body = createSmoothBodyGeometry(d),
        glass = createGlassGeometry(d)
      body.computeBoundingBox()
      glass.computeBoundingBox()
      expect(body.attributes.position.count).toBe(1225)
      expect(body.index.count).toBe(6912)
      expect(glass.attributes.position.count).toBe(325)
      expect(glass.index.count).toBe(1728)
      expect(body.boundingBox.min.x).toBeCloseTo(-d.length / 2, 5)
      expect(body.boundingBox.max.z).toBeCloseTo(d.width / 2, 5)
      expect(body.boundingBox.max.y).toBeCloseTo(peaks[i], 5)
      expect(glass.boundingBox.min.x).toBeCloseTo(
        d.cabinX - d.cabinWidth / 2,
        5,
      )
      expect(glass.boundingBox.max.y).toBeCloseTo(
        d.height + 0.5 + d.cabinHeight * 0.93,
        5,
      )
      for (const geometry of [body, glass]) {
        expect(
          [...geometry.attributes.normal.array].every(Number.isFinite),
        ).toBe(true)
        expect(Math.max(...geometry.index.array)).toBeLessThan(
          geometry.attributes.position.count,
        )
        geometry.dispose()
      }
      expect(getBodySilhouette(d)[0]).toMatchObject({ type: 'move', y: 0.46 })
      expect(getGlassSilhouette(d)).toHaveLength(4)
    }),
  )
  it('rejects invalid dimensions before allocating geometry', () => {
    const d = profiles[0].dimensions
    expect(validateDimensions(d)).toBe(d)
    for (const changed of [
      { length: 0 },
      { width: -1 },
      { height: NaN },
      { wheelBase: 20 },
      { cabinX: Infinity },
    ])
      expect(() => createSmoothBodyGeometry({ ...d, ...changed })).toThrow(
        RangeError,
      )
  })
  it('keeps wheels grounded independently of lowered chassis; widebody changes track', () => {
    const d = profiles[0].dimensions,
      plan = createRenderPlan([
        { visual_category: 'suspension', render_key: 'sport-drop' },
        { visual_category: 'aero', render_key: 'riveted-widebody' },
      ])
    const wheels = wheelParameters(d, plan.config)
    expect(wheels.positions).toHaveLength(4)
    wheels.positions[0].forEach((value, i) =>
      expect(value).toBeCloseTo([-1.875, 0.46, -1.225][i], 8),
    )
    expect(wheels.width).toBe(0.46)
    expect(exhaustParameters(d, 'quad-polished').offsets).toHaveLength(4)
    expect(exhaustParameters(d, 'single-blue-tip').length).toBe(0.48)
    expect(() => exhaustParameters(d, 'unknown')).toThrow()
  })
  it('builds every registered variant with finite geometry and no buried wheels', () => {
    for (const key of Object.keys(RENDER_PRESETS)) {
      const [visual_category, render_key] = key.split(':')
      const car = buildCarScene({
        carProfile: profiles[0],
        paint: '#2876d7',
        plan: createRenderPlan([{ visual_category, render_key }]),
      })
      const wheels = car.getObjectByName('configured-wheels')
      expect(new THREE.Box3().setFromObject(wheels).min.y).toBeCloseTo(0, 5)
      car.traverse((child) => {
        if (child.geometry)
          expect(
            [...child.geometry.attributes.position.array].every(
              Number.isFinite,
            ),
          ).toBe(true)
      })
      disposeObject(car)
    }
  })
  it('loads bundled glTF, replaces native wheels, and leaves its cached template unmodified', async () => {
    const file = await readFile('public/models/kenney-car-kit/sedanSports.glb')
    const gltf = await new GLTFLoader().parseAsync(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
      '',
    )
    const car = buildCarScene({
      carProfile: profiles[1],
      paint: '#d7323f',
      plan: createRenderPlan([
        { visual_category: 'wheels', render_key: 'mesh-wheel' },
      ]),
      asset: gltf.scene,
    })
    expect(car.getObjectByName('wheel_frontLeft').visible).toBe(false)
    expect(gltf.scene.getObjectByName('wheel_frontLeft').visible).toBe(true)
    expect(car.getObjectByName('configured-wheels')).toBeDefined()
    const tire = car.getObjectByName('configured-wheels').children[0]
    expect(Math.abs(tire.position.x)).toBeCloseTo(1.452, 3)
    expect(tire.position.y).toBeGreaterThan(0.6)
    const box = new THREE.Box3().setFromObject(car)
    expect(box.max.x - box.min.x).toBeGreaterThan(5)
    disposeObject(car)
    disposeObject(gltf.scene)
  })
})
