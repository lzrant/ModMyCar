import * as THREE from 'three'

export function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.42,
    metalness: options.metalness ?? 0.2,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  })
}

export function createPaintMaterial(color, config) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: config.roughness,
    metalness: 0.62,
    clearcoat: config.clearcoat,
    clearcoatRoughness: 0.18,
  })
}
export function applyAssetMaterials(asset, color, config) {
  asset.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = child.receiveShadow = true
    const replace = (material) => {
      const name = (material.name || '').toLowerCase()
      let next
      if (name.includes('paint')) next = createPaintMaterial(color, config)
      else if (name.includes('window'))
        next = makeMaterial('#2e5b70', {
          roughness: 0.08,
          metalness: 0.05,
          transparent: true,
          opacity: config.tinted ? 0.88 : 0.54,
        })
      else if (name.includes('tire'))
        next = makeMaterial('#111417', { roughness: 0.78 })
      else if (name.includes('plastic'))
        next = makeMaterial('#202a31', { roughness: 0.5 })
      else if (name.includes('lightfront'))
        next = makeMaterial('#fff1b8', { roughness: 0.16 })
      else if (name.includes('lightback'))
        next = makeMaterial('#f05252', { roughness: 0.2 })
      else next = makeMaterial('#d9e0e4', { metalness: 0.34 })
      material.dispose()
      return next
    }
    child.material = Array.isArray(child.material)
      ? child.material.map(replace)
      : replace(child.material)
  })
}
