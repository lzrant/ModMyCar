import { describe, expect, it } from 'vitest'
import catalog from '../server/catalog.json'
import {
  parseBuildPayload,
  parseBuildId,
  positiveId,
  validateSelection,
} from '../shared/build.js'
const valid = { vehicle_id: 1, part_ids: [5, 1, 3], paint_color: '#AABBCC' }
describe('build network contract', () => {
  it('canonicalizes and round-trips paint, vehicle and all selected IDs without mutation', () => {
    const parsed = parseBuildPayload(valid)
    expect(parsed).toEqual({
      vehicle_id: 1,
      part_ids: [1, 3, 5],
      paint_color: '#aabbcc',
    })
    expect(parseBuildPayload(JSON.parse(JSON.stringify(parsed)))).toEqual(
      parsed,
    )
    expect(valid.part_ids).toEqual([5, 1, 3])
    expect(parseBuildPayload({ ...valid, part_ids: [] })).toMatchObject({
      part_ids: [],
    })
  })
  it.each([
    null,
    [],
    {},
    { ...valid, user_id: 'spoof' },
    { ...valid, vehicle_id: '1' },
    { ...valid, vehicle_id: -1 },
    { ...valid, vehicle_id: 1.5 },
    { ...valid, part_ids: [1, 1] },
    { ...valid, part_ids: [null] },
    { ...valid, part_ids: [Number.MAX_SAFE_INTEGER + 1] },
    { ...valid, part_ids: Array.from({ length: 21 }, (_, i) => i + 1) },
    { ...valid, paint_color: 'red' },
    { ...valid, paint_color: '#abc' },
    { ...valid, paint_color: '#aabbcc;' },
  ])('rejects invalid payload %j', (input) =>
    expect(() => parseBuildPayload(input)).toThrow(),
  )
  it('rejects incompatible parts and two variants in the same slot', () => {
    expect(() =>
      validateSelection({ ...valid, part_ids: [1, 2] }, catalog.parts),
    ).toThrow('only one')
    expect(() =>
      validateSelection({ ...valid, part_ids: [99] }, catalog.parts),
    ).toThrow('not compatible')
    expect(
      validateSelection(parseBuildPayload(valid), catalog.parts).map(
        (p) => p.id,
      ),
    ).toEqual([1, 3, 5])
  })
  it('validates route identifiers', () => {
    expect(() => positiveId(NaN)).toThrow()
    expect(() => parseBuildId('../anything')).toThrow()
    expect(parseBuildId('00000000-0000-4000-8000-000000000000')).toBe(
      '00000000-0000-4000-8000-000000000000',
    )
  })
})
