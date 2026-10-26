import { money } from '../lib/api'
import { SourceBadge } from './TripView'

export default function Dashboard({ trips, loading, error, onNew, onOpen, onEdit, onDelete }) {
  const upcoming = trips.filter((t) => t.end_date >= new Date().toISOString().slice(0, 10)).length
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-bold">Your trips</h2><p className="text-sm text-slate-500">Plan, save and revisit your itineraries.</p></div>
        <button className="btn-primary" onClick={onNew}>Plan a new trip</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="text-sm text-slate-500">Saved trips</p><p className="text-2xl font-bold">{trips.length}</p></div>
        <div className="card"><p className="text-sm text-slate-500">Upcoming</p><p className="text-2xl font-bold">{upcoming}</p></div>
        <div className="card"><p className="text-sm text-slate-500">AI-generated itineraries</p><p className="text-2xl font-bold">{trips.filter((t) => t.source === 'ai').length}</p></div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-slate-500">Loading trips…</p> : trips.length === 0 ? (
        <div className="card text-center"><p className="mb-3 text-slate-600">No trips yet. Create your first itinerary.</p><button className="btn-primary" onClick={onNew}>Plan a new trip</button></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <div key={t.id} className="card flex flex-col gap-2">
              <button className="text-left" onClick={() => onOpen(t)}>
                <h3 className="text-lg font-semibold hover:text-teal-700">{t.destination}</h3>
                <p className="text-sm text-slate-500">{t.start_date} to {t.end_date} · {t.travelers} traveler{t.travelers > 1 ? 's' : ''}</p>
                <p className="text-sm">Budget {money(t.budget, t.currency)}{t.itinerary ? ` · Est. ${money(t.itinerary.total_cost, t.currency)}` : ''}</p>
              </button>
              <SourceBadge source={t.source} />
              <div className="mt-auto flex gap-2 pt-2">
                <button className="btn-ghost flex-1" onClick={() => onOpen(t)}>View</button>
                <button className="btn-ghost flex-1" onClick={() => onEdit(t)}>Edit</button>
                <button className="btn-danger" onClick={() => onDelete(t)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
