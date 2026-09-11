import { validateDimensions } from './dimensions.js'
import * as THREE from 'three'

/** @param {import('../../shared/types.js').Dimensions} dimensions */
export function createGlassGeometry(dimensions) {
  validateDimensions(dimensions)
  const length = dimensions.cabinWidth
  const width = dimensions.width * 0.72
  const segmentsX = 24
  const segmentsZ = 12
  const vertices = []
  const indices = []

  for (let ix = 0; ix <= segmentsX; ix += 1) {
    const u = ix / segmentsX
    const x = dimensions.cabinX + (u - 0.5) * length
    const arch = Math.sin(Math.PI * u)

    for (let iz = 0; iz <= segmentsZ; iz += 1) {
      const v = iz / segmentsZ
      const zNorm = (v - 0.5) * 2
      const z = zNorm * width * 0.5
      const sideFalloff = 1 - Math.pow(Math.abs(zNorm), 1.8)
      const y =
        dimensions.height +
        0.5 +
        dimensions.cabinHeight * (0.38 + 0.55 * arch * Math.max(0, sideFalloff))
      vertices.push(x, y, z)
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
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function getGlassSilhouette(dimensions) {
  validateDimensions(dimensions)
  const roofY = dimensions.height + dimensions.cabinHeight + 0.18
  const baseY = dimensions.height + 0.34
  const left = dimensions.cabinX - dimensions.cabinWidth / 2
  const right = dimensions.cabinX + dimensions.cabinWidth / 2

  if (dimensions.bed) {
    return [
      { type: 'move', x: left + 0.1, y: baseY },
      {
        type: 'quad',
        cx: left + 0.32,
        cy: roofY + 0.04,
        x: left + 0.68,
        y: roofY,
      },
      { type: 'line', x: right - 0.18, y: roofY - 0.02 },
      {
        type: 'quad',
        cx: right + 0.04,
        cy: baseY + 0.36,
        x: right - 0.02,
        y: baseY,
      },
    ]
  }

  return [
    { type: 'move', x: left, y: baseY },
    {
      type: 'quad',
      cx: left + dimensions.cabinWidth * 0.18,
      cy: roofY + 0.04,
      x: left + dimensions.cabinWidth * 0.32,
      y: roofY,
    },
    { type: 'line', x: right - dimensions.cabinWidth * 0.26, y: roofY },
    {
      type: 'quad',
      cx: right - dimensions.cabinWidth * 0.04,
      cy: roofY - 0.06,
      x: right,
      y: baseY,
    },
  ]
}
