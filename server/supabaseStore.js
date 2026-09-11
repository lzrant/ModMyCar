import { createClient } from '@supabase/supabase-js'
export function createSupabaseStore(url, key) {
  if (!url || !key)
    throw new Error(
      'SUPABASE_URL and SUPABASE_ANON_KEY are required in supabase mode.',
    )
  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
  const publicClient = createClient(url, key, options)
  const privateClient = (token) =>
    createClient(url, key, {
      ...options,
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
  const unwrap = ({ data, error }) => {
    if (error) throw error
    return data
  }
  return {
    mode: 'supabase',
    async session(access, refresh) {
      if (access) {
        const { data, error } = await publicClient.auth.getUser(access)
        if (!error && data.user) return { owner: access }
      }
      // Each auth operation owns its client; concurrent users never share session state.
      const auth = createClient(url, key, options).auth
      const result = refresh
        ? await auth.refreshSession({ refresh_token: refresh })
        : await auth.signInAnonymously()
      if (result.error || !result.data.session)
        throw Object.assign(
          new Error(
            'Could not open a private build session. Enable anonymous sign-ins in Supabase.',
          ),
          { status: 401 },
        )
      const session = result.data.session
      return {
        owner: session.access_token,
        access: session.access_token,
        refresh: session.refresh_token,
      }
    },
    async vehicles() {
      return unwrap(
        await publicClient
          .from('vehicles')
          .select('*')
          .order('year', { ascending: false }),
      )
    },
    async parts(vehicleId, category) {
      let query = publicClient
        .from('parts')
        .select('*, compatibility!inner(vehicle_id)')
        .eq('compatibility.vehicle_id', vehicleId)
      if (category) query = query.eq('visual_category', category)
      return unwrap(await query.order('name')).map((part) => {
        delete part.compatibility
        return part
      })
    },
    async listBuilds(token) {
      return unwrap(
        await privateClient(token)
          .from('builds')
          .select('id, vehicle_id, part_ids, paint_color, created_at')
          .order('created_at', { ascending: false }),
      )
    },
    async getBuild(token, id) {
      return unwrap(
        await privateClient(token)
          .from('builds')
          .select('id, vehicle_id, part_ids, paint_color, created_at')
          .eq('id', id)
          .maybeSingle(),
      )
    },
    async saveBuild(token, payload) {
      return unwrap(
        await privateClient(token)
          .from('builds')
          .insert(payload)
          .select('id, vehicle_id, part_ids, paint_color, created_at')
          .single(),
      )
    },
  }
}
