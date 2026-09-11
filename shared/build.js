import { presetFor } from './renderPresets.js'
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.status = 400
  }
}
export function positiveId(value, label = 'ID') {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new ValidationError(`${label} must be a positive integer.`)
  return value
}
/** Validate the exact network shape, then return a canonical copy without caller-owned arrays.
 * @param {unknown} input @returns {import('./types.js').BuildPayload}
 */
export function parseBuildPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new ValidationError('Build must be an object.')
  if (
    Object.keys(input).some(
      (key) => !['vehicle_id', 'part_ids', 'paint_color'].includes(key),
    )
  )
    throw new ValidationError('Unknown build field.')
  positiveId(input.vehicle_id, 'Vehicle ID')
  if (!Array.isArray(input.part_ids) || input.part_ids.length > 20)
    throw new ValidationError('Choose up to 20 parts.')
  input.part_ids.forEach((id) => positiveId(id, 'Part ID'))
  if (new Set(input.part_ids).size !== input.part_ids.length)
    throw new ValidationError('Duplicate part IDs.')
  if (
    typeof input.paint_color !== 'string' ||
    !/^#[0-9a-f]{6}$/i.test(input.paint_color)
  )
    throw new ValidationError('Paint must be a six-digit hex color.')
  return {
    vehicle_id: input.vehicle_id,
    part_ids: [...input.part_ids].sort((a, b) => a - b),
    paint_color: input.paint_color.toLowerCase(),
  }
}
/** @param {import('./types.js').BuildPayload} payload @param {import('./types.js').Part[]} compatibleParts */
export function validateSelection(payload, compatibleParts) {
  const slots = new Set()
  return payload.part_ids.map((id) => {
    const part = compatibleParts.find((p) => p.id === id)
    if (!part)
      throw new ValidationError(
        `Part ${id} is not compatible with this vehicle.`,
      )
    const { slot } = presetFor(part)
    if (slots.has(slot))
      throw new ValidationError(`Choose only one part for ${slot}.`)
    slots.add(slot)
    return part
  })
}
export function parseBuildId(id) {
  if (
    typeof id !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      id,
    )
  )
    throw new ValidationError('Build ID must be a UUID.')
  return id
}
