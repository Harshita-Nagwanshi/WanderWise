import { supabase, authEnabled } from './supabase'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const LS_KEY = 'wanderwise_trips'

async function request(path, { method = 'GET', body } = {}) {
  let token = null
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    token = data.session?.access_token ?? null
  }
  let res
  try {
    res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error(`Cannot reach the backend at ${API}. Make sure it is running and CORS origins are set.`)
  }
  let data = null
  try { data = await res.json() } catch { /* empty body */ }
  if (!res.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : `Request failed (${res.status})`)
  return data
}

export const generateItinerary = (form) => request('/api/itinerary/generate', { method: 'POST', body: form })

// ---- localStorage fallback (demo mode, no Supabase) ----
const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const lsWrite = (t) => localStorage.setItem(LS_KEY, JSON.stringify(t))

export const trips = {
  async list() {
    return authEnabled ? request('/api/trips') : lsRead()
  },
  async create(trip) {
    if (authEnabled) return request('/api/trips', { method: 'POST', body: trip })
    const row = { ...trip, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    lsWrite([row, ...lsRead()])
    return row
  },
  async update(id, trip) {
    if (authEnabled) return request(`/api/trips/${id}`, { method: 'PUT', body: trip })
    const all = lsRead()
    const i = all.findIndex((t) => t.id === id)
    if (i < 0) throw new Error('Trip not found.')
    all[i] = { ...all[i], ...trip, id }
    lsWrite(all)
    return all[i]
  },
  async remove(id) {
    if (authEnabled) return request(`/api/trips/${id}`, { method: 'DELETE' })
    lsWrite(lsRead().filter((t) => t.id !== id))
    return { deleted: true }
  },
}

export const money = (n, currency = 'INR') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0)
