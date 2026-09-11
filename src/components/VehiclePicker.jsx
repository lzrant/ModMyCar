import PropTypes from 'prop-types'
import { vehicleType } from '../lib/propTypes.js'
export default function VehiclePicker({
  vehicles,
  choice,
  onChange,
  disabled,
}) {
  const years = [...new Set(vehicles.map((v) => v.year))].sort((a, b) => b - a)
  const makes = [
    ...new Set(
      vehicles.filter((v) => v.year === +choice.year).map((v) => v.make),
    ),
  ].sort()
  const models = vehicles.filter(
    (v) => v.year === +choice.year && v.make === choice.make,
  )
  return (
    <fieldset disabled={disabled} className="vehicle-picker">
      <legend>
        <span className="step">01</span> Choose your vehicle
      </legend>
      <div className="picker-row">
        <label>
          Year
          <select
            aria-label="Year"
            value={choice.year}
            onChange={(e) =>
              onChange({ year: e.target.value, make: '', vehicleId: '' })
            }
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Make
          <select
            aria-label="Make"
            disabled={!choice.year}
            value={choice.make}
            onChange={(e) =>
              onChange({ ...choice, make: e.target.value, vehicleId: '' })
            }
          >
            <option value="">Make</option>
            {makes.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Model
        <select
          aria-label="Model"
          disabled={!choice.make}
          value={choice.vehicleId}
          onChange={(e) =>
            onChange({
              ...choice,
              vehicleId: e.target.value ? Number(e.target.value) : '',
            })
          }
        >
          <option value="">Select model</option>
          {models.map((v) => (
            <option key={v.id} value={v.id}>
              {v.model} · {v.trim}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  )
}
VehiclePicker.propTypes = {
  vehicles: PropTypes.arrayOf(vehicleType).isRequired,
  choice: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}
