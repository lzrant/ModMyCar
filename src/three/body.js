import { validateDimensions } from './dimensions.js'
import * as THREE from 'three'

/** @param {import('../../shared/types.js').Dimensions} dimensions */
export function createSmoothBodyGeometry(dimensions) {
  validateDimensions(dimensions)
  const segmentsX = 48
  const segmentsZ = 24
  const length = dimensions.length
  const width = dimensions.width
  const vertices = []
  const normals = []
  const indices = []

  for (let ix = 0; ix <= segmentsX; ix += 1) {
    const u = ix / segmentsX
    const x = (u - 0.5) * length
    const nose = Math.pow(Math.sin(Math.PI * u), 0.34)
    const shoulder = 0.74 + 0.26 * Math.sin(Math.PI * u)
    const hoodDip = 0.18 * Math.exp(-Math.pow((u - 0.2) / 0.18, 2))
    const rearDeck = 0.12 * Math.exp(-Math.pow((u - 0.82) / 0.18, 2))
    const cabinRise = dimensions.bed
      ? 0.28 * Math.exp(-Math.pow((u - 0.34) / 0.16, 2))
      : 0.34 * Math.exp(-Math.pow((u - 0.55) / 0.2, 2))

    for (let iz = 0; iz <= segmentsZ; iz += 1) {
      const v = iz / segmentsZ
      const zNorm = (v - 0.5) * 2
      const z = zNorm * width * 0.5 * shoulder
      const sideFalloff = 1 - Math.pow(Math.abs(zNorm), 2.5)
      const crown = Math.max(0, sideFalloff)
      const y =
        0.48 +
        dimensions.height * (0.35 + 0.48 * nose * crown) +
        cabinRise * crown -
        hoodDip * crown +
        rearDeck * crown

      vertices.push(x, y, z)
      normals.push(0, 1, 0)
    }
  }

  for (let ix = 0; ix < segmentsX; ix += 1) {
    for (let iz = 0; iz < segmentsZ; iz += 1) {
      const a = ix * (segmentsZ + 1) + iz
      const b = a + segmentsZ + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  )
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function getBodySilhouette(dimensions) {
  validateDimensions(dimensions)
  const front = -dimensions.length / 2
  const rear = dimensions.length / 2
  const low = 0.46
  const belt = 1.12

  if (dimensions.bed) {
    return [
      { type: 'move', x: front + 0.08, y: low },
      { type: 'quad', cx: front + 0.08, cy: 0.92, x: front + 0.62, y: 1.18 },
      { type: 'quad', cx: front + 1.12, cy: 1.48, x: front + 1.84, y: 1.45 },
      { type: 'line', x: front + 2.44, y: 1.16 },
      { type: 'line', x: rear - 0.3, y: 1.08 },
      { type: 'quad', cx: rear, cy: 0.88, x: rear - 0.04, y: low },
    ]
  }

  const rearDeck = dimensions.height > 1.05 ? 1.28 : 1.05
  return [
    { type: 'move', x: front + 0.06, y: low },
    { type: 'quad', cx: front + 0.06, cy: 0.78, x: front + 0.42, y: 0.96 },
    {
      type: 'bezier',
      cx1: front + dimensions.length * 0.18,
      cy1: 1.18,
      cx2: front + dimensions.length * 0.27,
      cy2: 1.02,
      x: front + dimensions.length * 0.34,
      y: belt,
    },
    {
      type: 'quad',
      cx: front + dimensions.length * 0.43,
      cy: dimensions.height + 0.72,
      x: front + dimensions.length * 0.56,
      y: dimensions.height + 0.82,
    },
    {
      type: 'quad',
      cx: front + dimensions.length * 0.68,
      cy: dimensions.height + 0.8,
      x: front + dimensions.length * 0.77,
      y: rearDeck,
    },
    { type: 'quad', cx: rear - 0.48, cy: 1.08, x: rear - 0.16, y: 0.95 },
    { type: 'quad', cx: rear + 0.04, cy: 0.72, x: rear - 0.04, y: low },
  ]
}
