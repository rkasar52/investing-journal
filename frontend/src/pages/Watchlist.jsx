import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWatchlist, deletePosition } from '../api/client'

function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function Watchlist() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => {
    getWatchlist()
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id, ticker) => {
    if (!confirm(`Remove ${ticker} from watchlist?`)) return
    await deletePosition(id)
    load()
  }

  const filtered = items.filter((p) =>
    p.ticker.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-slate-500 py-12 text-center">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Watchlist ({items.length})</h1>
        <button
          onClick={() => navigate('/watchlist/new')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
        >
          + Add to Watchlist
        </button>
      </div>

      <p className="text-slate-500 text-sm">Stocks you're monitoring but haven't purchased yet. Click to view details, refresh news, or move to your portfolio.</p>

      {items.length > 0 && (
        <input
          type="text"
          placeholder="Search tickers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        />
      )}

      {filtered.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <p className="text-slate-500 text-sm">
            {items.length === 0
              ? "Your watchlist is empty. Add stocks you're researching but haven't bought yet."
              : 'No matches.'}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => navigate('/watchlist/new')}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
            >
              + Add to Watchlist
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => {
            const hasNews = Boolean(p.last_news_refresh)
            const dailyColor = p.daily_change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/positions/${p.id}`)}
                className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-white text-lg">{p.ticker}</span>
                    {p.current_price && (
                      <span className="text-slate-300 text-sm">{fmt(p.current_price)}</span>
                    )}
                    {p.daily_change_pct != null && (
                      <span className={`text-xs font-medium ${dailyColor}`}>
                        {p.daily_change_pct >= 0 ? '+' : ''}{p.daily_change_pct.toFixed(2)}%
                      </span>
                    )}
                    {p.target_price && (
                      <span className="text-slate-500 text-xs">
                        Target: {fmt(p.target_price)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${hasNews ? 'bg-indigo-900/40 text-indigo-400' : 'bg-slate-700 text-slate-500'}`}>
                      {hasNews ? `News: ${new Date(p.last_news_refresh).toLocaleDateString()}` : 'No news yet'}
                    </span>
                    <button
                      onClick={() => navigate(`/positions/${p.id}/edit`)}
                      className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.ticker)}
                      className="px-2 py-1 text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {p.initial_thesis && (
                  <p className="text-slate-500 text-sm mt-2 line-clamp-2 leading-relaxed">
                    {p.initial_thesis}
                  </p>
                )}
                <div className="flex gap-3 mt-2">
                  {p.zacks_rating && <span className="text-xs text-slate-500">Zacks: <span className="text-slate-400">{p.zacks_rating}</span></span>}
                  {p.wsz_rating && <span className="text-xs text-slate-500">WSZ: <span className="text-slate-400">{p.wsz_rating}</span></span>}
                  {p.motley_fool_rating && <span className="text-xs text-slate-500">MF: <span className="text-slate-400">{p.motley_fool_rating}</span></span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
