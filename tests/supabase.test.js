import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseStore } from '../server/supabaseStore.js'
// Deliberately non-credential placeholders; every HTTP request is intercepted.
const project = 'https://supabase.example.invalid'
const key = 'NOT_A_CREDENTIAL'
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  is_anonymous: true,
}
const session = {
  user,
  access_token: 'PLACEHOLDER_ACCESS',
  refresh_token: 'PLACEHOLDER_REFRESH',
  expires_in: 3600,
  token_type: 'bearer',
}
function mockTransport(handler) {
  const calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options = {}) => {
      const parsed = new URL(String(url))
      calls.push({ url: parsed, ...options })
      const result = handler(parsed, options)
      return new Response(JSON.stringify(result.body), {
        status: result.status || 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
  return calls
}
afterEach(() => vi.unstubAllGlobals())
describe('Supabase transport adapter', () => {
  it('requires configuration and creates a private anonymous session', async () => {
    expect(() => createSupabaseStore('', '')).toThrow('required')
    const calls = mockTransport(() => ({ body: session }))
    const store = createSupabaseStore(project, key)
    expect(await store.session()).toEqual({
      owner: session.access_token,
      access: session.access_token,
      refresh: session.refresh_token,
    })
    expect(calls[0].url.pathname).toBe('/auth/v1/signup')
  })
  it('validates access tokens and refreshes expired ones with a separate client', async () => {
    const calls = mockTransport((url) =>
      url.pathname.endsWith('/user')
        ? { status: 401, body: { message: 'expired' } }
        : { body: session },
    )
    const store = createSupabaseStore(project, key)
    expect(
      (await store.session('PLACEHOLDER_EXPIRED', 'PLACEHOLDER_REFRESH')).owner,
    ).toBe(session.access_token)
    expect(calls[1].url.searchParams.get('grant_type')).toBe('refresh_token')
    expect(JSON.parse(calls[1].body)).toEqual({
      refresh_token: 'PLACEHOLDER_REFRESH',
    })
  })
  it('reuses a valid user session and reports sign-in failures clearly', async () => {
    mockTransport(() => ({ body: user }))
    const store = createSupabaseStore(project, key)
    expect(await store.session('PLACEHOLDER_ACCESS')).toEqual({
      owner: 'PLACEHOLDER_ACCESS',
    })
    mockTransport(() => ({
      status: 400,
      body: { message: 'anonymous sign-ins disabled' },
    }))
    await expect(store.session()).rejects.toMatchObject({ status: 401 })
  })
  it('queries exact compatibility and forwards per-user auth only for private builds', async () => {
    const calls = mockTransport(() => ({ body: [] }))
    const store = createSupabaseStore(project, key)
    await store.vehicles()
    await store.parts(7, 'wheels')
    await store.listBuilds('PLACEHOLDER_ACCESS')
    expect(calls[1].url.searchParams.get('compatibility.vehicle_id')).toBe(
      'eq.7',
    )
    expect(calls[1].url.searchParams.get('visual_category')).toBe('eq.wheels')
    expect(new Headers(calls[2].headers).get('Authorization')).toBe(
      'Bearer PLACEHOLDER_ACCESS',
    )
    expect(new Headers(calls[0].headers).get('Authorization')).toBe(
      `Bearer ${key}`,
    )
  })
  it('sends the exact save shape, loads by ID and propagates database errors', async () => {
    const payload = { vehicle_id: 7, part_ids: [3], paint_color: '#2876d7' }
    const calls = mockTransport(() => ({
      body: { ...payload, id: '00000000-0000-4000-8000-000000000003' },
    }))
    const store = createSupabaseStore(project, key)
    const saved = await store.saveBuild('PLACEHOLDER_ACCESS', payload)
    expect(JSON.parse(calls[0].body)).toEqual(payload)
    await store.getBuild('PLACEHOLDER_ACCESS', saved.id)
    expect(calls[1].url.searchParams.get('id')).toBe(`eq.${saved.id}`)
    mockTransport(() => ({
      status: 400,
      body: { message: 'constraint violation' },
    }))
    await expect(
      store.saveBuild('PLACEHOLDER_ACCESS', payload),
    ).rejects.toMatchObject({ message: 'constraint violation' })
  })
})
