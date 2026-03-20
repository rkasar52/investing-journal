import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReviewGroups, autoAssignGroups, updateReviewGroup } from '../api/client'

export default function ReviewQueue() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const navigate = useNavigate()

  const load = () => {
    getReviewGroups()
      .then((r) => setGroups(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAutoAssign = async () => {
    setAssigning(true)
    try {
      const res = await autoAssignGroups()
      alert(`Created ${res.data.groups_created} new review groups.`)
      load()
    } catch (e) {
      alert('Failed to auto-assign groups.')
    } finally {
      setAssigning(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const getGroupStatus = (g) => {
    if (!g.review_by_date) return 'upcoming'
    if (g.review_by_date < today) return 'overdue'
    if (g.review_by_date === today) return 'due-today'
    return 'upcoming'
  }

  const statusBadge = (status) => {
    switch (status) {
      case 'overdue':
        return <span className="px-2 py-0.5 text-xs bg-red-900/50 text-red-400 rounded-full">Overdue</span>
      case 'due-today':
        return <span className="px-2 py-0.5 text-xs bg-amber-900/50 text-amber-400 rounded-full">Due Today</span>
      default:
        return <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded-full">Upcoming</span>
    }
  }

  if (loading) return <div className="text-slate-500 py-12 text-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Review Queue</h1>
          <p className="text-slate-400 text-sm mt-1">
            Weekly cadence — review one group of ~10 stocks per week.
          </p>
        </div>
        <button
          onClick={handleAutoAssign}
          disabled={assigning}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-50"
        >
          {assigning ? 'Assigning...' : 'Auto-Assign Positions'}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <p className="text-slate-400 mb-4">No review groups yet.</p>
          <p className="text-slate-500 text-sm mb-6">
            Click "Auto-Assign Positions" to automatically split your portfolio into weekly review groups.
          </p>
          <button
            onClick={handleAutoAssign}
            disabled={assigning}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50"
          >
            {assigning ? 'Setting up...' : 'Set Up Review Groups'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, idx) => {
            const status = getGroupStatus(g)
            const isTop = idx === 0
            return (
              <div
                key={g.id}
                className={`bg-slate-800 border rounded-xl p-5 transition-all ${
                  isTop
                    ? 'border-indigo-500/50 ring-1 ring-indigo-500/20'
                    : 'border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">{g.name}</span>
                        {isTop && (
                          <span className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full">
                            Up Next
                          </span>
                        )}
                        {statusBadge(status)}
                      </div>
                      <div className="text-slate-400 text-sm flex gap-4">
                        <span>{g.position_count} stocks</span>
                        <span>Due: {g.review_by_date}</span>
                        {g.last_reviewed_date && (
                          <span className="text-slate-500">
                            Last reviewed: {g.last_reviewed_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/review/${g.id}`)}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      isTop
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    {isTop ? 'Start Review →' : 'View Group'}
                  </button>
                </div>

                {/* Progress bar showing position in rotation */}
                <div className="mt-3 bg-slate-700 rounded-full h-1">
                  <div
                    className="bg-indigo-500 h-1 rounded-full transition-all"
                    style={{ width: `${((groups.length - idx) / groups.length) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
