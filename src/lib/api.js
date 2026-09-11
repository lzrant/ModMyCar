const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
async function request(path, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  const external = options.signal
  const abort = () => controller.abort()
  external?.addEventListener('abort', abort, { once: true })
  if (external?.aborted) controller.abort()
  try {
    const response = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
    const data = await response.json()
    if (!response.ok)
      throw new Error(data.error || `Request failed (${response.status}).`)
    return data
  } catch (error) {
    if (error.name === 'AbortError' && external?.aborted) throw error
    if (error.name === 'AbortError')
      throw new Error('The API took too long to respond. Please try again.')
    if (error instanceof TypeError || error instanceof SyntaxError)
      throw new Error(
        'Cannot reach the API. Start frontend and backend with npm run dev.',
      )
    throw error
  } finally {
    clearTimeout(timeout)
    external?.removeEventListener('abort', abort)
  }
}
export const api = {
  health: (signal) => request('/health', { signal }),
  vehicles: (signal) => request('/vehicles', { signal }),
  parts: (id, signal) => request(`/vehicles/${id}/parts`, { signal }),
  builds: (signal) => request('/builds', { signal }),
  loadBuild: (id) => request(`/builds/${encodeURIComponent(id)}`),
  saveBuild: (payload) =>
    request('/builds', { method: 'POST', body: JSON.stringify(payload) }),
}
