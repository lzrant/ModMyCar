/** @param {import('../../shared/types.js').Dimensions} dimensions */
export function validateDimensions(dimensions) {
  for (const key of [
    'length',
    'width',
    'height',
    'cabinWidth',
    'cabinHeight',
    'wheelBase',
  ]) {
    if (!Number.isFinite(dimensions[key]) || dimensions[key] <= 0)
      throw new RangeError(`Invalid dimension: ${key}`)
  }
  if (
    !Number.isFinite(dimensions.cabinX) ||
    Math.abs(dimensions.cabinX) > dimensions.length / 2 ||
    dimensions.wheelBase >= dimensions.length ||
    dimensions.cabinWidth > dimensions.length
  )
    throw new RangeError('Dimensions exceed the chassis bounds.')
  return dimensions
}
