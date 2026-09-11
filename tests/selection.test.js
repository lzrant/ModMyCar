import { describe, expect, it } from 'vitest'
import catalog from '../server/catalog.json'
import { matchParts, togglePart } from '../shared/selection.js'
import {
  createRenderPlan,
  presetFor,
  RENDER_PRESETS,
} from '../shared/renderPresets.js'
const [wheel, otherWheel, exhaust, springs, wing] = catalog.parts

describe('catalog selection', () => {
  it('adds, replaces only the same slot, and toggles off without mutating input', () => {
    const original = [wheel, exhaust, wing]
    expect(togglePart(original, otherWheel)).toEqual([
      exhaust,
      wing,
      otherWheel,
    ])
    expect(togglePart(original, wheel)).toEqual([exhaust, wing])
    expect(original).toEqual([wheel, exhaust, wing])
  })
  it('matches case-insensitive fragments, categories and normalized SKUs', () => {
    expect(matchParts(catalog.parts, 'ENKei rpf')).toEqual([
      catalog.parts[0],
      catalog.parts[5],
    ])
    expect(matchParts(catalog.parts, '31021 bf001')).toEqual([exhaust])
    expect(matchParts(catalog.parts, 'suspension')).toEqual([springs])
    expect(matchParts(catalog.parts, 'unlisted')).toEqual([])
    expect(matchParts(catalog.parts, '  ')).toEqual(catalog.parts)
  })
  it('derives rendering solely from selected catalog parts', () => {
    const plan = createRenderPlan([otherWheel, exhaust, springs, wing])
    expect([...plan.operationIds]).toEqual([
      'wheels',
      'exhaust',
      'lowering',
      'spoiler',
    ])
    expect(plan.builders).toEqual(['exhaust', 'spoiler'])
    expect(plan.config).toMatchObject({
      wheelStyle: 'mesh-wheel',
      rideDrop: -0.12,
      exhaustStyle: 'quad-polished',
    })
    expect(createRenderPlan([]).config.rideDrop).toBe(0)
  })
  it('rejects unknown variants instead of silently drawing the wrong part', () => {
    expect(() => presetFor({ ...wheel, render_key: 'missing' })).toThrow(
      'Unsupported',
    )
    for (const p of catalog.parts) expect(presetFor(p)).toBeDefined()
    for (const [key, preset] of Object.entries(RENDER_PRESETS)) {
      const [visual_category, render_key] = key.split(':')
      expect(
        createRenderPlan([{ visual_category, render_key }]).operationIds.has(
          preset.operation,
        ),
      ).toBe(true)
    }
  })
})
