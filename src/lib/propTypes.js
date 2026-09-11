import PropTypes from 'prop-types'
export const dimensionsType = PropTypes.exact({
  length: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  cabinX: PropTypes.number.isRequired,
  cabinWidth: PropTypes.number.isRequired,
  cabinHeight: PropTypes.number.isRequired,
  wheelBase: PropTypes.number.isRequired,
  bed: PropTypes.bool,
})
export const profileType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  assetUrl: PropTypes.string,
  dimensions: dimensionsType.isRequired,
})
export const vehicleType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  year: PropTypes.number.isRequired,
  make: PropTypes.string.isRequired,
  model: PropTypes.string.isRequired,
  trim: PropTypes.string.isRequired,
  profile: profileType.isRequired,
})
export const partType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  manufacturer: PropTypes.string.isRequired,
  sku: PropTypes.string.isRequired,
  visual_category: PropTypes.string.isRequired,
  render_key: PropTypes.string.isRequired,
  source_url: PropTypes.string,
  fitment_notes: PropTypes.string,
  specifications: PropTypes.object,
})
export const buildType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  vehicle_id: PropTypes.number.isRequired,
  part_ids: PropTypes.arrayOf(PropTypes.number).isRequired,
  paint_color: PropTypes.string.isRequired,
  created_at: PropTypes.string.isRequired,
})
