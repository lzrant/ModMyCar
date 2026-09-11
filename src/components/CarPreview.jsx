import { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createRenderPlan } from '../../shared/renderPresets.js'
import { createGarage } from '../three/scene.js'
import { buildCarScene } from '../three/car.js'
import { disposeObject } from '../three/dispose.js'
import { profileType, partType } from '../lib/propTypes.js'

export default function CarPreview({ carProfile, paint, parts }) {
  const mountRef = useRef(null),
    garageRef = useRef(null)
  const [assetState, setAssetState] = useState({
    url: null,
    asset: null,
    status: 'loading',
  })
  const [sceneError, setSceneError] = useState('')
  const plan = useMemo(() => createRenderPlan(parts), [parts])
  const status =
    assetState.url === carProfile.assetUrl ? assetState.status : 'loading'
  useEffect(() => {
    let garage
    try {
      garage = createGarage(mountRef.current)
      garageRef.current = garage
    } catch {
      setSceneError(
        '3D preview is unavailable. Enable WebGL in your browser. Your build can still be saved.',
      )
      return
    }
    return () => {
      garageRef.current = null
      garage.dispose()
    }
  }, [])
  useEffect(() => {
    let cancelled = false,
      loadedAsset
    if (!carProfile.assetUrl) {
      setAssetState({ url: null, asset: null, status: 'procedural' })
      return
    }
    new GLTFLoader().load(
      carProfile.assetUrl,
      (gltf) => {
        if (cancelled) {
          disposeObject(gltf.scene)
          return
        }
        loadedAsset = gltf.scene
        setAssetState({
          url: carProfile.assetUrl,
          asset: gltf.scene,
          status: 'ready',
        })
      },
      undefined,
      () => {
        if (!cancelled)
          setAssetState({
            url: carProfile.assetUrl,
            asset: null,
            status: 'fallback',
          })
      },
    )
    return () => {
      cancelled = true
      if (loadedAsset) disposeObject(loadedAsset)
    }
  }, [carProfile.assetUrl])
  useEffect(() => {
    const garage = garageRef.current
    if (!garage) return
    const asset =
      assetState.url === carProfile.assetUrl ? assetState.asset : null
    const car = buildCarScene({ carProfile, paint, plan, asset })
    garage.turntable.add(car)
    return () => {
      garage.turntable.remove(car)
      disposeObject(car)
    }
  }, [carProfile, paint, plan, assetState])
  return (
    <>
      <div
        className="car-canvas"
        ref={mountRef}
        aria-label={`${carProfile.label} interactive 3D preview`}
      />
      <div className="preview-status" role="status">
        {sceneError ||
          (status === 'loading' ? (
            <>
              <span className="spinner" /> Loading 3D model…
            </>
          ) : status === 'fallback' ? (
            'Model could not load. Showing the detailed procedural preview.'
          ) : status === 'procedural' ? (
            'Detailed procedural preview'
          ) : (
            '3D model ready · drag to orbit · scroll to zoom'
          ))}
      </div>
    </>
  )
}
CarPreview.propTypes = {
  carProfile: profileType.isRequired,
  paint: PropTypes.string.isRequired,
  parts: PropTypes.arrayOf(partType).isRequired,
}
