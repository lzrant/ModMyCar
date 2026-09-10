import { useMemo, useState } from 'react'
import CarPreview from './components/CarPreview'
import { BRAND_PARTS, CAR_PROFILES, COLOR_PATTERNS, MOD_OPERATIONS } from './data/carModDataset'
import './App.css'

const SAMPLE_SEARCH =
  '2018 Subaru WRX sedan with matte black wrap, Tomei Expreme Ti exhaust, KW V3 coilovers, Rocket Bunny widebody, Volk TE37 wheels, Brembo brakes, APR carbon wing and Garrett turbo'

function detectOperations(query) {
  return MOD_OPERATIONS.map((operation) => {
    const match = query.match(operation.expression)

    if (!match) {
      return null
    }

    return {
      ...operation,
      source: 'Regex operation',
      match: match[0],
      vector: normalizeVector(operation.vector),
    }
  }).filter(Boolean)
}

function detectBrands(query) {
  return BRAND_PARTS.map((part) => {
    const match = query.match(part.expression)

    if (!match) {
      return null
    }

    return {
      ...part,
      label: `${part.brand} ${part.category}`,
      source: 'Brand dataset',
      match: match[0],
      copy: part.note,
      vector: normalizeVector(part.vector),
    }
  }).filter(Boolean)
}

function normalizeVector(vector) {
  return {
    ...vector,
    magnitude: Number(vector.magnitude.toFixed(2)),
    confidence: Number(vector.confidence.toFixed(2)),
  }
}

function detectColor(query) {
  return COLOR_PATTERNS.find((color) => color.expression.test(query)) ?? COLOR_PATTERNS[5]
}

function detectCarProfile(query) {
  const profile = CAR_PROFILES.find((car) => car.expression.test(query)) ?? CAR_PROFILES[0]

  return {
    ...profile,
    match: query.match(profile.expression)?.[0] ?? 'default sports coupe',
    vector: normalizeVector(profile.vector),
  }
}

function App() {
  const [query, setQuery] = useState(SAMPLE_SEARCH)
  const operations = useMemo(() => detectOperations(query), [query])
  const brandParts = useMemo(() => detectBrands(query), [query])
  const paint = useMemo(() => detectColor(query), [query])
  const carProfile = useMemo(() => detectCarProfile(query), [query])

  const detected = [...brandParts, ...operations]
  const operationIds = useMemo(
    () =>
      new Set([
        ...operations.map((operation) => operation.id),
        ...brandParts.map((part) => part.operationId),
      ]),
    [brandParts, operations],
  )
  const renderSet = useMemo(
    () => new Set(brandParts.map((part) => part.render).filter(Boolean)),
    [brandParts],
  )
  const exhaustPart = brandParts.find((part) => part.operationId === 'exhaust')
  const wheelPart = brandParts.find((part) => part.operationId === 'wheels')
  const aeroPart = brandParts.find((part) => part.operationId === 'body-kit')

  return (
    <main className="app-shell">
      <section className="visual-stage" aria-label="3D car modification preview">
        <div className="stage-copy">
          <p className="eyebrow">ModMyCar vector preview</p>
          <h1>Asset-based cars with a garage-style mod preview.</h1>
          <p>
            The parser now chooses a local CC0 vehicle model first, then layers
            brand-backed mod vectors over it with showroom lighting, paint,
            stance, aero, exhaust and brake cues.
          </p>
        </div>

        <div className="car-scene">
          <CarPreview
            carProfile={carProfile}
            operationIds={operationIds}
            paint={paint}
            renderSet={renderSet}
          />
          <div className="vehicle-badge">
            <span>{carProfile.label}</span>
            <strong>{carProfile.match}</strong>
          </div>
        </div>
      </section>

      <section className="control-panel" aria-label="Modification controls and vector output">
        <div className="input-panel">
          <label htmlFor="mod-search">Customer mod search</label>
          <textarea
            id="mod-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows="5"
            spellCheck="false"
          />
          <div className="quick-actions" aria-label="Example searches">
            <button
              type="button"
              onClick={() =>
                setQuery('Volkswagen Golf GTI hatchback with pearl white 3M wrap, privacy glass, Eibach springs, BBS wheels and Brembo GT brakes')
              }
            >
              Street build
            </button>
            <button
              type="button"
              onClick={() =>
                setQuery('Mustang GT coupe with cobalt blue Liberty Walk widebody, APR Performance carbon wing, Garrett turbo, Mishimoto front mount and HKS Hi-Power exhaust')
              }
            >
              Track build
            </button>
            <button
              type="button"
              onClick={() =>
                setQuery('Ford F-150 pickup truck with satin black wrap, Brembo brakes, HKS exhaust and bronze forged wheels')
              }
            >
              Truck build
            </button>
            <button type="button" onClick={() => setQuery(SAMPLE_SEARCH)}>
              Tomei sample
            </button>
          </div>

          <div className="brand-summary">
            <strong>Matched companies</strong>
            <p>
              {brandParts.length > 0
                ? brandParts.map((part) => part.company).join(', ')
                : 'No brand-specific dataset matches yet.'}
            </p>
          </div>
        </div>

        <div className="vector-panel">
          <div className="panel-heading">
            <p className="eyebrow">Dataset and regex vectors</p>
            <strong>{detected.length} signals detected</strong>
          </div>

          <div className="part-strip" aria-label="Primary visual part matches">
            <span>{carProfile.label}</span>
            <span>{exhaustPart?.brand ?? 'Generic'} exhaust</span>
            <span>{wheelPart?.brand ?? 'Generic'} wheels</span>
            <span>{aeroPart?.brand ?? 'Generic'} aero</span>
          </div>

          <div className="mod-list">
            {detected.map((mod) => (
              <article className="mod-card" key={`${mod.source}-${mod.id}`}>
                <div>
                  <p className="source-label">{mod.source}</p>
                  <h2>{mod.label}</h2>
                  <p>{mod.copy}</p>
                </div>
                <dl>
                  <div>
                    <dt>Match</dt>
                    <dd>{mod.match}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{mod.category}</dd>
                  </div>
                  <div>
                    <dt>Axis</dt>
                    <dd>{mod.vector.axis}</dd>
                  </div>
                  <div>
                    <dt>Magnitude</dt>
                    <dd>{mod.vector.magnitude}</dd>
                  </div>
                </dl>
              </article>
            ))}

            <article className="mod-card">
              <div>
                <p className="source-label">Vehicle dataset</p>
                <h2>{carProfile.label}</h2>
                <p>{carProfile.examples}</p>
              </div>
              <dl>
                <div>
                  <dt>Match</dt>
                  <dd>{carProfile.match}</dd>
                </div>
                <div>
                  <dt>Axis</dt>
                  <dd>{carProfile.vector.axis}</dd>
                </div>
                <div>
                  <dt>Length</dt>
                  <dd>{carProfile.dimensions.length}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{carProfile.vector.confidence}</dd>
                </div>
              </dl>
            </article>

            {detected.length === 0 && (
              <div className="empty-state">
                <strong>No vector matches yet</strong>
                <p>Try terms like Tomei, HKS, TE37, Brembo, KW, lowered, turbo or widebody.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
