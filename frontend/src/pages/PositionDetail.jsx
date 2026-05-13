import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPosition, refreshNews, addThesisUpdate, refreshPositionPrice, refreshRatings, addNote, deleteNote, moveToPortfolio, positionChat, researchGoal } from '../api/client'
import ReactMarkdown from 'react-markdown'

function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function NewsChat({ positionId }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setSending(true)
    try {
      const res = await positionChat(positionId, userMsg.content, messages)
      setMessages((m) => [...m, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }])
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-2 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-700/50 hover:border-indigo-500 rounded-lg transition-colors w-fit"
      >
        <span>💬</span> Chat about this analysis
      </button>
    )
  }

  return (
    <div className="mt-4 border border-indigo-700/40 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-indigo-950/40 border-b border-indigo-700/40">
        <span className="text-indigo-300 text-xs font-medium">💬 Chat about this analysis</span>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-500 hover:text-slate-300 text-xs"
        >
          close
        </button>
      </div>

      {/* Message thread */}
      <div className="max-h-80 overflow-y-auto p-4 space-y-3 bg-slate-900/40">
        {messages.length === 0 && (
          <p className="text-slate-500 text-xs text-center py-4">
            Ask a follow-up question about the news or thesis above...
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl">
              <span className="text-slate-500 text-xs animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex gap-2 p-3 border-t border-slate-700/50 bg-slate-900/20">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up..."
          disabled={sending}
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}

const RATING_COLORS = {
  'Strong Buy':       'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  'Buy':              'bg-green-900/40 text-green-400 border-green-800',
  'Very Bullish':     'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  'Bullish':          'bg-green-900/40 text-green-400 border-green-800',
  'Stock Advisor Buy':'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  'Rule Breakers Buy':'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  'Both Picks':       'bg-emerald-900/60 text-emerald-200 border-emerald-600',
  'Hold':             'bg-slate-700/60 text-slate-300 border-slate-600',
  'Neutral':          'bg-slate-700/60 text-slate-300 border-slate-600',
  'Watch':            'bg-amber-900/40 text-amber-400 border-amber-800',
  'Sell':             'bg-red-900/40 text-red-400 border-red-800',
  'Strong Sell':      'bg-red-900/60 text-red-300 border-red-700',
  'Bearish':          'bg-red-900/40 text-red-400 border-red-800',
  'Very Bearish':     'bg-red-900/60 text-red-300 border-red-700',
  'Not Recommended':  'bg-red-900/40 text-red-400 border-red-800',
}

function RatingBadge({ label, value, notes }) {
  const colorClass = value ? (RATING_COLORS[value] || 'bg-slate-700 text-slate-300 border-slate-600') : ''
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-slate-500 text-xs">{label}</span>
      {value ? (
        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md border w-fit ${colorClass}`}>
          {value}
        </span>
      ) : (
        <span className="text-slate-600 text-xs italic">Not set</span>
      )}
      {notes && (
        <p className="text-slate-400 text-xs leading-relaxed">{notes}</p>
      )}
    </div>
  )
}

const ACTION_COLORS = {
  HOLD: 'bg-blue-900/40 text-blue-400',
  ADD: 'bg-emerald-900/40 text-emerald-400',
  TRIM: 'bg-amber-900/40 text-amber-400',
  EXIT: 'bg-red-900/40 text-red-400',
}

export default function PositionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [position, setPosition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const [ratingsFeedback, setRatingsFeedback] = useState(null)
  const [showThesisForm, setShowThesisForm] = useState(false)
  const [thesisForm, setThesisForm] = useState({ update_text: '', rating: '', action: 'HOLD' })
  const [noteText, setNoteText] = useState('')
  const [noteSubmitting, setNoteSubmitting] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveForm, setMoveForm] = useState({ buy_price: '', shares: '', buy_date: new Date().toISOString().split('T')[0] })
  const [moveLoading, setMoveLoading] = useState(false)
  const [goalResearch, setGoalResearch] = useState(null)
  const [goalResearching, setGoalResearching] = useState(false)

  const load = () => {
    getPosition(id)
      .then((r) => setPosition(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleRefreshNews = async () => {
    setNewsLoading(true)
    try {
      await refreshNews(id)
      load()
    } finally {
      setNewsLoading(false)
    }
  }

  const handleRefreshRatings = async () => {
    setRatingsLoading(true)
    setRatingsFeedback(null)
    try {
      const res = await refreshRatings(id)
      setRatingsFeedback(res.data.zacks_fetched ? 'Zacks updated automatically.' : 'Zacks unavailable — update manually.')
      load()
    } finally {
      setRatingsLoading(false)
    }
  }

  const handleRefreshPrice = async () => {
    setPriceLoading(true)
    try {
      await refreshPositionPrice(id)
      load()
    } finally {
      setPriceLoading(false)
    }
  }

  const handleResearchGoal = async () => {
    setGoalResearching(true)
    setGoalResearch(null)
    try {
      const res = await researchGoal(id)
      setGoalResearch(res.data.research)
    } catch {
      setGoalResearch('Failed to fetch research. Try again.')
    } finally {
      setGoalResearching(false)
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!noteText.trim()) return
    setNoteSubmitting(true)
    try {
      await addNote(id, noteText.trim())
      setNoteText('')
      load()
    } finally {
      setNoteSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return
    await deleteNote(id, noteId)
    load()
  }

  const handleMoveToPortfolio = async (e) => {
    e.preventDefault()
    setMoveLoading(true)
    try {
      await moveToPortfolio(id, {
        buy_price: parseFloat(moveForm.buy_price),
        shares: parseFloat(moveForm.shares),
        buy_date: moveForm.buy_date,
      })
      navigate('/positions')
    } finally {
      setMoveLoading(false)
    }
  }

  const handleAddThesis = async (e) => {
    e.preventDefault()
    await addThesisUpdate(id, {
      update_text: thesisForm.update_text,
      rating: thesisForm.rating ? parseInt(thesisForm.rating) : null,
      action: thesisForm.action,
    })
    setThesisForm({ update_text: '', rating: '', action: 'HOLD' })
    setShowThesisForm(false)
    load()
  }

  if (loading) return <div className="text-slate-500 py-12 text-center">Loading...</div>
  if (!position) return <div className="text-slate-500 py-12 text-center">Position not found.</div>

  const plColor = position.pl >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/positions')} className="text-slate-500 hover:text-slate-300 text-sm mb-2 block">
            ← All Positions
          </button>
          <h1 className="text-3xl font-bold text-white font-mono">
            {position.ticker}
            {position.is_watchlist && (
              <span className="ml-3 px-2 py-0.5 text-xs bg-amber-900/40 text-amber-400 border border-amber-700 rounded-full align-middle">
                Watchlist
              </span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshPrice}
            disabled={priceLoading}
            className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg disabled:opacity-50"
          >
            {priceLoading ? '...' : '↻ Price'}
          </button>
          <button
            onClick={handleRefreshNews}
            disabled={newsLoading}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50"
          >
            {newsLoading ? 'Fetching...' : 'Fetch Latest News'}
          </button>
          <button
            onClick={() => navigate(`/positions/${id}/edit`)}
            className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
          >
            Edit
          </button>
          {position.is_watchlist && (
            <button
              onClick={() => setShowMoveModal(true)}
              className="px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg"
            >
              ✓ Move to Portfolio
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Shares', value: position.shares },
          { label: 'Avg Cost', value: fmt(position.buy_price) },
          { label: 'Current Price', value: fmt(position.current_price) },
          {
            label: 'P/L',
            value: `${fmt(position.pl)} (${position.pl_pct >= 0 ? '+' : ''}${position.pl_pct?.toFixed(1)}%)`,
            color: plColor,
          },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">{s.label}</p>
            <p className={`font-semibold ${s.color || 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Target */}
      {(position.target_price || position.goal_note || position.retirement_hold) && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Target & Goals</p>
          {position.retirement_hold && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 text-xs rounded-full mb-2">
              🏖 Retirement Hold
            </span>
          )}
          {position.target_price && (
            <p className="text-slate-300 text-sm">
              Target Price: <span className="text-white font-medium">{fmt(position.target_price)}</span>
              {!position.retirement_hold && position.target_date && ` by ${position.target_date}`}
            </p>
          )}
          {position.goal_note && (
            <p className="text-slate-400 text-sm mt-1">{position.goal_note}</p>
          )}
        </div>
      )}

      {/* No-goal research panel */}
      {!position.retirement_hold && !position.target_price && !position.goal_note && (
        <div className="bg-slate-800/60 border border-dashed border-slate-600 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-slate-300 text-sm font-medium">No goal set for this position</p>
              <p className="text-slate-500 text-xs mt-0.5">
                Not sure what you're holding for? Get AI research on analyst targets,
                long-term growth drivers, and a suggested exit framework.
              </p>
            </div>
            <button
              onClick={handleResearchGoal}
              disabled={goalResearching}
              className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
            >
              {goalResearching ? 'Researching...' : '🔍 Research my goal'}
            </button>
          </div>

          {goalResearch && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="prose prose-sm prose-invert max-w-none text-slate-300">
                <ReactMarkdown>{goalResearch}</ReactMarkdown>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700 flex items-center gap-3">
                <p className="text-slate-500 text-xs flex-1">
                  Use this to set your target price and goal below.
                </p>
                <button
                  onClick={() => navigate(`/positions/${id}/edit`)}
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  Set my goal →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analyst Ratings */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Analyst Ratings</p>
          <div className="flex items-center gap-2">
            {ratingsFeedback && (
              <span className="text-xs text-slate-400">{ratingsFeedback}</span>
            )}
            <button
              onClick={handleRefreshRatings}
              disabled={ratingsLoading}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg disabled:opacity-50"
            >
              {ratingsLoading ? '...' : '↻ Auto-fetch Zacks'}
            </button>
            <button
              onClick={() => navigate(`/positions/${id}/edit`)}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
            >
              Edit Ratings
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <RatingBadge label="Zacks" value={position.zacks_rating} notes={position.zacks_notes} />
          <RatingBadge label="Wall Street Zen" value={position.wsz_rating} notes={position.wsz_notes} />
          <RatingBadge label="Motley Fool" value={position.motley_fool_rating} notes={position.motley_fool_notes} />
        </div>

        {position.ratings_updated && (
          <p className="text-slate-600 text-xs mt-3">
            Last updated: {new Date(position.ratings_updated).toLocaleString()}
          </p>
        )}
      </div>

      {/* Investment Thesis */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Investment Thesis</p>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
          {position.initial_thesis || 'No thesis recorded.'}
        </p>
      </div>

      {/* Quick Notes Log */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Quick Notes</h2>

        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Quick observation, something you heard, a reminder..."
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={noteSubmitting || !noteText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-50 whitespace-nowrap"
          >
            {noteSubmitting ? '...' : '+ Add'}
          </button>
        </form>

        {position.notes?.length > 0 ? (
          <div className="space-y-2">
            {position.notes.map((n) => (
              <div key={n.id} className="flex items-start gap-3 bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3">
                <span className="text-slate-500 text-xs whitespace-nowrap mt-0.5 font-mono">
                  {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <p className="text-slate-300 text-sm flex-1 leading-relaxed">{n.note_text}</p>
                <button
                  onClick={() => handleDeleteNote(n.id)}
                  className="text-slate-600 hover:text-red-400 text-xs transition-colors ml-2 mt-0.5"
                  title="Delete note"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 text-sm">No notes yet.</p>
        )}
      </div>

      {/* Latest News Analysis */}
      {position.news_updates?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">News Analysis History</h2>
          {position.news_updates.map((nu) => (
            <div key={nu.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700 flex justify-between items-center">
                <p className="text-slate-400 text-xs">
                  {new Date(nu.created_at).toLocaleString()}
                </p>
              </div>
              <div className="px-5 py-4 space-y-4">
                {nu.news_content && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Latest News</p>
                    <div className="prose prose-sm prose-invert max-w-none text-slate-300">
                      <ReactMarkdown>{nu.news_content}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {nu.thesis_analysis && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Thesis Analysis</p>
                    <div className="prose prose-sm prose-invert max-w-none text-slate-300">
                      <ReactMarkdown>{nu.thesis_analysis}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {nu.citations?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
                    {nu.citations.slice(0, 6).map((url, i) => {
                      try {
                        return (
                          <a key={i} href={url} target="_blank" rel="noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                            {new URL(url).hostname}
                          </a>
                        )
                      } catch { return null }
                    })}
                  </div>
                )}
                {/* Inline chat about this news */}
                <NewsChat positionId={id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Thesis Updates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Thesis Update Log</h2>
          <button
            onClick={() => setShowThesisForm((v) => !v)}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
          >
            {showThesisForm ? 'Cancel' : '+ Add Update'}
          </button>
        </div>

        {showThesisForm && (
          <form onSubmit={handleAddThesis} className="bg-slate-800 border border-indigo-500/30 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">
                Update Notes
              </label>
              <textarea
                required
                rows={4}
                value={thesisForm.update_text}
                onChange={(e) => setThesisForm((f) => ({ ...f, update_text: e.target.value }))}
                placeholder="What changed? New developments, risks, catalysts..."
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">
                  Action
                </label>
                <select
                  value={thesisForm.action}
                  onChange={(e) => setThesisForm((f) => ({ ...f, action: e.target.value }))}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                >
                  {['HOLD', 'ADD', 'TRIM', 'EXIT'].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">
                  Confidence (1-5)
                </label>
                <select
                  value={thesisForm.rating}
                  onChange={(e) => setThesisForm((f) => ({ ...f, rating: e.target.value }))}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">—</option>
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">
              Save Update
            </button>
          </form>
        )}

        {position.thesis_updates?.length > 0 ? (
          <div className="space-y-3">
            {position.thesis_updates.map((tu) => (
              <div key={tu.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{tu.update_date}</span>
                    <span className="text-slate-500 text-xs">{tu.quarter_label}</span>
                    {tu.action && (
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ACTION_COLORS[tu.action] || 'bg-slate-700 text-slate-400'}`}>
                        {tu.action}
                      </span>
                    )}
                    {tu.rating && (
                      <span className="text-amber-400 text-xs">{'★'.repeat(tu.rating)}{'☆'.repeat(5 - tu.rating)}</span>
                    )}
                  </div>
                  {tu.price_at_update && (
                    <span className="text-slate-500 text-xs">{fmt(tu.price_at_update)}</span>
                  )}
                </div>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{tu.update_text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500 text-sm py-4">No thesis updates yet.</div>
        )}
      </div>

      {/* Move to Portfolio Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-white font-semibold text-lg">Move to Portfolio</h2>
            <p className="text-slate-400 text-sm">Enter your purchase details to move {position.ticker} to your active portfolio.</p>
            <form onSubmit={handleMoveToPortfolio} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1">Buy Price ($) *</label>
                <input required type="number" step="0.01" placeholder="150.00"
                  value={moveForm.buy_price}
                  onChange={(e) => setMoveForm(f => ({ ...f, buy_price: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1">Shares *</label>
                <input required type="number" step="0.001" placeholder="10"
                  value={moveForm.shares}
                  onChange={(e) => setMoveForm(f => ({ ...f, shares: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1">Buy Date</label>
                <input type="date" value={moveForm.buy_date}
                  onChange={(e) => setMoveForm(f => ({ ...f, buy_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={moveLoading}
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {moveLoading ? 'Moving...' : 'Confirm Purchase'}
                </button>
                <button type="button" onClick={() => setShowMoveModal(false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
