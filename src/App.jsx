import { useEffect, useMemo, useState } from 'react'
import CarPreview from './components/CarPreview.jsx'
import VehiclePicker from './components/VehiclePicker.jsx'
import PartsCatalog from './components/PartsCatalog.jsx'
import { api } from './lib/api.js'
import { togglePart } from '../shared/selection.js'
import { parseBuildPayload, validateSelection } from '../shared/build.js'
import './App.css'
const PAINTS = [
  '#2876d7',
  '#d7323f',
  '#21896f',
  '#eef3f5',
  '#111820',
  '#6c4bb4',
  '#e3b743',
]
const choiceFor = (vehicle) => ({
  year: String(vehicle.year),
  make: vehicle.make,
  vehicleId: vehicle.id,
})
export default function App() {
  const [vehicles, setVehicles] = useState([]),
    [choice, setChoice] = useState({ year: '', make: '', vehicleId: '' })
  const [catalog, setCatalog] = useState({ vehicleId: null, parts: [] }),
    [selectedIds, setSelectedIds] = useState([])
  const [paint, setPaint] = useState(PAINTS[0]),
    [builds, setBuilds] = useState([]),
    [mode, setMode] = useState('')
  const [loading, setLoading] = useState(true),
    [loadingParts, setLoadingParts] = useState(false),
    [busy, setBusy] = useState('')
  const [error, setError] = useState(''),
    [partsError, setPartsError] = useState(''),
    [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0),
    [partsRetry, setPartsRetry] = useState(0),
    [buildId, setBuildId] = useState('')
  const vehicle = vehicles.find((v) => v.id === choice.vehicleId)
  const parts = useMemo(
    () => (catalog.vehicleId === vehicle?.id ? catalog.parts : []),
    [catalog, vehicle?.id],
  )
  const selected = useMemo(
    () => parts.filter((p) => selectedIds.includes(p.id)),
    [parts, selectedIds],
  )
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    Promise.all([
      api.vehicles(controller.signal),
      api.health(controller.signal),
    ])
      .then(([list, health]) => {
        setVehicles(list)
        setMode(health.mode)
        if (list.length)
          setChoice((current) =>
            list.some((v) => v.id === current.vehicleId)
              ? current
              : choiceFor(list[0]),
          )
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    api
      .builds(controller.signal)
      .then(setBuilds)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => controller.abort()
  }, [retry])
  useEffect(() => {
    if (!vehicle) return
    const controller = new AbortController()
    setLoadingParts(true)
    setPartsError('')
    api
      .parts(vehicle.id, controller.signal)
      .then((list) => setCatalog({ vehicleId: vehicle.id, parts: list }))
      .catch((e) => {
        if (e.name !== 'AbortError') setPartsError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingParts(false)
      })
    return () => controller.abort()
  }, [vehicle, partsRetry])
  function changeVehicle(next) {
    setChoice(next)
    setSelectedIds([])
    setNotice('')
    setPartsError('')
  }
  function selectPart(part) {
    setSelectedIds(togglePart(selected, part).map((p) => p.id))
    setNotice('')
  }
  async function save() {
    setBusy('save')
    setError('')
    setNotice('')
    try {
      const payload = parseBuildPayload({
        vehicle_id: vehicle.id,
        part_ids: selectedIds,
        paint_color: paint,
      })
      validateSelection(payload, parts)
      const build = await api.saveBuild(payload)
      setBuilds((current) => [build, ...current])
      setBuildId(build.id)
      setNotice('Build saved to your garage.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }
  async function load(id) {
    setBusy('load')
    setError('')
    setNotice('')
    try {
      const build = await api.loadBuild(id)
      const payload = parseBuildPayload({
        vehicle_id: build.vehicle_id,
        part_ids: build.part_ids,
        paint_color: build.paint_color,
      })
      const nextVehicle = vehicles.find((v) => v.id === payload.vehicle_id)
      if (!nextVehicle)
        throw new Error('This saved vehicle is no longer in the catalog.')
      const compatible = await api.parts(nextVehicle.id)
      validateSelection(payload, compatible)
      setCatalog({ vehicleId: nextVehicle.id, parts: compatible })
      setChoice(choiceFor(nextVehicle))
      setSelectedIds(payload.part_ids)
      setPaint(payload.paint_color)
      setBuildId(build.id)
      setNotice('Saved build loaded.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }
  return (
    <main className="app-shell">
      <header className="masthead">
        <a className="logo" href="/">
          MOD<span>MY</span>CAR
        </a>
        <span className="header-label">YOUR GARAGE. YOUR RULES.</span>
        <a href="#garage">
          My garage <span className="garage-count">{builds.length}</span>
        </a>
      </header>
      <div className="workspace">
        <section className="visual-stage" aria-label="Vehicle configurator">
          <div className="stage-heading">
            <p className="eyebrow">BUILD / CONFIGURE / MAKE IT YOURS</p>
            <h1>
              {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Make it yours.'}
            </h1>
            <p>
              {vehicle
                ? `${vehicle.year} · ${vehicle.trim}`
                : 'Choose a vehicle to start your next build.'}
            </p>
          </div>
          <div className="car-scene">
            {vehicle ? (
              <CarPreview
                carProfile={vehicle.profile}
                paint={paint}
                parts={selected}
              />
            ) : (
              <div className="stage-placeholder">
                {loading
                  ? 'Opening your garage…'
                  : 'Choose a year, make and model →'}
              </div>
            )}
            <div className="vehicle-badge">
              <span>LIVE CONFIGURATION</span>
              <strong>
                {selected.length} {selected.length === 1 ? 'part' : 'parts'}{' '}
                selected
              </strong>
            </div>
          </div>
          <p className="preview-note">
            Representative 3D model and part geometry. Use manufacturer fitment
            notes for your exact trim.
          </p>
        </section>
        <aside className="control-panel" aria-label="Build controls">
          <VehiclePicker
            vehicles={vehicles}
            choice={choice}
            onChange={changeVehicle}
            disabled={loading || !!busy}
          />
          <fieldset disabled={!vehicle || !!busy} className="paint-picker">
            <legend>
              <span className="step">02</span> Find your finish
            </legend>
            <div className="swatches">
              {PAINTS.map((color) => (
                <button
                  key={color}
                  className="swatch"
                  style={{ background: color }}
                  aria-label={`Paint ${color}`}
                  aria-pressed={paint === color}
                  onClick={() => {
                    setPaint(color)
                    setNotice('')
                  }}
                />
              ))}
              <label className="custom-paint">
                Custom
                <input
                  aria-label="Custom paint"
                  type="color"
                  value={paint}
                  onChange={(e) => {
                    setPaint(e.target.value)
                    setNotice('')
                  }}
                />
              </label>
            </div>
          </fieldset>
          <section className="build-summary">
            <h2>
              <span className="step">03</span> Your setup{' '}
              <span className="count">{selected.length}</span>
            </h2>
            {selected.length ? (
              <ul>
                {selected.map((p) => (
                  <li key={p.id}>
                    <span>
                      <small>{p.manufacturer}</small>
                      {p.name}
                    </span>
                    <button
                      disabled={!!busy}
                      aria-label={`Remove selected ${p.name}`}
                      onClick={() => selectPart(p)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                A clean starting point. Add compatible parts from the catalog
                below.
              </p>
            )}
            <button
              className="primary"
              disabled={!vehicle || loadingParts || !!partsError || !!busy}
              onClick={save}
            >
              {busy === 'save' ? 'Saving…' : 'Save build'} <span>↗</span>
            </button>
            <p className="privacy-note">
              {mode === 'local'
                ? 'Local garage · saved on this computer'
                : 'Private garage · saved with Supabase'}
              <br />
              This browser keeps access to your saved builds.
            </p>
          </section>
        </aside>
        <div className="messages" aria-live="polite">
          {error && (
            <div role="alert" className="error">
              {error}{' '}
              <button onClick={() => setRetry((r) => r + 1)}>
                Retry connection
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="success">
              ✓ {notice}
            </div>
          )}
        </div>
        <div className="catalog-area">
          {loadingParts && vehicle ? (
            <p role="status" className="empty">
              <span className="spinner" /> Loading compatible parts…
            </p>
          ) : partsError ? (
            <div role="alert" className="error">
              {partsError}{' '}
              <button onClick={() => setPartsRetry((r) => r + 1)}>
                Retry parts
              </button>
            </div>
          ) : vehicle ? (
            <PartsCatalog
              key={vehicle.id}
              parts={parts}
              selected={selected}
              onToggle={selectPart}
              disabled={!!busy}
            />
          ) : (
            <p className="empty">
              Select a vehicle to see its compatible catalog.
            </p>
          )}
        </div>
        <section id="garage" className="saved-garage">
          <p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p>
          <h2>My garage.</h2>
          <label>
            Saved builds
            <select
              aria-label="Saved builds"
              value={buildId}
              onChange={(e) => setBuildId(e.target.value)}
              disabled={!!busy}
            >
              <option value="">Choose a saved build</option>
              {builds.map((b) => {
                const v = vehicles.find((v) => v.id === b.vehicle_id)
                return (
                  <option key={b.id} value={b.id}>
                    {v ? `${v.year} ${v.make} ${v.model}` : 'Vehicle'} ·{' '}
                    {b.part_ids.length} parts ·{' '}
                    {new Date(b.created_at).toLocaleString()}
                  </option>
                )
              })}
            </select>
          </label>
          <button disabled={!buildId || !!busy} onClick={() => load(buildId)}>
            {busy === 'load' ? 'Loading…' : 'Load saved build'}
          </button>
          {!builds.length && (
            <p className="muted">Your saved setups will appear here.</p>
          )}
        </section>
      </div>
      <footer>
        MODMYCAR <span>Built around your next idea.</span>
        <span>{mode === 'local' ? 'Local catalog' : 'Connected catalog'}</span>
      </footer>
    </main>
  )
}
