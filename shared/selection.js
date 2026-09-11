import { presetFor } from './renderPresets.js'
/** Replace a conflicting slot, toggle an existing selection, preserve unrelated parts.
 * @param {import('./types.js').Part[]} selected
 * @param {import('./types.js').Part} part
 * @returns {import('./types.js').Part[]}
 */
export function togglePart(selected, part) {
  if (selected.some((p) => p.id === part.id))
    return selected.filter((p) => p.id !== part.id)
  const slot = presetFor(part).slot
  return [...selected.filter((p) => presetFor(p).slot !== slot), part]
}
const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
/** Search is a secondary convenience; it never changes selection implicitly.
 * Prefix/substring token matching accepts part name, category, manufacturer or SKU.
 * @param {import('./types.js').Part[]} parts @param {string} query
 */
export function matchParts(parts, query) {
  const tokens = normalize(query).split(' ').filter(Boolean)
  if (!tokens.length) return parts
  return parts.filter((part) => {
    const haystack = normalize(
      `${part.name} ${part.manufacturer} ${part.visual_category} ${part.sku}`,
    )
    return tokens.every((token) => haystack.includes(token))
  })
}
