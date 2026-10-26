import { money } from '../lib/api'

const SLOTS = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']]
const BAR = { accommodation: 'bg-teal-600', food: 'bg-amber-500', activities: 'bg-indigo-500', transport: 'bg-sky-500', miscellaneous: 'bg-slate-400' }

export function SourceBadge({ source }) {
  return source === 'ai'
    ? <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">AI-generated (Groq Llama)</span>
    : <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">Demo-generated, not AI</span>
}

function Budget({ it, budget, currency }) {
  const over = it.total_cost > budget
  const pct = Math.min(100, (it.total_cost / budget) * 100)
  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">Estimated total cost</p>
          <p className="text-3xl font-bold">{money(it.total_cost, currency)}</p>
        </div>
        <p className={`text-sm font-medium ${over ? 'text-red-600' : 'text-teal-700'}`}>
          {over ? `${money(it.total_cost - budget, currency)} over` : `${money(budget - it.total_cost, currency)} under`} your {money(budget, currency)} budget
        </p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${over ? 'bg-red-500' : 'bg-teal-600'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(it.breakdown).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs capitalize text-slate-500"><span className={`h-2 w-2 rounded-full ${BAR[k]}`} />{k}</div>
            <div className="font-semibold">{money(v, currency)}</div>
            <div className="text-xs text-slate-400">{it.total_cost ? Math.round((v / it.total_cost) * 100) : 0}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DayCard({ d, currency }) {
  const fmt = new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <article className="card space-y-4">
      <header className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-lg font-semibold">Day {d.day}: {d.theme}</h3>
          <p className="text-sm text-slate-500">{fmt}</p>
        </div>
        <p className="text-sm text-slate-500">Stay {money(d.accommodation_cost, currency)}</p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        {SLOTS.map(([k, label]) => (
          <div key={k} className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-teal-700">{label}</p>
            <p className="font-medium">{d[k].title}</p>
            <p className="text-sm text-slate-600">{d[k].description}</p>
            <p className="mt-1 text-xs text-slate-500">{money(d[k].cost, currency)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Dining</p>
          <ul className="space-y-1 text-sm">
            {d.dining.map((m, i) => <li key={i}><span className="font-medium">{m.meal}:</span> {m.suggestion} <span className="text-slate-500">({money(m.cost, currency)})</span></li>)}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Transportation</p>
          <p className="text-sm">{d.transport.guidance} <span className="text-slate-500">({money(d.transport.cost, currency)})</span></p>
        </div>
      </div>
      {d.tips.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-600">{d.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
      )}
    </article>
  )
}

export default function TripView({ trip, saved, busy, notice, onBack, onRegenerate, onSave, onEdit, onDelete }) {
  const it = trip.itinerary
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button className="mb-1 text-sm text-teal-700 hover:underline" onClick={onBack}>← Back to dashboard</button>
          <h2 className="text-2xl font-bold">{trip.destination}</h2>
          <p className="text-sm text-slate-500">
            From {trip.origin} · {trip.start_date} to {trip.end_date} · {trip.travelers} traveler{trip.travelers > 1 ? 's' : ''} · <span className="capitalize">{trip.style}</span>
          </p>
          <div className="mt-2"><SourceBadge source={trip.source} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={onRegenerate} disabled={busy}>{busy ? 'Regenerating…' : 'Regenerate'}</button>
          {saved ? <button className="btn-ghost" onClick={onEdit}>Edit</button> : <button className="btn-primary" onClick={onSave} disabled={busy}>Save trip</button>}
          {saved && <button className="btn-danger" onClick={onDelete}>Delete</button>}
        </div>
      </div>
      {!saved && <p className="rounded-lg bg-slate-100 p-2 text-sm">This itinerary is not saved yet. Click “Save trip” to keep it.</p>}
      {notice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
      {it ? (
        <>
          <p className="text-slate-700">{it.summary}</p>
          <Budget it={it} budget={trip.budget} currency={trip.currency} />
          {it.days.map((d) => <DayCard key={d.day} d={d} currency={trip.currency} />)}
          {it.general_tips?.length > 0 && (
            <div className="card">
              <h3 className="mb-2 font-semibold">Travel tips</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">{it.general_tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
        </>
      ) : <p className="card">No itinerary yet. Click Regenerate.</p>}
    </div>
  )
}
