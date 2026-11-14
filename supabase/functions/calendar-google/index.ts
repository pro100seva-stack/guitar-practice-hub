import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.2'
import { createCalendarHandler, type CalendarStore, type ConnectionRow, type StateRow } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const client = url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null
function admin() { if (!client) throw new Error('Calendar service unavailable'); return client }
function checked<T>(result: { data: T; error: unknown }): T { if (result.error) throw new Error('Calendar storage unavailable'); return result.data }
const store: CalendarStore = {
  async budget(uid, action) { return checked(await admin().rpc('consume_calendar_google_budget', { p_user_id: uid, p_action: action })) === true },
  async connection(uid) { return checked(await admin().from('calendar_google_connections').select('*').eq('user_id', uid).maybeSingle()) as ConnectionRow | null },
  async ensureConnection(uid) {
    checked(await admin().from('calendar_google_connections').upsert({ user_id: uid }, { onConflict: 'user_id', ignoreDuplicates: true }))
    const result = await this.connection(uid)
    if (!result) throw new Error('Calendar storage unavailable')
    return result
  },
  async updateConnection(uid, generation, patch) {
    const rows = checked(await admin().from('calendar_google_connections').update(patch).eq('user_id', uid).eq('generation', generation).select('user_id'))
    return rows?.length === 1
  },
  async createState(state) {
    checked(await admin().from('calendar_google_oauth_states').delete().eq('user_id', state.user_id).lt('expires_at', new Date().toISOString()))
    checked(await admin().from('calendar_google_oauth_states').insert(state))
  },
  async consumeState(hash, uid, origin, now) {
    // DELETE RETURNING consumes the nonce atomically, before exchanging its code.
    return checked(await admin().from('calendar_google_oauth_states').delete().eq('state_hash', hash).eq('user_id', uid).eq('origin', origin).gt('expires_at', now).select('*').maybeSingle()) as StateRow | null
  },
  async clearStates(uid) { checked(await admin().from('calendar_google_oauth_states').delete().eq('user_id', uid)) },
}
Deno.serve(createCalendarHandler({
  config: {
    clientId: Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID') ?? '', clientSecret: Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET') ?? '',
    encryptionKey: Deno.env.get('CALENDAR_TOKEN_ENCRYPTION_KEY') ?? '', allowedOrigins: Deno.env.get('CALENDAR_ALLOWED_ORIGINS') ?? '',
  },
  store,
  async authenticate(request) {
    const authorization = request.headers.get('Authorization') ?? ''
    if (!authorization.startsWith('Bearer ') || !client) return null
    // Auth server validation, never caller IDs or an unverified JWT decode.
    const { data, error } = await client.auth.getUser(authorization.slice(7))
    return error ? null : data.user?.id ?? null
  },
}))
