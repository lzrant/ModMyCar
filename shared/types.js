/**
 * Shared transport and renderer contracts. IDs are positive safe integers;
 * build IDs are UUIDs. Geometry uses stylized garage units, not vehicle metres.
 * @typedef {'wheels'|'exhaust'|'aero'|'suspension'|'brakes'|'exterior'|'cooling'} VisualCategory
 * @typedef {'wheels'|'exhaust'|'spoiler'|'body-kit'|'splitter'|'lowering'|'brakes'|'tint'|'wrap'|'turbo'} OperationId
 * @typedef {Set<OperationId>} OperationIds
 * @typedef {Object} Dimensions
 * @property {number} length
 * @property {number} width
 * @property {number} height
 * @property {number} cabinX
 * @property {number} cabinWidth
 * @property {number} cabinHeight
 * @property {number} wheelBase
 * @property {boolean} [bed]
 * @typedef {Object} VehicleProfile
 * @property {string} id
 * @property {string} label
 * @property {string|null} assetUrl glTF URL; null intentionally selects procedural body
 * @property {Dimensions} dimensions
 * @typedef {Object} Vehicle
 * @property {number} id
 * @property {number} year
 * @property {string} make
 * @property {string} model
 * @property {string} trim
 * @property {VehicleProfile} profile
 * @typedef {Object} Part
 * @property {number} id
 * @property {string} name
 * @property {string} manufacturer
 * @property {string} sku
 * @property {VisualCategory} visual_category
 * @property {string} render_key Variant in renderPresets.js
 * @property {string} source_url Manufacturer catalog reference
 * @property {string} fitment_notes
 * @property {Object<string, string|number>} specifications
 * @typedef {Object} BuildPayload
 * @property {number} vehicle_id
 * @property {number[]} part_ids One part per render slot; unique compatible IDs
 * @property {string} paint_color Six-digit CSS hex color
 * @typedef {BuildPayload & {id: string, created_at: string}} Build
 */
export {}
