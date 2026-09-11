import * as THREE from 'three'
import { applyAssetMaterials } from './materials.js'
/** Clone owned render resources so changing a build cannot mutate the cached glTF template. */
export function fitAssetToGarage(template, dimensions, paint, plan) {
  const asset = template.clone(true)
  asset.traverse((child) => {
    if (child.geometry) child.geometry = child.geometry.clone()
    if (child.material)
      child.material = Array.isArray(child.material)
        ? child.material.map((m) => m.clone())
        : child.material.clone()
  })
  // Kenney front is -Z. Rotate it into the garage's -X forward axis.
  asset.rotation.y = Math.PI / 2
  asset.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(asset)
  const size = box.getSize(new THREE.Vector3()),
    center = box.getCenter(new THREE.Vector3())
  asset.position.sub(center)
  const normalized = new THREE.Group()
  normalized.add(asset)
  const height = dimensions.height + dimensions.cabinHeight + 0.5
  normalized.scale.set(
    dimensions.length / size.x,
    height / size.y,
    dimensions.width / size.z,
  )
  normalized.position.y = height / 2
  normalized.updateMatrixWorld(true)
  const anchors = []
  asset.traverse((child) => {
    if (/^wheel_(back|front)(Left|Right)$/i.test(child.name)) {
      const bounds = new THREE.Box3().setFromObject(child)
      anchors.push({
        center: bounds.getCenter(new THREE.Vector3()).toArray(),
        size: bounds.getSize(new THREE.Vector3()).toArray(),
      })
    }
  })
  normalized.userData.wheelLayout = anchors.length === 4 ? anchors : null
  asset.traverse((child) => {
    if (/^wheel/i.test(child.name)) child.visible = false
    if (plan.operationIds.has('spoiler') && /spoiler/i.test(child.name))
      child.visible = false
  })
  applyAssetMaterials(asset, paint, plan.config)
  return normalized
}
