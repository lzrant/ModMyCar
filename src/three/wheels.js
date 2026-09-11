import * as THREE from 'three'
import { makeMaterial } from './materials.js'
import { addBox } from './primitives.js'
/** Deterministic wheel positions. Wheels remain grounded when the chassis is lowered. */
export function wheelParameters(dimensions, config, layout) {
  if (layout) {
    const radius = ((layout[0].size[1] / 2) * config.wheelRadius) / 0.46
    return {
      radius,
      width: (layout[0].size[2] * config.wheelWidth) / 0.34,
      positions: layout.map(({ center }) => [
        center[0],
        radius,
        center[2] + Math.sign(center[2]) * config.trackExtra,
      ]),
    }
  }
  return {
    radius: config.wheelRadius,
    width: config.wheelWidth,
    positions: [-dimensions.wheelBase / 2, dimensions.wheelBase / 2].flatMap(
      (x) =>
        [-1, 1].map((side) => [
          x,
          config.wheelRadius,
          side * (dimensions.width / 2 + config.trackExtra),
        ]),
    ),
  }
}
export function buildWheels(dimensions, config, layout) {
  const group = new THREE.Group()
  group.name = 'configured-wheels'
  const { positions, radius, width } = wheelParameters(
    dimensions,
    config,
    layout,
  )
  const tireMaterial = makeMaterial('#11171c', { roughness: 0.78 })
  const metal = makeMaterial('#cdd4db', { metalness: 0.86, roughness: 0.2 })
  const inner = makeMaterial('#151c22', { roughness: 0.5 })
  for (const [x, y, z] of positions) {
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 48),
      tireMaterial,
    )
    tire.rotation.x = Math.PI / 2
    tire.position.set(x, y, z)
    tire.castShadow = true
    group.add(tire)
    for (const side of [-1, 1]) {
      const faceZ = z + side * width * 0.51
      const disk = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 0.74, 48),
        inner,
      )
      disk.position.set(x, y, faceZ)
      disk.rotation.y = side === 1 ? 0 : Math.PI
      group.add(disk)
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.73, 0.028, 8, 48),
        metal,
      )
      rim.position.set(x, y, faceZ + side * 0.006)
      group.add(rim)
      const spokeCount = config.wheelStyle === 'mesh-wheel' ? 10 : 6
      for (let i = 0; i < spokeCount; i++) {
        for (const split of config.wheelStyle === 'stock'
          ? [0]
          : [-0.045, 0.045]) {
          const angle = (i * Math.PI * 2) / spokeCount + split
          const spoke = addBox(
            group,
            'wheel-spoke',
            [0.034, radius * 0.6, 0.025],
            [
              x + Math.sin(angle) * radius * 0.38,
              y + Math.cos(angle) * radius * 0.38,
              faceZ + side * 0.02,
            ],
            metal,
          )
          spoke.rotation.z = -angle
        }
      }
      const hub = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.13, 12, 8),
        metal,
      )
      hub.scale.z = 0.35
      hub.position.set(x, y, faceZ + side * 0.025)
      group.add(hub)
      if (config.showBrake)
        addBox(
          group,
          'brake-caliper',
          [0.12, radius * 0.55, 0.04],
          [x + radius * 0.4, y, faceZ + side * 0.01],
          makeMaterial('#d53635'),
        )
    }
  }
  return group
}
