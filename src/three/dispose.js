/** Release shared GPU resources once, including textures and line materials. */
export function disposeObject(object) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set()
  object.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry)
    for (const material of [child.material].flat().filter(Boolean)) {
      materials.add(material)
      for (const value of Object.values(material))
        if (value?.isTexture) textures.add(value)
    }
  })
  for (const resource of [...textures, ...materials, ...geometries])
    resource.dispose()
}
