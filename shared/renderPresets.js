/** The only catalog-to-render mapping. Slots define mutual exclusion; categories group the UI.
 * Builders are names resolved by three/builders.js; effects parameterize stock geometry/materials.
 */
export const RENDER_PRESETS = Object.freeze({
  'wheels:split-spoke': {
    slot: 'wheels',
    operation: 'wheels',
    effects: { wheelStyle: 'split-spoke', wheelRadius: 0.51 },
  },
  'wheels:mesh-wheel': {
    slot: 'wheels',
    operation: 'wheels',
    effects: { wheelStyle: 'mesh-wheel', wheelRadius: 0.51 },
  },
  'exhaust:dual-polished': {
    slot: 'exhaust',
    operation: 'exhaust',
    builder: 'exhaust',
    effects: { exhaustStyle: 'dual-polished' },
  },
  'exhaust:quad-polished': {
    slot: 'exhaust',
    operation: 'exhaust',
    builder: 'exhaust',
    effects: { exhaustStyle: 'quad-polished' },
  },
  'exhaust:single-blue-tip': {
    slot: 'exhaust',
    operation: 'exhaust',
    builder: 'exhaust',
    effects: { exhaustStyle: 'single-blue-tip' },
  },
  'aero:carbon-wing': {
    slot: 'spoiler',
    operation: 'spoiler',
    builder: 'spoiler',
    effects: {},
  },
  'aero:front-splitter': {
    slot: 'splitter',
    operation: 'splitter',
    builder: 'splitter',
    effects: {},
  },
  'aero:riveted-widebody': {
    slot: 'body-kit',
    operation: 'body-kit',
    builder: 'widebody',
    effects: { trackExtra: 0.2, wheelWidth: 0.46 },
  },
  'suspension:sport-drop': {
    slot: 'suspension',
    operation: 'lowering',
    effects: { rideDrop: -0.12 },
  },
  'suspension:coilover-drop': {
    slot: 'suspension',
    operation: 'lowering',
    effects: { rideDrop: -0.18 },
  },
  'brakes:red-caliper': {
    slot: 'brakes',
    operation: 'brakes',
    effects: { showBrake: true },
  },
  'exterior:privacy-glass': {
    slot: 'glass',
    operation: 'tint',
    effects: { tinted: true },
  },
  'exterior:satin-wrap': {
    slot: 'finish',
    operation: 'wrap',
    effects: { roughness: 0.68, clearcoat: 0.12 },
  },
  'cooling:front-mount': {
    slot: 'cooling',
    operation: 'turbo',
    builder: 'intercooler',
    effects: {},
  },
})
export const CATEGORIES = [
  ...new Set(Object.keys(RENDER_PRESETS).map((key) => key.split(':')[0])),
]
/** @param {import('./types.js').Part} part */
export function presetFor(part) {
  const preset = RENDER_PRESETS[`${part.visual_category}:${part.render_key}`]
  if (!preset) throw new Error(`Unsupported visual variant for part ${part.id}`)
  return preset
}
/** @param {import('./types.js').Part[]} parts */
export function createRenderPlan(parts) {
  const presets = parts.map(presetFor)
  return {
    operationIds: new Set(presets.map((p) => p.operation)),
    renderSet: new Set(parts.map((p) => p.render_key)),
    builders: presets.filter((p) => p.builder).map((p) => p.builder),
    config: Object.assign(
      {
        wheelStyle: 'stock',
        wheelRadius: 0.46,
        wheelWidth: 0.34,
        trackExtra: 0,
        rideDrop: 0,
        showBrake: false,
        tinted: false,
        roughness: 0.24,
        clearcoat: 0.82,
      },
      ...presets.map((p) => p.effects),
    ),
  }
}
