import * as THREE from 'three'

export function addBox(group, name, size, position, material, options = {}) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2])
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(position[0], position[1], position[2])
  mesh.rotation.set(
    options.rotation?.[0] ?? 0,
    options.rotation?.[1] ?? 0,
    options.rotation?.[2] ?? 0,
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

export function makePath(commands) {
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
      shape.bezierCurveTo(
        command.cx1,
        command.cy1,
        command.cx2,
        command.cy2,
        command.x,
        command.y,
      )
    }
  })
  shape.closePath()
  return shape
}

export function addExtrudedPath(
  group,
  name,
  commands,
  depth,
  material,
  options = {},
) {
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
  mesh.position.set(
    options.position?.[0] ?? 0,
    options.position?.[1] ?? 0,
    options.position?.[2] ?? 0,
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: options.edgeColor ?? '#0b1116',
    transparent: true,
    opacity: options.edgeOpacity ?? 0.28,
  })
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 35),
    edgeMaterial,
  )
  edges.position.copy(mesh.position)
  group.add(edges)

  return mesh
}
