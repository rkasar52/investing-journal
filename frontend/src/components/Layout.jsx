import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { refreshAllPrices, getUsage, updateBudget } from '../api/client'
import { useState, useEffect, useRef } from 'react'

export default function Layout() {
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)
  const [usage, setUsage] = useState(null)
  const [showUsage, setShowUsage] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    getUsage().then((r) => setUsage(r.data)).catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUsage(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetInput)
    if (isNaN(val) || val <= 0) return
    await updateBudget(val)
    const r = await getUsage()
    setUsage(r.data)
    setEditingBudget(false)
  }

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      const res = await refreshAllPrices()
      alert(`Refreshed prices for ${res.data.updated} tickers.`)
    } catch {
      alert('Failed to refresh prices.')
    } finally {
      setRefreshing(false)
    }
  }

  const navClass = ({ isActive }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-slate-700 text-white'
        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
    }`

  const usagePct = usage ? Math.min((usage.total_cost / usage.budget) * 100, 100) : 0
  const usageColor =
    usagePct > 80 ? 'text-red-400' :
    usagePct > 50 ? 'text-amber-400' :
    'text-emerald-400'

  const CALL_LABELS = {
    news_refresh: 'News Refresh',
    chat: 'Chat',
    daily_brief: 'Daily Brief',
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 h-14">
          <button
            onClick={() => navigate('/')}
            className="text-lg font-semibold text-white mr-4"
          >
            📈 Investing Journal
          </button>
          <NavLink to="/" end className={navClass}>Dashboard</NavLink>
          <NavLink to="/positions" className={navClass}>Positions</NavLink>
          <NavLink to="/review" className={navClass}>Review Queue</NavLink>
          <NavLink to="/chat" className={navClass}>💬 Chat</NavLink>

          <div className="ml-auto flex items-center gap-2">
            {/* API Usage indicator */}
            {usage && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowUsage((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-md transition-colors"
                  title="Perplexity API usage"
                >
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usagePct > 80 ? 'bg-red-500' :
                        usagePct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono ${usageColor}`}>
                    ${usage.total_cost.toFixed(2)}
                  </span>
                </button>

                {showUsage && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-4 z-50">
                    <p className="text-white text-sm font-semibold mb-3">Perplexity API Usage</p>

                    {/* Budget bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Used</span>
                        <div className="flex items-center gap-1">
                          <span>${usage.total_cost.toFixed(4)} /</span>
                          {editingBudget ? (
                            <input
                              autoFocus
                              type="number"
                              step="5"
                              min="1"
                              value={budgetInput}
                              onChange={(e) => setBudgetInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(); if (e.key === 'Escape') setEditingBudget(false) }}
                              onBlur={handleSaveBudget}
                              className="w-16 bg-slate-700 border border-indigo-500 text-white text-xs rounded px-1 py-0.5 focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => { setBudgetInput(usage.budget.toString()); setEditingBudget(true) }}
                              className="text-slate-300 hover:text-white underline decoration-dashed underline-offset-2"
                              title="Click to update budget"
                            >
                              ${usage.budget.toFixed(2)}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            usagePct > 80 ? 'bg-red-500' :
                            usagePct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${usageColor}`}>
                        ${usage.remaining.toFixed(4)} remaining
                      </p>
                    </div>

                    {/* Breakdown by call type */}
                    <div className="space-y-2 border-t border-slate-700 pt-3">
                      {Object.entries(usage.by_type).map(([type, stats]) => (
                        <div key={type} className="flex justify-between items-center">
                          <div>
                            <p className="text-slate-300 text-xs">{CALL_LABELS[type] || type}</p>
                            <p className="text-slate-500 text-xs">{stats.count} calls</p>
                          </div>
                          <span className="text-slate-400 text-xs font-mono">
                            ${stats.cost.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-slate-600 text-xs mt-3 border-t border-slate-700 pt-2">
                      Estimates based on sonar-pro pricing
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh All Prices'}
            </button>
            <NavLink
              to="/positions/new"
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
            >
              + Add Position
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
