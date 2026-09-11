import * as THREE from 'three'
import { buildProceduralBody } from './procedural.js'
import { fitAssetToGarage } from './assets.js'
import { buildWheels } from './wheels.js'
import { BUILDERS } from './builders.js'
/** @param {{carProfile: import('../../shared/types.js').VehicleProfile, paint: string, plan: object, asset?: THREE.Group}} options */
export function buildCarScene({ carProfile, paint, plan, asset }) {
  const group = new THREE.Group(),
    chassis = new THREE.Group()
  const dimensions = carProfile.dimensions
  let wheelLayout
  if (asset) {
    const fitted = fitAssetToGarage(asset, dimensions, paint, plan)
    wheelLayout = fitted.userData.wheelLayout
    chassis.add(fitted)
  } else {
    const body = buildProceduralBody({
      carProfile,
      paint: { value: paint },
      config: plan.config,
    })
    body.position.y = 0
    chassis.add(body)
  }
  for (const name of plan.builders) BUILDERS[name](chassis, dimensions, plan)
  chassis.position.y = plan.config.rideDrop
  group.add(chassis, buildWheels(dimensions, plan.config, wheelLayout))
  return group
}
