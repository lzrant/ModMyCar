import * as THREE from 'three'
import { makeMaterial } from './materials.js'
export function exhaustParameters(dimensions, style) {
  const offsets = {
    'single-blue-tip': [-dimensions.width * 0.3],
    'dual-polished': [-dimensions.width * 0.3, dimensions.width * 0.3],
    'quad-polished': [
      -dimensions.width * 0.36,
      -dimensions.width * 0.24,
      dimensions.width * 0.24,
      dimensions.width * 0.36,
    ],
  }
  if (!offsets[style]) throw new Error(`Unknown exhaust style: ${style}`)
  return {
    length: style === 'single-blue-tip' ? 0.48 : 0.34,
    offsets: offsets[style],
    rearX: dimensions.length / 2,
  }
}
export function buildExhaust(group, dimensions, config) {
  const { length, offsets, rearX } = exhaustParameters(
    dimensions,
    config.exhaustStyle,
  )
  const metal = makeMaterial(
    config.exhaustStyle === 'single-blue-tip' ? '#5dbddd' : '#d7dee2',
    { metalness: 0.86, roughness: 0.18 },
  )
  const black = makeMaterial('#11171c', { roughness: 0.8 })
  for (const z of offsets) {
    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, length, 28, 1, true),
      metal,
    )
    tip.rotation.z = Math.PI / 2
    tip.position.set(rearX + length / 2, 0.42, z)
    group.add(tip)
    const opening = new THREE.Mesh(new THREE.CircleGeometry(0.097, 28), black)
    opening.rotation.y = Math.PI / 2
    opening.position.set(rearX + length - 0.01, 0.42, z)
    group.add(opening)
  }
}
