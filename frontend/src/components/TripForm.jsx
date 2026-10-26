import { useState } from 'react'

const INTERESTS = ['adventure', 'food', 'culture', 'nature', 'shopping', 'sightseeing']
const STYLES = ['budget', 'balanced', 'luxury']
const today = () => new Date().toISOString().slice(0, 10)

export default function TripForm({ initial, onSubmit, busy, submitLabel, showRegenerate }) {
  const [f, setF] = useState({
    destination: '', origin: '', start_date: today(), end_date: today(), travelers: 2, budget: 50000,
    currency: 'INR', style: 'balanced', interests: ['sightseeing', 'food'], ...(initial || {}),
  })
  const [regen, setRegen] = useState(true)
  const [error, setError] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const toggle = (i) => set('interests', f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i])

  function submit(e) {
    e.preventDefault()
    const days = (new Date(f.end_date) - new Date(f.start_date)) / 86400000 + 1
    if (f.destination.trim().length < 2) return setError('Enter a destination.')
    if (f.origin.trim().length < 2) return setError('Enter your starting location.')
    if (!f.start_date || !f.end_date) return setError('Choose start and end dates.')
    if (days < 1) return setError('End date must be on or after the start date.')
    if (days > 14) return setError('Trips are limited to 14 days.')
    if (!(Number(f.travelers) >= 1 && Number(f.travelers) <= 20)) return setError('Travelers must be between 1 and 20.')
    if (!(Number(f.budget) > 0)) return setError('Enter a budget greater than 0.')
    if (f.interests.length === 0) return setError('Pick at least one interest.')
    setError('')
    onSubmit({ ...f, destination: f.destination.trim(), origin: f.origin.trim(), travelers: Number(f.travelers), budget: Number(f.budget) }, regen)
  }

  return (
    <form onSubmit={submit} className="card space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="dest">Destination</label>
          <input id="dest" className="input" placeholder="e.g. Goa, India" value={f.destination} onChange={(e) => set('destination', e.target.value)} /></div>
        <div><label className="label" htmlFor="orig">Starting location</label>
          <input id="orig" className="input" placeholder="e.g. Indore" value={f.origin} onChange={(e) => set('origin', e.target.value)} /></div>
        <div><label className="label" htmlFor="sd">Start date</label>
          <input id="sd" type="date" className="input" value={f.start_date} onChange={(e) => set('start_date', e.target.value)} /></div>
        <div><label className="label" htmlFor="ed">End date</label>
          <input id="ed" type="date" className="input" min={f.start_date} value={f.end_date} onChange={(e) => set('end_date', e.target.value)} /></div>
        <div><label className="label" htmlFor="tr">Travelers</label>
          <input id="tr" type="number" min="1" max="20" className="input" value={f.travelers} onChange={(e) => set('travelers', e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2"><label className="label" htmlFor="bd">Total budget</label>
            <input id="bd" type="number" min="1" className="input" value={f.budget} onChange={(e) => set('budget', e.target.value)} /></div>
          <div><label className="label" htmlFor="cur">Currency</label>
            <select id="cur" className="input" value={f.currency} onChange={(e) => set('currency', e.target.value)}>
              {['INR', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}
            </select></div>
        </div>
      </div>

      <fieldset>
        <legend className="label">Travel style</legend>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <label key={s} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm capitalize ${f.style === s ? 'border-teal-700 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white'}`}>
              <input type="radio" className="sr-only" name="style" checked={f.style === s} onChange={() => set('style', s)} />{s}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <label key={i} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm capitalize ${f.interests.includes(i) ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-300 bg-white'}`}>
              <input type="checkbox" className="sr-only" checked={f.interests.includes(i)} onChange={() => toggle(i)} />{i}
            </label>
          ))}
        </div>
      </fieldset>

      {showRegenerate && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={regen} onChange={(e) => setRegen(e.target.checked)} /> Regenerate itinerary with these changes
        </label>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? 'Working… this can take up to a minute' : submitLabel}</button>
    </form>
  )
}
