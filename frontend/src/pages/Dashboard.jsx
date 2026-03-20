import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getDailyBrief, refreshDailyBrief } from '../api/client'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtPct(n) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [brief, setBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboard().then((r) => setData(r.data)).catch(console.error)
    getDailyBrief().then((r) => setBrief(r.data)).catch(console.error)
  }, [])

  const handleRefreshBrief = async () => {
    setBriefLoading(true)
    try {
      const r = await refreshDailyBrief()
      setBrief(r.data)
    } catch (e) {
      alert('Failed to refresh brief: ' + (e.response?.data?.error || e.message))
    } finally {
      setBriefLoading(false)
    }
  }

  if (!data) {
    return <div className="flex items-center justify-center h-48 text-slate-500">Loading...</div>
  }

  const plColor = data.total_pl >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Portfolio Overview</h1>
        <button
          onClick={() => navigate('/chat')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          💬 Ask AI
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Positions" value={data.pos_count} />
        <StatCard label="Total Cost" value={fmt(data.total_cost)} />
        <StatCard label="Market Value" value={fmt(data.total_value)} />
        <StatCard
          label="Unrealized P/L"
          value={fmt(data.total_pl)}
          sub={fmtPct(data.total_pl_pct)}
          color={plColor}
        />
      </div>

      {/* Win/loss + Next review */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400 text-sm mb-3">Positions at a Glance</p>
          <div className="flex gap-6">
            <div>
              <span className="text-emerald-400 text-xl font-bold">{data.winners}</span>
              <span className="text-slate-500 text-sm ml-2">Winners</span>
            </div>
            <div>
              <span className="text-red-400 text-xl font-bold">{data.losers}</span>
              <span className="text-slate-500 text-sm ml-2">Losers</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400 text-sm mb-2">Next Review Due</p>
          {data.next_review_group ? (
            <div>
              <p className="text-white font-semibold">{data.next_review_group.name}</p>
              <p className="text-slate-400 text-sm">
                Due: {data.next_review_group.review_by_date} · {data.next_review_group.position_count} stocks
              </p>
              <button
                onClick={() => navigate(`/review/${data.next_review_group.id}`)}
                className="mt-2 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md"
              >
                Start Review →
              </button>
            </div>
          ) : (
            <div>
              <p className="text-slate-500 text-sm mb-2">No review groups set up yet.</p>
              <button
                onClick={() => navigate('/review')}
                className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md"
              >
                Set Up Review Queue →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Today's movers */}
      {(data.daily_winners?.length > 0 || data.daily_losers?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MoverTable title="Today's Gainers" rows={data.daily_winners} color="text-emerald-400" field="daily_change_pct" navigate={navigate} />
          <MoverTable title="Today's Losers" rows={data.daily_losers} color="text-red-400" field="daily_change_pct" navigate={navigate} />
        </div>
      )}

      {/* All-time top gainers/losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MoverTable title="All-Time Top Gainers" rows={data.top_gainers} color="text-emerald-400" field="pl_pct" navigate={navigate} />
        <MoverTable title="All-Time Top Losers" rows={data.top_losers} color="text-red-400" field="pl_pct" navigate={navigate} />
      </div>

      {/* Daily Brief */}
      <DailyBriefSection brief={brief} loading={briefLoading} onRefresh={handleRefreshBrief} />
    </div>
  )
}

function MoverTable({ title, rows, color, field, navigate }) {
  if (!rows?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <p className="text-slate-400 text-sm mb-3">{title}</p>
      <div className="space-y-2">
        {rows.map((p) => {
          const val = p[field]
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/positions/${p.id}`)}
              className="flex items-center justify-between cursor-pointer hover:bg-slate-700/50 px-2 py-1.5 rounded-md transition-colors"
            >
              <span className="font-mono font-semibold text-white">{p.ticker}</span>
              <span className={`text-sm font-medium ${color}`}>
                {val >= 0 ? '+' : ''}{val?.toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DailyBriefSection({ brief, loading, onRefresh }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Daily Brief</h2>
          <p className="text-slate-500 text-xs">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          {brief && (
            <span className="text-slate-600 text-xs">
              Updated {new Date(brief.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Fetching...' : brief ? '↻ Refresh' : '✦ Fetch Today\'s Brief'}
          </button>
        </div>
      </div>

      {!brief && !loading && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <p className="text-slate-500 text-sm">No brief yet for today.</p>
          <p className="text-slate-600 text-xs mt-1">Click "Fetch Today's Brief" to get curated news relevant to your portfolio.</p>
        </div>
      )}

      {loading && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <p className="text-slate-500 text-sm animate-pulse">Searching for news relevant to your portfolio...</p>
        </div>
      )}

      {brief && !loading && (
        <div className="space-y-4">
          {/* Market summary */}
          {brief.market_summary && (
            <div className="bg-slate-800 border border-indigo-500/20 rounded-xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Market Summary</p>
              <p className="text-slate-300 text-sm leading-relaxed">{brief.market_summary}</p>
            </div>
          )}

          {/* Articles */}
          {brief.articles?.length > 0 && (
            <div className="space-y-3">
              {brief.articles.map((article, i) => (
                <ArticleCard key={i} article={article} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ArticleCard({ article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium group-hover:text-indigo-300 transition-colors leading-snug">
            {article.title}
          </p>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">{article.summary}</p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {article.relevance && (
            <span className="px-2 py-0.5 bg-indigo-900/40 text-indigo-400 text-xs rounded-md border border-indigo-800/50 whitespace-nowrap">
              {article.relevance}
            </span>
          )}
          {article.source && (
            <span className="text-slate-600 text-xs">{article.source}</span>
          )}
        </div>
      </div>
    </a>
  )
}
