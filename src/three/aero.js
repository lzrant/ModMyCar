import { makeMaterial } from './materials.js'
import { addBox } from './primitives.js'

export function addSpoiler(group, dimensions, renderSet) {
  const material = makeMaterial(
    renderSet.has('carbon-wing') ? '#10161b' : '#151c22',
    {
      metalness: 0.35,
      roughness: 0.28,
    },
  )
  const rearX = dimensions.length / 2 - 0.74
  const z = 0
  addBox(
    group,
    'wing-plane',
    [1.28, 0.08, dimensions.width * 0.86],
    [rearX, dimensions.height + 0.9, z],
    material,
  )
  addBox(
    group,
    'wing-left-stanchion',
    [0.08, 0.72, 0.07],
    [rearX - 0.32, dimensions.height + 0.5, -dimensions.width * 0.28],
    material,
  )
  addBox(
    group,
    'wing-right-stanchion',
    [0.08, 0.72, 0.07],
    [rearX - 0.32, dimensions.height + 0.5, dimensions.width * 0.28],
    material,
  )
}

export function addWidebody(group, dimensions, darkMaterial, renderSet) {
  const frontX = -dimensions.wheelBase / 2
  const rearX = dimensions.wheelBase / 2
  const z = dimensions.width / 2 + 0.13
  const flareWidth = renderSet.has('riveted-widebody') ? 0.34 : 0.24

  ;[frontX, rearX].forEach((x) => {
    addBox(
      group,
      'left-overfender',
      [0.98, 0.28, flareWidth],
      [x, 0.88, z],
      darkMaterial,
    )
    addBox(
      group,
      'right-overfender',
      [0.98, 0.28, flareWidth],
      [x, 0.88, -z],
      darkMaterial,
    )
  })

  addBox(
    group,
    'side-skirt-left',
    [dimensions.length * 0.58, 0.14, 0.16],
    [0.18, 0.35, dimensions.width / 2 + 0.16],
    darkMaterial,
  )
  addBox(
    group,
    'side-skirt-right',
    [dimensions.length * 0.58, 0.14, 0.16],
    [0.18, 0.35, -dimensions.width / 2 - 0.16],
    darkMaterial,
  )
  addBox(
    group,
    'front-splitter',
    [0.18, 0.12, dimensions.width * 1.06],
    [-dimensions.length / 2 - 0.08, 0.32, 0],
    darkMaterial,
  )
}
