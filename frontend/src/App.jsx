import { useCallback, useEffect, useState } from 'react'
import { authEnabled, supabase } from './lib/supabase'
import { generateItinerary, trips as tripApi } from './lib/api'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import TripForm from './components/TripForm'
import TripView from './components/TripView'

const FIELDS = ['destination', 'origin', 'start_date', 'end_date', 'travelers', 'budget', 'currency', 'style', 'interests']
const pick = (t) => Object.fromEntries(FIELDS.map((k) => [k, t[k]]))
const payload = (t) => ({ ...pick(t), itinerary: t.itinerary, source: t.source })

export default function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!authEnabled)
  const [view, setView] = useState('dashboard') // dashboard | new | trip | edit
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(null) // trip being viewed/edited (has id when saved)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!authEnabled) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const signedIn = !authEnabled || Boolean(session)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setList(await tripApi.list()) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (signedIn && ready) load() }, [signedIn, ready, load])

  const go = (v, trip = null) => { setView(v); setCurrent(trip); setError(''); setNotice('') }

  async function createAndGenerate(form) {
    setBusy(true); setError('')
    try {
      const r = await generateItinerary(form)
      setCurrent({ ...form, itinerary: r.itinerary, source: r.source })
      setNotice(r.notice || ''); setView('trip')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function regenerate() {
    setBusy(true); setError(''); setNotice('')
    try {
      const r = await generateItinerary({ ...pick(current), variation: Math.floor(Math.random() * 100000) })
      const next = { ...current, itinerary: r.itinerary, source: r.source }
      if (current.id) await tripApi.update(current.id, payload(next))
      setCurrent(next); setNotice(r.notice || '')
      if (current.id) load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function save() {
    setBusy(true); setError('')
    try { const saved = await tripApi.create(payload(current)); setCurrent(saved); setNotice('Trip saved.'); load() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function saveEdit(form, regen) {
    setBusy(true); setError('')
    try {
      let next = { ...current, ...form }
      if (regen) {
        const r = await generateItinerary(form)
        next = { ...next, itinerary: r.itinerary, source: r.source }
        setNotice(r.notice || '')
      }
      const saved = await tripApi.update(current.id, payload(next))
      setCurrent(saved); setView('trip'); load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function remove(t) {
    if (!window.confirm(`Delete trip to ${t.destination}? This cannot be undone.`)) return
    try { await tripApi.remove(t.id); if (current?.id === t.id) go('dashboard'); load() }
    catch (e) { setError(e.message) }
  }

  if (!ready) return <p className="p-8 text-slate-500">Loading…</p>
  if (!signedIn) return <Auth />

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button className="text-xl font-bold text-teal-800" onClick={() => go('dashboard')}>WanderWise</button>
          {authEnabled && (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-slate-500 sm:inline">{session.user.email}</span>
              <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
            </div>
          )}
        </div>
        {!authEnabled && (
          <p className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
            Demo mode: sign-in is unavailable because Supabase is not configured. Trips are saved only in this browser (localStorage).
          </p>
        )}
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {error && view !== 'dashboard' && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {view === 'dashboard' && (
          <Dashboard trips={list} loading={loading} error={error} onNew={() => go('new')}
            onOpen={(t) => go('trip', t)} onEdit={(t) => go('edit', t)} onDelete={remove} />
        )}
        {view === 'new' && (
          <div className="space-y-4">
            <button className="text-sm text-teal-700 hover:underline" onClick={() => go('dashboard')}>← Back to dashboard</button>
            <h2 className="text-2xl font-bold">Plan a new trip</h2>
            <TripForm onSubmit={createAndGenerate} busy={busy} submitLabel="Generate itinerary" />
          </div>
        )}
        {view === 'edit' && current && (
          <div className="space-y-4">
            <button className="text-sm text-teal-700 hover:underline" onClick={() => go('trip', current)}>← Cancel</button>
            <h2 className="text-2xl font-bold">Edit trip</h2>
            <TripForm initial={current} onSubmit={saveEdit} busy={busy} submitLabel="Save changes" showRegenerate />
          </div>
        )}
        {view === 'trip' && current && (
          <TripView trip={current} saved={Boolean(current.id)} busy={busy} notice={notice}
            onBack={() => go('dashboard')} onRegenerate={regenerate} onSave={save}
            onEdit={() => { setNotice(''); setView('edit') }} onDelete={() => remove(current)} />
        )}
      </main>
    </div>
  )
}
