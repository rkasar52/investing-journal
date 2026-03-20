import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPositions, deletePosition } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function Positions() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const load = () => {
    getPositions()
      .then((r) => setPositions(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id, ticker) => {
    if (!confirm(`Delete position ${ticker}? This cannot be undone.`)) return
    await deletePosition(id)
    load()
  }

  const filtered = positions.filter((p) =>
    p.ticker.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-slate-500 py-12 text-center">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">All Positions ({positions.length})</h1>
        <button
          onClick={() => navigate('/positions/new')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
        >
          + Add Position
        </button>
      </div>

      <input
        type="text"
        placeholder="Search tickers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500"
      />

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Shares</th>
              <th className="px-4 py-3">Buy Price</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">P/L</th>
              <th className="px-4 py-3">P/L %</th>
              <th className="px-4 py-3">Market Value</th>
              <th className="px-4 py-3">Last News</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const plColor = p.pl >= 0 ? 'text-emerald-400' : 'text-red-400'
              return (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/positions/${p.id}`)}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-bold text-white">{p.ticker}</td>
                  <td className="px-4 py-3 text-slate-300">{p.shares}</td>
                  <td className="px-4 py-3 text-slate-300">{fmt(p.buy_price)}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {p.current_price ? fmt(p.current_price) : '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium ${plColor}`}>
                    {fmt(p.pl)}
                  </td>
                  <td className={`px-4 py-3 font-medium ${plColor}`}>
                    {p.pl_pct >= 0 ? '+' : ''}{p.pl_pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-slate-300">{fmt(p.market_value)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {p.last_news_refresh
                      ? new Date(p.last_news_refresh).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/positions/${p.id}/edit`)}
                        className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.ticker)}
                        className="px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800 text-red-400 rounded"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {positions.length === 0 ? 'No positions yet. Add your first one!' : 'No matches.'}
          </div>
        )}
      </div>
    </div>
  )
}
