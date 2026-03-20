import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPosition, createPosition, updatePosition } from '../api/client'

export default function PositionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    ticker: '',
    buy_date: new Date().toISOString().split('T')[0],
    buy_price: '',
    shares: '',
    initial_thesis: '',
    target_price: '',
    target_date: '',
    goal_note: '',
    zacks_rating: '',
    wsz_rating: '',
    motley_fool_rating: '',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit) {
      setLoading(true)
      getPosition(id)
        .then((r) => {
          const p = r.data
          setForm({
            ticker: p.ticker || '',
            buy_date: p.buy_date || '',
            buy_price: p.buy_price ?? '',
            shares: p.shares ?? '',
            initial_thesis: p.initial_thesis || '',
            target_price: p.target_price ?? '',
            target_date: p.target_date || '',
            goal_note: p.goal_note || '',
            zacks_rating: p.zacks_rating || '',
            wsz_rating: p.wsz_rating || '',
            motley_fool_rating: p.motley_fool_rating || '',
          })
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ticker: form.ticker.toUpperCase().trim(),
        buy_date: form.buy_date || null,
        buy_price: form.buy_price ? parseFloat(form.buy_price) : null,
        shares: form.shares ? parseFloat(form.shares) : 0,
        initial_thesis: form.initial_thesis || null,
        target_price: form.target_price ? parseFloat(form.target_price) : null,
        target_date: form.target_date || null,
        goal_note: form.goal_note || null,
        zacks_rating: form.zacks_rating || null,
        wsz_rating: form.wsz_rating || null,
        motley_fool_rating: form.motley_fool_rating || null,
      }
      if (isEdit) {
        await updatePosition(id, payload)
        navigate(`/positions/${id}`)
      } else {
        const res = await createPosition(payload)
        navigate(`/positions/${res.data.id}`)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-slate-500 py-12 text-center">Loading...</div>

  const inputClass =
    'w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500'
  const labelClass = 'block text-slate-400 text-xs uppercase tracking-wider mb-1'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => navigate(isEdit ? `/positions/${id}` : '/positions')}
          className="text-slate-500 hover:text-slate-300 text-sm mb-2 block"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? `Edit ${form.ticker}` : 'Add New Position'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Core position fields */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-300 font-medium text-sm uppercase tracking-wider">Position Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ticker *</label>
              <input
                required
                type="text"
                value={form.ticker}
                onChange={set('ticker')}
                placeholder="AAPL"
                className={inputClass + ' uppercase'}
              />
            </div>
            <div>
              <label className={labelClass}>Buy Date</label>
              <input
                type="date"
                value={form.buy_date}
                onChange={set('buy_date')}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Buy Price ($) *</label>
              <input
                required
                type="number"
                step="0.01"
                value={form.buy_price}
                onChange={set('buy_price')}
                placeholder="150.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Shares *</label>
              <input
                required
                type="number"
                step="0.001"
                value={form.shares}
                onChange={set('shares')}
                placeholder="10"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Thesis */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-300 font-medium text-sm uppercase tracking-wider">Investment Thesis</h2>
          <div>
            <label className={labelClass}>Why are you investing in this company?</label>
            <textarea
              rows={5}
              value={form.initial_thesis}
              onChange={set('initial_thesis')}
              placeholder="Describe the investment thesis — what makes this company compelling, what catalysts you expect, what risks you've considered..."
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>

        {/* Target & Goals */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-300 font-medium text-sm uppercase tracking-wider">Target & Goals</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Target Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.target_price}
                onChange={set('target_price')}
                placeholder="250.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Target Date</label>
              <input
                type="date"
                value={form.target_date}
                onChange={set('target_date')}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Goals / Exit Criteria</label>
            <textarea
              rows={3}
              value={form.goal_note}
              onChange={set('goal_note')}
              placeholder="What would make you sell? What milestones are you watching for?"
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>

        {/* Analyst Ratings */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-slate-300 font-medium text-sm uppercase tracking-wider">Analyst Ratings</h2>
            <p className="text-slate-500 text-xs mt-0.5">Enter manually — Zacks can also be auto-fetched from the position detail page.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Zacks Rank</label>
              <select
                value={form.zacks_rating}
                onChange={set('zacks_rating')}
                className={inputClass}
              >
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
              <select
                value={form.wsz_rating}
                onChange={set('wsz_rating')}
                className={inputClass}
              >
                <option value="">— Not set —</option>
                <option value="Very Bullish">Very Bullish</option>
                <option value="Bullish">Bullish</option>
                <option value="Neutral">Neutral</option>
                <option value="Bearish">Bearish</option>
                <option value="Very Bearish">Very Bearish</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Motley Fool (Radio)</label>
              <select
                value={form.motley_fool_rating}
                onChange={set('motley_fool_rating')}
                className={inputClass}
              >
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
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Position'}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/positions/${id}` : '/positions')}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
