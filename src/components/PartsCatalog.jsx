import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { matchParts } from '../../shared/selection.js'
import { partType } from '../lib/propTypes.js'
export default function PartsCatalog({ parts, selected, onToggle, disabled }) {
  const [category, setCategory] = useState('all'),
    [query, setQuery] = useState('')
  const categories = [...new Set(parts.map((p) => p.visual_category))]
  const filtered = useMemo(
    () =>
      matchParts(parts, query).filter(
        (p) => category === 'all' || p.visual_category === category,
      ),
    [parts, query, category],
  )
  return (
    <section className="catalog" aria-label="Compatible parts catalog">
      <div className="section-title">
        <div>
          <p className="eyebrow">THE RIGHT FIT</p>
          <h2>Build your setup.</h2>
        </div>
        <span className="count">{parts.length} catalog parts</span>
      </div>
      <label className="search-label">
        <span className="sr-only">Search compatible parts</span>
        <input
          type="search"
          placeholder="Search name, brand, category or part number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="categories" aria-label="Part categories">
        {['all', ...categories].map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c === 'all' ? 'All parts' : c}
          </button>
        ))}
      </div>
      <div className="part-grid">
        {filtered.map((part) => {
          const added = selected.some((p) => p.id === part.id)
          return (
            <article
              className={`part-card ${added ? 'selected' : ''}`}
              key={part.id}
            >
              <div className="part-topline">
                <span>{part.visual_category}</span>
                <span className="fit-badge">Vehicle matched</span>
              </div>
              <p className="manufacturer">{part.manufacturer}</p>
              <h3>{part.name}</h3>
              <p className="sku">{part.sku}</p>
              <p className="fitment">{part.fitment_notes}</p>
              <div className="part-actions">
                <a href={part.source_url} target="_blank" rel="noreferrer">
                  Manufacturer ↗
                </a>
                <button
                  disabled={disabled}
                  aria-pressed={added}
                  onClick={() => onToggle(part)}
                  aria-label={`${added ? 'Remove' : 'Add'} ${part.name}`}
                >
                  {added ? '✓ Selected' : '+ Add part'}
                </button>
              </div>
            </article>
          )
        })}
        {!filtered.length && (
          <p className="empty">
            No parts match this search. Try another name or category.
          </p>
        )}
      </div>
    </section>
  )
}
PartsCatalog.propTypes = {
  parts: PropTypes.arrayOf(partType).isRequired,
  selected: PropTypes.arrayOf(partType).isRequired,
  onToggle: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}
