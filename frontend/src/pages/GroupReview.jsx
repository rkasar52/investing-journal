import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReviewGroup, refreshNews, finishReviewGroup, refreshPositionPrice } from '../api/client'
import ReactMarkdown from 'react-markdown'

function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function PLBadge({ pl, plPct }) {
  const color = pl >= 0 ? 'text-emerald-400 bg-emerald-900/30' : 'text-red-400 bg-red-900/30'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {pl >= 0 ? '+' : ''}{plPct?.toFixed(1)}%
    </span>
  )
}

function PositionCard({ position, onRefreshNews, onRefreshPrice }) {
  const [loading, setLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [newsData, setNewsData] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const handleRefreshNews = async () => {
    setLoading(true)
    try {
      const res = await onRefreshNews(position.id)
      setNewsData(res)
      setExpanded(true)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshPrice = async () => {
    setPriceLoading(true)
    try {
      await onRefreshPrice(position.id)
    } finally {
      setPriceLoading(false)
    }
  }

  const hasNewsToday = position.last_news_refresh
    ? position.last_news_refresh.startsWith(new Date().toISOString().split('T')[0])
    : false

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="font-mono font-bold text-lg text-white cursor-pointer hover:text-indigo-400"
                onClick={() => navigate(`/positions/${position.id}`)}
              >
                {position.ticker}
              </span>
              <PLBadge pl={position.pl} plPct={position.pl_pct} />
              {hasNewsToday && (
                <span className="px-2 py-0.5 text-xs bg-emerald-900/40 text-emerald-400 rounded-full">
                  ✓ Reviewed
                </span>
              )}
            </div>
            <div className="text-slate-400 text-xs mt-0.5 flex gap-3">
              <span>{position.shares} shares</span>
              <span>Avg: {fmt(position.buy_price)}</span>
              <span>Now: {fmt(position.current_price)}</span>
              <span className={position.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                P/L: {fmt(position.pl)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshPrice}
            disabled={priceLoading}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md disabled:opacity-50"
          >
            {priceLoading ? '...' : '↻ Price'}
          </button>
          <button
            onClick={handleRefreshNews}
            disabled={loading}
            className={`px-4 py-1.5 text-xs rounded-md font-medium transition-colors ${
              loading
                ? 'bg-indigo-800 text-indigo-300 opacity-70 cursor-wait'
                : hasNewsToday
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {loading ? 'Fetching news...' : hasNewsToday ? '↻ Re-fetch News' : 'Fetch News'}
          </button>
          {(newsData || position.last_news_refresh) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-400 rounded-md"
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {/* Thesis */}
      {position.initial_thesis && (
        <div className="px-5 pb-3">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Your Thesis</p>
          <p className="text-slate-400 text-sm line-clamp-2">{position.initial_thesis}</p>
        </div>
      )}

      {/* News analysis panel */}
      {expanded && newsData && (
        <div className="border-t border-slate-700 px-5 py-4 bg-slate-900/50">
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Latest News</p>
              <div className="prose prose-sm prose-invert max-w-none text-slate-300">
                <ReactMarkdown>{newsData.news_content}</ReactMarkdown>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Thesis Analysis</p>
              <div className="prose prose-sm prose-invert max-w-none text-slate-300">
                <ReactMarkdown>{newsData.thesis_analysis}</ReactMarkdown>
              </div>
            </div>
            {newsData.citations?.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Sources</p>
                <div className="flex flex-wrap gap-2">
                  {newsData.citations.slice(0, 5).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline truncate max-w-xs"
                    >
                      {new URL(url).hostname}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <p className="text-slate-600 text-xs">
              Fetched: {new Date(newsData.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GroupReview() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [positionNews, setPositionNews] = useState({})

  const load = () => {
    getReviewGroup(groupId)
      .then((r) => {
        setGroup(r.data)
        setPositions(r.data.positions || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [groupId])

  const handleRefreshNews = async (pid) => {
    const res = await refreshNews(pid)
    // Update position's last_news_refresh locally
    setPositions((prev) =>
      prev.map((p) =>
        p.id === pid
          ? { ...p, last_news_refresh: res.data.created_at }
          : p
      )
    )
    return res.data
  }

  const handleRefreshPrice = async (pid) => {
    const res = await refreshPositionPrice(pid)
    setPositions((prev) =>
      prev.map((p) =>
        p.id === pid ? { ...p, current_price: res.data.current_price } : p
      )
    )
  }

  const handleFinish = async () => {
    if (!confirm('Mark this group as reviewed? It will move to the bottom of the queue.')) return
    setFinishing(true)
    try {
      await finishReviewGroup(groupId)
      navigate('/review')
    } finally {
      setFinishing(false)
    }
  }

  const reviewedCount = positions.filter((p) => {
    if (!p.last_news_refresh) return false
    return p.last_news_refresh.startsWith(new Date().toISOString().split('T')[0])
  }).length

  if (loading) return <div className="text-slate-500 py-12 text-center">Loading...</div>
  if (!group) return <div className="text-slate-500 py-12 text-center">Group not found.</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/review')}
              className="text-slate-500 hover:text-slate-300 text-sm"
            >
              ← Queue
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white">{group.name}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {positions.length} stocks · Due: {group.review_by_date} ·{' '}
            <span className="text-emerald-400 font-medium">
              {reviewedCount}/{positions.length} reviewed today
            </span>
          </p>
        </div>
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {finishing ? 'Finishing...' : '✓ Finish Review'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Review progress</span>
          <span>{reviewedCount} / {positions.length}</span>
        </div>
        <div className="bg-slate-700 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${positions.length ? (reviewedCount / positions.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Position cards */}
      <div className="space-y-4">
        {positions.map((p) => (
          <PositionCard
            key={p.id}
            position={p}
            onRefreshNews={handleRefreshNews}
            onRefreshPrice={handleRefreshPrice}
          />
        ))}
      </div>

      {/* Finish button at bottom too */}
      <div className="flex justify-end pt-4 border-t border-slate-800">
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {finishing ? 'Finishing...' : '✓ Finish Review — Move to Bottom of Queue'}
        </button>
      </div>
    </div>
  )
}
