import { makeMaterial } from './materials.js'
import { addBox } from './primitives.js'

export function addLights(group, dimensions, frontX, rearX) {
  const headlight = makeMaterial('#fff1a8', { roughness: 0.18, metalness: 0 })
  const taillight = makeMaterial('#e84e5f', { roughness: 0.22, metalness: 0 })
  addBox(
    group,
    'left-headlight',
    [0.08, 0.18, dimensions.width * 0.72],
    [frontX, dimensions.height * 0.53, 0],
    headlight,
  )
  addBox(
    group,
    'right-taillight',
    [0.08, 0.18, dimensions.width * 0.72],
    [rearX, dimensions.height * 0.5, 0],
    taillight,
  )
}
