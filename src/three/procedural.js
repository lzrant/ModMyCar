import * as THREE from 'three'
import { makeMaterial, createPaintMaterial } from './materials.js'
import { addBox, addExtrudedPath } from './primitives.js'
import { createSmoothBodyGeometry, getBodySilhouette } from './body.js'
import { createGlassGeometry, getGlassSilhouette } from './glass.js'
import { addLights } from './lighting.js'
export function buildProceduralBody({ carProfile, paint, config }) {
  const group = new THREE.Group()
  const dimensions = carProfile.dimensions
  const frontX = -dimensions.length / 2 + 0.12
  const rearX = dimensions.length / 2 - 0.12
  group.position.y = config.rideDrop

  const bodyMaterial = createPaintMaterial(paint.value, config)
  const lowerMaterial = makeMaterial('#151c22', {
    metalness: 0.25,
    roughness: 0.48,
  })
  const glassMaterial = makeMaterial('#142633', {
    transparent: true,
    opacity: config.tinted ? 0.88 : 0.58,
    roughness: 0.16,
    metalness: 0.05,
  })
  const smoothBody = new THREE.Mesh(
    createSmoothBodyGeometry(dimensions),
    bodyMaterial,
  )
  smoothBody.name = 'smooth-garage-body'
  smoothBody.castShadow = true
  smoothBody.receiveShadow = true
  group.add(smoothBody)

  addExtrudedPath(
    group,
    'side-body-mass',
    getBodySilhouette(dimensions),
    dimensions.width * 0.96,
    bodyMaterial,
    {
      bevelSize: 0.03,
      bevelThickness: 0.02,
      edgeOpacity: 0.12,
      position: [0, -0.05, 0],
    },
  )
  addBox(
    group,
    'lower-rocker',
    [dimensions.length * 0.88, 0.2, dimensions.width * 1.04],
    [0.06, 0.4, 0],
    lowerMaterial,
  )

  if (dimensions.bed) {
    addBox(
      group,
      'open-bed-shadow',
      [dimensions.length * 0.3, 0.08, dimensions.width * 0.72],
      [dimensions.length * 0.25, 1.3, 0],
      lowerMaterial,
    )
  }

  const glassBubble = new THREE.Mesh(
    createGlassGeometry(dimensions),
    glassMaterial,
  )
  glassBubble.name = 'curved-glass-canopy'
  glassBubble.castShadow = true
  group.add(glassBubble)

  addExtrudedPath(
    group,
    'glass-outline',
    getGlassSilhouette(dimensions),
    dimensions.width * 0.72,
    glassMaterial,
    {
      bevelSize: 0.035,
      bevelThickness: 0.02,
      position: [0, 0.02, 0],
      edgeColor: '#d8edf5',
      edgeOpacity: 0.36,
    },
  )
  addBox(
    group,
    'roof-cap',
    [dimensions.cabinWidth * 0.86, 0.1, dimensions.width * 0.72],
    [
      dimensions.cabinX + 0.04,
      dimensions.height + dimensions.cabinHeight + 0.26,
      0,
    ],
    bodyMaterial,
  )
  addBox(
    group,
    'hood-crease-center',
    [dimensions.length * 0.28, 0.035, 0.035],
    [frontX + dimensions.length * 0.24, dimensions.height + 0.36, 0],
    makeMaterial('#f5fbff', { transparent: true, opacity: 0.42 }),
  )
  addBox(
    group,
    'hood-crease-left',
    [dimensions.length * 0.22, 0.025, 0.03],
    [
      frontX + dimensions.length * 0.24,
      dimensions.height + 0.3,
      dimensions.width * 0.22,
    ],
    makeMaterial('#f5fbff', { transparent: true, opacity: 0.24 }),
  )
  addBox(
    group,
    'hood-crease-right',
    [dimensions.length * 0.22, 0.025, 0.03],
    [
      frontX + dimensions.length * 0.24,
      dimensions.height + 0.3,
      -dimensions.width * 0.22,
    ],
    makeMaterial('#f5fbff', { transparent: true, opacity: 0.24 }),
  )
  addBox(
    group,
    'door-cut',
    [0.035, dimensions.height * 0.72, 0.035],
    [
      dimensions.cabinX + dimensions.cabinWidth * 0.18,
      0.98,
      dimensions.width / 2 + 0.035,
    ],
    lowerMaterial,
  )
  addBox(
    group,
    'door-cut-far',
    [0.035, dimensions.height * 0.72, 0.035],
    [
      dimensions.cabinX + dimensions.cabinWidth * 0.18,
      0.98,
      -dimensions.width / 2 - 0.035,
    ],
    lowerMaterial,
  )
  addBox(
    group,
    'b-pillar-left',
    [0.05, dimensions.cabinHeight * 0.84, 0.04],
    [
      dimensions.cabinX + 0.05,
      dimensions.height + dimensions.cabinHeight * 0.62,
      dimensions.width * 0.43,
    ],
    lowerMaterial,
  )
  addBox(
    group,
    'b-pillar-right',
    [0.05, dimensions.cabinHeight * 0.84, 0.04],
    [
      dimensions.cabinX + 0.05,
      dimensions.height + dimensions.cabinHeight * 0.62,
      -dimensions.width * 0.43,
    ],
    lowerMaterial,
  )
  addBox(
    group,
    'mirror-left',
    [0.18, 0.12, 0.26],
    [
      dimensions.cabinX - dimensions.cabinWidth * 0.42,
      dimensions.height + 0.55,
      dimensions.width * 0.58,
    ],
    lowerMaterial,
  )
  addBox(
    group,
    'mirror-right',
    [0.18, 0.12, 0.26],
    [
      dimensions.cabinX - dimensions.cabinWidth * 0.42,
      dimensions.height + 0.55,
      -dimensions.width * 0.58,
    ],
    lowerMaterial,
  )

  addBox(
    group,
    'front-bumper',
    [0.2, 0.46, dimensions.width * 0.96],
    [frontX - 0.05, 0.62, 0],
    lowerMaterial,
  )
  addBox(
    group,
    'rear-bumper',
    [0.2, 0.46, dimensions.width * 0.96],
    [rearX + 0.05, 0.62, 0],
    lowerMaterial,
  )
  addBox(
    group,
    'grille',
    [0.08, 0.28, dimensions.width * 0.58],
    [frontX - 0.16, 0.78, 0],
    makeMaterial('#0d1419', { roughness: 0.5 }),
  )
  addBox(
    group,
    'front-plate',
    [0.09, 0.22, dimensions.width * 0.4],
    [frontX - 0.22, 0.52, 0],
    makeMaterial('#dbe2e6', { metalness: 0.2, roughness: 0.34 }),
  )

  addLights(group, dimensions, frontX - 0.2, rearX + 0.2)

  return group
}
