import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { disposeObject } from './dispose.js'
export function createGarage(mount) {
  RectAreaLightUniformsLib.init()
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  const scene = new THREE.Scene(),
    turntable = new THREE.Group()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  mount.appendChild(renderer.domElement)
  scene.add(turntable, new THREE.HemisphereLight('#dcefff', '#38434a', 2.2))
  const key = new THREE.DirectionalLight('#ffffff', 5.2)
  key.position.set(-3.6, 6.8, 5.4)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 })
  scene.add(key)
  const strip = new THREE.RectAreaLight('#cde9ff', 4.6, 6, 1)
  strip.position.set(-1.5, 4.2, -3.2)
  strip.lookAt(0, 0.8, 0)
  scene.add(strip)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 12),
    new THREE.MeshStandardMaterial({
      color: '#d7e0e5',
      roughness: 0.72,
      metalness: 0.05,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.02
  floor.receiveShadow = true
  scene.add(floor)
  const grid = new THREE.GridHelper(14, 28, '#8ea0aa', '#c3d0d6')
  grid.position.y = 0.005
  scene.add(grid)
  camera.position.set(-8.6, 4.1, 8.6)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 6
  controls.maxDistance = 16
  controls.maxPolarAngle = Math.PI * 0.48
  controls.target.set(0, 0.95, 0)
  controls.update()
  const resize = () => {
    const { width, height } = mount.getBoundingClientRect()
    renderer.setSize(Math.max(width, 1), Math.max(height, 1))
    camera.aspect = Math.max(width, 1) / Math.max(height, 1)
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(mount)
  resize()
  let frame
  const animate = () => {
    controls.update()
    renderer.render(scene, camera)
    frame = requestAnimationFrame(animate)
  }
  animate()
  return {
    turntable,
    dispose() {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      disposeObject(scene)
      key.shadow.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
