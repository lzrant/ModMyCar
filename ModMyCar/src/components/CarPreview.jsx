import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.42,
    metalness: options.metalness ?? 0.2,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  })
}

function createSmoothBodyGeometry(dimensions) {
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
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function createGlassGeometry(dimensions) {
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
      const y = dimensions.height + 0.5 + dimensions.cabinHeight * (0.38 + 0.55 * arch * Math.max(0, sideFalloff))
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
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function addBox(group, name, size, position, material, options = {}) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2])
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(position[0], position[1], position[2])
  mesh.rotation.set(options.rotation?.[0] ?? 0, options.rotation?.[1] ?? 0, options.rotation?.[2] ?? 0)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function makePath(commands) {
  const shape = new THREE.Shape()
  commands.forEach((command) => {
    if (command.type === 'move') {
      shape.moveTo(command.x, command.y)
    }

    if (command.type === 'line') {
      shape.lineTo(command.x, command.y)
    }

    if (command.type === 'quad') {
      shape.quadraticCurveTo(command.cx, command.cy, command.x, command.y)
    }

    if (command.type === 'bezier') {
      shape.bezierCurveTo(command.cx1, command.cy1, command.cx2, command.cy2, command.x, command.y)
    }
  })
  shape.closePath()
  return shape
}

function addExtrudedPath(group, name, commands, depth, material, options = {}) {
  const shape = makePath(commands)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: options.bevelSize ?? 0.06,
    bevelThickness: options.bevelThickness ?? 0.045,
    bevelSegments: 5,
    curveSegments: 24,
  })
  geometry.translate(0, 0, -depth / 2)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(options.position?.[0] ?? 0, options.position?.[1] ?? 0, options.position?.[2] ?? 0)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: options.edgeColor ?? '#0b1116',
    transparent: true,
    opacity: options.edgeOpacity ?? 0.28,
  })
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 35), edgeMaterial)
  edges.position.copy(mesh.position)
  group.add(edges)

  return mesh
}

function getBodySilhouette(dimensions) {
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
    { type: 'bezier', cx1: front + dimensions.length * 0.18, cy1: 1.18, cx2: front + dimensions.length * 0.27, cy2: 1.02, x: front + dimensions.length * 0.34, y: belt },
    { type: 'quad', cx: front + dimensions.length * 0.43, cy: dimensions.height + 0.72, x: front + dimensions.length * 0.56, y: dimensions.height + 0.82 },
    { type: 'quad', cx: front + dimensions.length * 0.68, cy: dimensions.height + 0.8, x: front + dimensions.length * 0.77, y: rearDeck },
    { type: 'quad', cx: rear - 0.48, cy: 1.08, x: rear - 0.16, y: 0.95 },
    { type: 'quad', cx: rear + 0.04, cy: 0.72, x: rear - 0.04, y: low },
  ]
}

function getGlassSilhouette(dimensions) {
  const roofY = dimensions.height + dimensions.cabinHeight + 0.18
  const baseY = dimensions.height + 0.34
  const left = dimensions.cabinX - dimensions.cabinWidth / 2
  const right = dimensions.cabinX + dimensions.cabinWidth / 2

  if (dimensions.bed) {
    return [
      { type: 'move', x: left + 0.1, y: baseY },
      { type: 'quad', cx: left + 0.32, cy: roofY + 0.04, x: left + 0.68, y: roofY },
      { type: 'line', x: right - 0.18, y: roofY - 0.02 },
      { type: 'quad', cx: right + 0.04, cy: baseY + 0.36, x: right - 0.02, y: baseY },
    ]
  }

  return [
    { type: 'move', x: left, y: baseY },
    { type: 'quad', cx: left + dimensions.cabinWidth * 0.18, cy: roofY + 0.04, x: left + dimensions.cabinWidth * 0.32, y: roofY },
    { type: 'line', x: right - dimensions.cabinWidth * 0.26, y: roofY },
    { type: 'quad', cx: right - dimensions.cabinWidth * 0.04, cy: roofY - 0.06, x: right, y: baseY },
  ]
}

function addWheel(group, x, z, radius, width, wheelMaterial, rimMaterial, brakeMaterial, showBrake, wheelStyle) {
  const tireGeometry = new THREE.CylinderGeometry(radius, radius, width, 48)
  const tire = new THREE.Mesh(tireGeometry, wheelMaterial)
  tire.rotation.x = Math.PI / 2
  tire.position.set(x, radius, z)
  tire.castShadow = true
  group.add(tire)

  const rimGeometry = new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width * 1.08, wheelStyle === 'mesh-wheel' ? 18 : 6)
  const rim = new THREE.Mesh(rimGeometry, rimMaterial)
  rim.rotation.x = Math.PI / 2
  rim.position.copy(tire.position)
  group.add(rim)

  const hubGeometry = new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, width * 1.14, 24)
  const hub = new THREE.Mesh(hubGeometry, makeMaterial('#eef3f5', { metalness: 0.7, roughness: 0.24 }))
  hub.rotation.x = Math.PI / 2
  hub.position.copy(tire.position)
  group.add(hub)

  if (showBrake) {
    const caliper = addBox(group, 'brake-caliper', [0.12, radius * 0.54, 0.22], [x, radius * 1.05, z - width * 0.56], brakeMaterial)
    caliper.rotation.x = 0.25
  }
}

function addLights(group, dimensions, frontX, rearX) {
  const headlight = makeMaterial('#fff1a8', { roughness: 0.18, metalness: 0 })
  const taillight = makeMaterial('#e84e5f', { roughness: 0.22, metalness: 0 })
  addBox(group, 'left-headlight', [0.08, 0.18, dimensions.width * 0.72], [frontX, dimensions.height * 0.53, 0], headlight)
  addBox(group, 'right-taillight', [0.08, 0.18, dimensions.width * 0.72], [rearX, dimensions.height * 0.5, 0], taillight)
}

function addExhaust(group, rearX, rearZ, renderSet) {
  const isTomei = renderSet.has('single-blue-tip')
  const tipMaterial = makeMaterial(isTomei ? '#5dbddd' : '#d7dee2', { metalness: 0.86, roughness: 0.18 })
  const innerMaterial = makeMaterial('#1c252c', { metalness: 0.2, roughness: 0.54 })
  const offsets = isTomei ? [0] : [-0.24, 0.24]

  offsets.forEach((offset) => {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, isTomei ? 0.48 : 0.34, 28), tipMaterial)
    tip.rotation.z = Math.PI / 2
    tip.position.set(rearX + 0.22, 0.42, rearZ + offset)
    group.add(tip)

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.03, 18), innerMaterial)
    inner.rotation.z = Math.PI / 2
    inner.position.set(rearX + 0.47, 0.42, rearZ + offset)
    group.add(inner)
  })
}

function addSpoiler(group, dimensions, renderSet) {
  const material = makeMaterial(renderSet.has('carbon-wing') ? '#10161b' : '#151c22', {
    metalness: 0.35,
    roughness: 0.28,
  })
  const rearX = dimensions.length / 2 - 0.74
  const z = 0
  addBox(group, 'wing-plane', [1.28, 0.08, dimensions.width * 0.86], [rearX, dimensions.height + 0.9, z], material)
  addBox(group, 'wing-left-stanchion', [0.08, 0.72, 0.07], [rearX - 0.32, dimensions.height + 0.5, -dimensions.width * 0.28], material)
  addBox(group, 'wing-right-stanchion', [0.08, 0.72, 0.07], [rearX - 0.32, dimensions.height + 0.5, dimensions.width * 0.28], material)
}

function addWidebody(group, dimensions, darkMaterial, renderSet) {
  const frontX = -dimensions.wheelBase / 2
  const rearX = dimensions.wheelBase / 2
  const z = dimensions.width / 2 + 0.13
  const flareWidth = renderSet.has('riveted-widebody') ? 0.34 : 0.24

  ;[frontX, rearX].forEach((x) => {
    addBox(group, 'left-overfender', [0.98, 0.28, flareWidth], [x, 0.88, z], darkMaterial)
    addBox(group, 'right-overfender', [0.98, 0.28, flareWidth], [x, 0.88, -z], darkMaterial)
  })

  addBox(group, 'side-skirt-left', [dimensions.length * 0.58, 0.14, 0.16], [0.18, 0.35, dimensions.width / 2 + 0.16], darkMaterial)
  addBox(group, 'side-skirt-right', [dimensions.length * 0.58, 0.14, 0.16], [0.18, 0.35, -dimensions.width / 2 - 0.16], darkMaterial)
  addBox(group, 'front-splitter', [0.18, 0.12, dimensions.width * 1.06], [-dimensions.length / 2 - 0.08, 0.32, 0], darkMaterial)
}

function buildAssetOverlayScene({ carProfile, operationIds, renderSet }) {
  const group = new THREE.Group()
  const dimensions = carProfile.dimensions
  const lowerMaterial = makeMaterial('#11171c', { metalness: 0.42, roughness: 0.28 })
  const brakeMaterial = makeMaterial('#d53635', { roughness: 0.36 })
  const rearX = dimensions.length / 2 - 0.12
  const frontX = -dimensions.length / 2 + 0.12

  if (operationIds.has('body-kit')) {
    addWidebody(group, dimensions, lowerMaterial, renderSet)
  }

  if (operationIds.has('spoiler')) {
    addSpoiler(group, dimensions, renderSet)
  }

  if (operationIds.has('exhaust')) {
    addExhaust(group, rearX + 0.12, -dimensions.width * 0.24, renderSet)
  }

  if (operationIds.has('turbo') || renderSet.has('front-mount')) {
    addBox(group, 'asset-front-mount-intercooler', [0.08, 0.24, dimensions.width * 0.52], [frontX - 0.22, 0.48, 0], makeMaterial('#d5dee4', { metalness: 0.72, roughness: 0.22 }))
  }

  if (operationIds.has('brakes')) {
    const wheelFrontX = -dimensions.wheelBase / 2
    const wheelRearX = dimensions.wheelBase / 2
    const sideZ = dimensions.width / 2 + (operationIds.has('body-kit') ? 0.25 : 0.08)

    ;[sideZ, -sideZ].forEach((z) => {
      addBox(group, 'asset-front-caliper', [0.1, 0.3, 0.16], [wheelFrontX, 0.58, z], brakeMaterial)
      addBox(group, 'asset-rear-caliper', [0.1, 0.3, 0.16], [wheelRearX, 0.58, z], brakeMaterial)
    })
  }

  group.position.y = operationIds.has('lowering') ? -0.16 : 0
  return group
}

function fitAssetToGarage(asset, dimensions, paint, operationIds) {
  const box = new THREE.Box3().setFromObject(asset)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  const targetLength = Math.min(dimensions.length * 0.82, 4.75)
  const longest = Math.max(size.x, size.y, size.z)
  const scale = longest > 0 ? targetLength / longest : 1

  asset.position.sub(center)
  asset.scale.setScalar(scale)
  asset.rotation.y = Math.PI / 2
  asset.position.y = 0.08

  asset.traverse((child) => {
    if (!child.isMesh) {
      return
    }

    child.castShadow = true
    child.receiveShadow = true
  })

  applyAssetMaterials(asset, paint, operationIds)
}

function applyAssetMaterials(asset, paint, operationIds) {
  asset.traverse((child) => {
    if (!child.isMesh || !child.material?.color) {
      return
    }

    const materialName = `${child.material.name ?? ''}`.toLowerCase()
    const readablePaint = paint.name === 'black' ? '#16202a' : paint.value

    if (materialName.includes('paint')) {
      child.material = new THREE.MeshPhysicalMaterial({
        color: readablePaint,
        roughness: 0.22,
        metalness: 0.62,
        clearcoat: 0.88,
        clearcoatRoughness: 0.16,
      })
    } else if (materialName.includes('window')) {
      child.material = new THREE.MeshPhysicalMaterial({
        color: operationIds.has('tint') ? '#071019' : '#2e5b70',
        roughness: 0.08,
        metalness: 0.05,
        transparent: true,
        opacity: operationIds.has('tint') ? 0.88 : 0.54,
      })
    } else if (materialName.includes('tire')) {
      child.material = makeMaterial('#111417', { roughness: 0.78, metalness: 0.05 })
    } else if (materialName.includes('plastic')) {
      child.material = makeMaterial('#202a31', { roughness: 0.5, metalness: 0.18 })
    } else if (materialName.includes('lightfront')) {
      child.material = makeMaterial('#fff1b8', { roughness: 0.16, metalness: 0.1 })
    } else if (materialName.includes('lightback')) {
      child.material = makeMaterial('#f05252', { roughness: 0.2, metalness: 0.1 })
    } else {
      child.material = makeMaterial('#d9e0e4', { roughness: 0.36, metalness: 0.34 })
    }
  })
}

function buildCarScene({ carProfile, paint, operationIds, renderSet }) {
  const group = new THREE.Group()
  const dimensions = carProfile.dimensions
  const rideDrop = operationIds.has('lowering') ? -0.18 : 0
  const widebody = operationIds.has('body-kit')
  const wheelRadius = operationIds.has('wheels') ? 0.53 : 0.46
  const wheelWidth = widebody ? 0.46 : 0.34
  const frontX = -dimensions.length / 2 + 0.12
  const rearX = dimensions.length / 2 - 0.12
  const wheelFrontX = -dimensions.wheelBase / 2
  const wheelRearX = dimensions.wheelBase / 2
  const sideZ = dimensions.width / 2 + (widebody ? 0.2 : 0)

  group.position.y = rideDrop

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: paint.value,
    roughness: 0.24,
    metalness: 0.62,
    clearcoat: 0.82,
    clearcoatRoughness: 0.18,
  })
  const lowerMaterial = makeMaterial('#151c22', { metalness: 0.25, roughness: 0.48 })
  const glassMaterial = makeMaterial('#142633', {
    transparent: true,
    opacity: operationIds.has('tint') ? 0.88 : 0.58,
    roughness: 0.16,
    metalness: 0.05,
  })
  const wheelMaterial = makeMaterial('#11171c', { roughness: 0.56 })
  const rimMaterial = makeMaterial(renderSet.has('mesh-wheel') ? '#c5cfd6' : '#dce3e8', {
    metalness: 0.78,
    roughness: 0.2,
  })
  const brakeMaterial = makeMaterial('#d53635', { roughness: 0.36 })

  const smoothBody = new THREE.Mesh(createSmoothBodyGeometry(dimensions), bodyMaterial)
  smoothBody.name = 'smooth-garage-body'
  smoothBody.castShadow = true
  smoothBody.receiveShadow = true
  group.add(smoothBody)

  addExtrudedPath(group, 'side-body-mass', getBodySilhouette(dimensions), dimensions.width * 0.96, bodyMaterial, {
    bevelSize: 0.03,
    bevelThickness: 0.02,
    edgeOpacity: 0.12,
    position: [0, -0.05, 0],
  })
  addBox(group, 'lower-rocker', [dimensions.length * 0.88, 0.2, dimensions.width * 1.04], [0.06, 0.4, 0], lowerMaterial)

  if (dimensions.bed) {
    addBox(group, 'open-bed-shadow', [dimensions.length * 0.3, 0.08, dimensions.width * 0.72], [dimensions.length * 0.25, 1.3, 0], lowerMaterial)
  }

  const glassBubble = new THREE.Mesh(createGlassGeometry(dimensions), glassMaterial)
  glassBubble.name = 'curved-glass-canopy'
  glassBubble.castShadow = true
  group.add(glassBubble)

  addExtrudedPath(group, 'glass-outline', getGlassSilhouette(dimensions), dimensions.width * 0.72, glassMaterial, {
    bevelSize: 0.035,
    bevelThickness: 0.02,
    position: [0, 0.02, 0],
    edgeColor: '#d8edf5',
    edgeOpacity: 0.36,
  })
  addBox(group, 'roof-cap', [dimensions.cabinWidth * 0.86, 0.1, dimensions.width * 0.72], [dimensions.cabinX + 0.04, dimensions.height + dimensions.cabinHeight + 0.26, 0], bodyMaterial)
  addBox(group, 'hood-crease-center', [dimensions.length * 0.28, 0.035, 0.035], [frontX + dimensions.length * 0.24, dimensions.height + 0.36, 0], makeMaterial('#f5fbff', { transparent: true, opacity: 0.42 }))
  addBox(group, 'hood-crease-left', [dimensions.length * 0.22, 0.025, 0.03], [frontX + dimensions.length * 0.24, dimensions.height + 0.3, dimensions.width * 0.22], makeMaterial('#f5fbff', { transparent: true, opacity: 0.24 }))
  addBox(group, 'hood-crease-right', [dimensions.length * 0.22, 0.025, 0.03], [frontX + dimensions.length * 0.24, dimensions.height + 0.3, -dimensions.width * 0.22], makeMaterial('#f5fbff', { transparent: true, opacity: 0.24 }))
  addBox(group, 'door-cut', [0.035, dimensions.height * 0.72, 0.035], [dimensions.cabinX + dimensions.cabinWidth * 0.18, 0.98, dimensions.width / 2 + 0.035], lowerMaterial)
  addBox(group, 'door-cut-far', [0.035, dimensions.height * 0.72, 0.035], [dimensions.cabinX + dimensions.cabinWidth * 0.18, 0.98, -dimensions.width / 2 - 0.035], lowerMaterial)
  addBox(group, 'b-pillar-left', [0.05, dimensions.cabinHeight * 0.84, 0.04], [dimensions.cabinX + 0.05, dimensions.height + dimensions.cabinHeight * 0.62, dimensions.width * 0.43], lowerMaterial)
  addBox(group, 'b-pillar-right', [0.05, dimensions.cabinHeight * 0.84, 0.04], [dimensions.cabinX + 0.05, dimensions.height + dimensions.cabinHeight * 0.62, -dimensions.width * 0.43], lowerMaterial)
  addBox(group, 'mirror-left', [0.18, 0.12, 0.26], [dimensions.cabinX - dimensions.cabinWidth * 0.42, dimensions.height + 0.55, dimensions.width * 0.58], lowerMaterial)
  addBox(group, 'mirror-right', [0.18, 0.12, 0.26], [dimensions.cabinX - dimensions.cabinWidth * 0.42, dimensions.height + 0.55, -dimensions.width * 0.58], lowerMaterial)

  addBox(group, 'front-bumper', [0.2, 0.46, dimensions.width * 0.96], [frontX - 0.05, 0.62, 0], lowerMaterial)
  addBox(group, 'rear-bumper', [0.2, 0.46, dimensions.width * 0.96], [rearX + 0.05, 0.62, 0], lowerMaterial)
  addBox(group, 'grille', [0.08, 0.28, dimensions.width * 0.58], [frontX - 0.16, 0.78, 0], makeMaterial('#0d1419', { roughness: 0.5 }))
  addBox(group, 'front-plate', [0.09, 0.22, dimensions.width * 0.4], [frontX - 0.22, 0.52, 0], makeMaterial('#dbe2e6', { metalness: 0.2, roughness: 0.34 }))

  addLights(group, dimensions, frontX - 0.2, rearX + 0.2)

  ;[sideZ, -sideZ].forEach((z) => {
    addWheel(group, wheelFrontX, z, wheelRadius, wheelWidth, wheelMaterial, rimMaterial, brakeMaterial, operationIds.has('brakes'), renderSet.has('mesh-wheel') ? 'mesh-wheel' : 'six-spoke')
    addWheel(group, wheelRearX, z, wheelRadius, wheelWidth, wheelMaterial, rimMaterial, brakeMaterial, operationIds.has('brakes'), renderSet.has('mesh-wheel') ? 'mesh-wheel' : 'six-spoke')
  })

  if (widebody) {
    addWidebody(group, dimensions, lowerMaterial, renderSet)
  }

  if (operationIds.has('spoiler')) {
    addSpoiler(group, dimensions, renderSet)
  }

  if (operationIds.has('exhaust')) {
    addExhaust(group, rearX + 0.12, -dimensions.width * 0.24, renderSet)
  }

  if (operationIds.has('turbo') || renderSet.has('front-mount')) {
    addBox(group, 'front-mount-intercooler', [0.08, 0.24, dimensions.width * 0.52], [frontX - 0.22, 0.48, 0], makeMaterial('#d5dee4', { metalness: 0.72, roughness: 0.22 }))
  }

  return group
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose()
    }

    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose())
      } else {
        child.material.dispose()
      }
    }
  })
}

export default function CarPreview({ carProfile, paint, operationIds, renderSet }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
    const fallbackCarGroup = buildCarScene({ carProfile, paint, operationIds, renderSet })
    const assetOverlayGroup = buildAssetOverlayScene({ carProfile, operationIds, renderSet })
    const turntableGroup = new THREE.Group()
    const loader = new GLTFLoader()
    let controls
    let frameId

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    turntableGroup.add(fallbackCarGroup)
    scene.add(turntableGroup)
    scene.add(new THREE.HemisphereLight('#dcefff', '#38434a', 2.2))

    const keyLight = new THREE.DirectionalLight('#ffffff', 5.2)
    keyLight.position.set(-3.6, 6.8, 5.4)
    keyLight.castShadow = true
    scene.add(keyLight)

    const stripLight = new THREE.RectAreaLight('#cde9ff', 4.6, 6, 1)
    stripLight.position.set(-1.5, 4.2, -3.2)
    stripLight.lookAt(0, 0.8, 0)
    scene.add(stripLight)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 8),
      new THREE.MeshStandardMaterial({ color: '#d7e0e5', roughness: 0.72, metalness: 0.05 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.02
    floor.receiveShadow = true
    scene.add(floor)

    const grid = new THREE.GridHelper(12, 24, '#8ea0aa', '#c3d0d6')
    grid.position.y = 0.005
    scene.add(grid)

    camera.position.set(-7.4, 3.2, 7.4)
    camera.lookAt(0.1, 0.9, 0)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 5.2
    controls.maxDistance = 10
    controls.maxPolarAngle = Math.PI * 0.48
    controls.target.set(0.1, 0.98, 0)

    if (carProfile.assetUrl) {
      loader.load(
        carProfile.assetUrl,
        (gltf) => {
          fallbackCarGroup.visible = false
          const asset = gltf.scene
          asset.name = 'asset-car-model'
          fitAssetToGarage(asset, carProfile.dimensions, paint, operationIds)
          turntableGroup.add(asset)
          turntableGroup.add(assetOverlayGroup)
        },
        undefined,
        () => {
          fallbackCarGroup.visible = true
        },
      )
    }

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect()
      renderer.setSize(width, height)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }

    const animate = () => {
      turntableGroup.rotation.y = Math.sin(Date.now() * 0.00032) * 0.08 + 0.2
      controls.update()
      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener('resize', resize)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      disposeObject(scene)
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [carProfile, operationIds, paint, renderSet])

  return <div className="car-canvas" ref={mountRef} aria-label={`${carProfile.label} 3D preview`} />
}
