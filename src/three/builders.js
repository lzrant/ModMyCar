import { addSpoiler, addWidebody } from './aero.js'
import { buildExhaust } from './exhaust.js'
import { addBox } from './primitives.js'
import { makeMaterial } from './materials.js'
// Named mesh builders referenced by shared/renderPresets.js; no catalog conditionals in scene assembly.
export const BUILDERS = {
  exhaust: (group, dimensions, plan) =>
    buildExhaust(group, dimensions, plan.config),
  spoiler: (group, dimensions, plan) =>
    addSpoiler(group, dimensions, plan.renderSet),
  widebody: (group, dimensions, plan) =>
    addWidebody(group, dimensions, makeMaterial('#151c22'), plan.renderSet),
  splitter: (group, d) =>
    addBox(
      group,
      'front-splitter',
      [0.3, 0.08, d.width * 1.08],
      [-d.length / 2, 0.32, 0],
      makeMaterial('#151c22'),
    ),
  intercooler: (group, d) =>
    addBox(
      group,
      'front-mount-intercooler',
      [0.08, 0.24, d.width * 0.52],
      [-d.length / 2 - 0.1, 0.48, 0],
      makeMaterial('#d5dee4', { metalness: 0.72, roughness: 0.22 }),
    ),
}
