import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWatchlistItem } from '../api/client'

export default function WatchlistForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    ticker: '',
    initial_thesis: '',
    target_price: '',
    target_date: '',
    goal_note: '',
    zacks_rating: '',
    wsz_rating: '',
    motley_fool_rating: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ticker: form.ticker.toUpperCase().trim(),
        initial_thesis: form.initial_thesis || null,
        target_price: form.target_price ? parseFloat(form.target_price) : null,
        target_date: form.target_date || null,
        goal_note: form.goal_note || null,
        zacks_rating: form.zacks_rating || null,
        wsz_rating: form.wsz_rating || null,
        motley_fool_rating: form.motley_fool_rating || null,
      }
      const res = await createWatchlistItem(payload)
      navigate(`/positions/${res.data.id}`)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500'
  const labelClass = 'block text-slate-400 text-xs uppercase tracking-wider mb-1'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => navigate('/watchlist')} className="text-slate-500 hover:text-slate-300 text-sm mb-2 block">
          ← Back to Watchlist
        </button>
        <h1 className="text-2xl font-bold text-white">Add to Watchlist</h1>
        <p className="text-slate-400 text-sm mt-1">Track a stock you're researching but haven't purchased yet.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-300 font-medium text-sm uppercase tracking-wider">Stock</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ticker *</label>
              <input required type="text" value={form.ticker} onChange={set('ticker')}
                placeholder="AAPL" className={inputClass + ' uppercase'} />
            </div>
            <div>
              <label className={labelClass}>Target Price ($)</label>
              <input type="number" step="0.01" value={form.target_price} onChange={set('target_price')}
                placeholder="200.00" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-300 font-medium text-sm uppercase tracking-wider">Why You're Watching</h2>
          <div>
            <label className={labelClass}>Investment Thesis</label>
            <textarea rows={5} value={form.initial_thesis} onChange={set('initial_thesis')}
              placeholder="Why is this stock interesting? What would make you buy it? What are you waiting for?"
              className={inputClass + ' resize-none'} />
          </div>
          <div>
            <label className={labelClass}>Buy Criteria / What to Watch For</label>
            <textarea rows={3} value={form.goal_note} onChange={set('goal_note')}
              placeholder="What price, catalyst, or event would trigger you to buy?"
              className={inputClass + ' resize-none'} />
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-300 font-medium text-sm uppercase tracking-wider">Analyst Ratings</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Zacks Rank</label>
              <select value={form.zacks_rating} onChange={set('zacks_rating')} className={inputClass}>
                <option value="">— Not set —</option>
                <option value="Strong Buy">Strong Buy (1)</option>
                <option value="Buy">Buy (2)</option>
                <option value="Hold">Hold (3)</option>
                <option value="Sell">Sell (4)</option>
                <option value="Strong Sell">Strong Sell (5)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Wall Street Zen</label>
              <select value={form.wsz_rating} onChange={set('wsz_rating')} className={inputClass}>
                <option value="">— Not set —</option>
                <option value="Very Bullish">Very Bullish</option>
                <option value="Bullish">Bullish</option>
                <option value="Neutral">Neutral</option>
                <option value="Bearish">Bearish</option>
                <option value="Very Bearish">Very Bearish</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Motley Fool</label>
              <select value={form.motley_fool_rating} onChange={set('motley_fool_rating')} className={inputClass}>
                <option value="">— Not set —</option>
                <option value="Stock Advisor Buy">Stock Advisor Buy</option>
                <option value="Rule Breakers Buy">Rule Breakers Buy</option>
                <option value="Both Picks">Both Picks</option>
                <option value="Watch">Watch</option>
                <option value="Not Recommended">Not Recommended</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Adding...' : 'Add to Watchlist'}
          </button>
          <button type="button" onClick={() => navigate('/watchlist')}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
