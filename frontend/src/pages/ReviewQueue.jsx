import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getReviewGroupsWithPositions,
  getPositions,
  autoAssignGroups,
  updateReviewGroup,
  createReviewGroup,
  addPositionToGroup,
  removePositionFromGroup,
} from '../api/client'

export default function ReviewQueue() {
  const [groups, setGroups] = useState([])
  const [allPositions, setAllPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [openDropdown, setOpenDropdown] = useState(null) // position id
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const navigate = useNavigate()

  const load = async () => {
    try {
      const [groupsRes, posRes] = await Promise.all([
        getReviewGroupsWithPositions(),
        getPositions(),
      ])
      setGroups(groupsRes.data)
      setAllPositions(posRes.data.filter((p) => !p.is_watchlist))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const close = () => setOpenDropdown(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const assignedIds = new Set(groups.flatMap((g) => (g.positions || []).map((p) => p.id)))
  const unassigned = allPositions.filter((p) => !assignedIds.has(p.id))

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAutoAssign = async () => {
    setAssigning(true)
    try {
      const res = await autoAssignGroups()
      if (res.data.groups_created === 0) {
        alert('All positions are already assigned to groups.')
      } else {
        alert(`Created ${res.data.groups_created} new group${res.data.groups_created !== 1 ? 's' : ''} from ${unassigned.length} unassigned positions.`)
      }
      await load()
    } catch {
      alert('Failed to auto-assign.')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemove = async (gid, pid) => {
    try {
      const res = await removePositionFromGroup(gid, pid)
      setGroups((prev) =>
        prev.map((g) =>
          g.id === gid
            ? { ...g, positions: res.data.positions, position_count: res.data.position_count }
            : g
        )
      )
    } catch {
      alert('Failed to remove position.')
    }
  }

  const handleAddToGroup = async (gid, pid, e) => {
    e.stopPropagation()
    try {
      const res = await addPositionToGroup(gid, pid)
      setGroups((prev) =>
        prev.map((g) =>
          g.id === gid
            ? { ...g, positions: res.data.positions, position_count: res.data.position_count }
            : g
        )
      )
      setOpenDropdown(null)
      // Auto-expand the group the position was added to
      setExpandedIds((prev) => new Set([...prev, gid]))
    } catch {
      alert('Failed to add position.')
    }
  }

  const handleRename = async (gid) => {
    if (!editName.trim()) { setEditingId(null); return }
    try {
      await updateReviewGroup(gid, { name: editName.trim() })
      setGroups((prev) => prev.map((g) => (g.id === gid ? { ...g, name: editName.trim() } : g)))
    } catch {
      alert('Failed to rename group.')
    }
    setEditingId(null)
  }

  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    try {
      const res = await createReviewGroup({ name, review_by_date: null })
      setGroups((prev) => [...prev, { ...res.data, positions: res.data.positions || [] }])
      setNewGroupName('')
      setCreatingGroup(false)
    } catch {
      alert('Failed to create group.')
    }
  }

  const today = new Date().toISOString().split('T')[0]

  if (loading) return <div className="text-slate-500 py-12 text-center">Loading...</div>

  return (
    <div className="space-y-6" onClick={() => setOpenDropdown(null)}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Review Queue</h1>
          <p className="text-slate-400 text-sm mt-1">
            {groups.length} group{groups.length !== 1 ? 's' : ''} · {allPositions.length - unassigned.length} assigned · {unassigned.length} unassigned
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setCreatingGroup(true) }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
          >
            + New Group
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleAutoAssign() }}
            disabled={assigning || unassigned.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
          >
            {assigning ? 'Assigning...' : `Auto-Assign${unassigned.length > 0 ? ` (${unassigned.length})` : ''}`}
          </button>
        </div>
      </div>

      {/* New group inline form */}
      {creatingGroup && (
        <div
          className="bg-slate-800 border border-indigo-500/40 rounded-xl p-4 flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateGroup()
              if (e.key === 'Escape') setCreatingGroup(false)
            }}
            placeholder="Group name, e.g. Tech Growth..."
            className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleCreateGroup}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
          >
            Create
          </button>
          <button
            onClick={() => setCreatingGroup(false)}
            className="px-3 py-2 text-slate-400 hover:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Unassigned positions */}
      {unassigned.length > 0 && (
        <div className="bg-slate-800/60 border border-dashed border-slate-600 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-slate-400 text-sm font-medium">
              Unassigned Positions
            </span>
            <span className="px-2 py-0.5 bg-amber-900/50 text-amber-400 text-xs rounded-full">
              {unassigned.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <div key={p.id} className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenDropdown(openDropdown === p.id ? null : p.id)
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-mono border border-slate-600 transition-colors"
                >
                  {p.ticker}
                  <span className="text-slate-400 text-xs ml-0.5">▾</span>
                </button>
                {openDropdown === p.id && groups.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[160px]">
                    <p className="px-3 py-1 text-slate-500 text-xs">Add to group:</p>
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={(e) => handleAddToGroup(g.id, p.id, e)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        {g.name}
                        <span className="text-slate-500 text-xs ml-1">
                          ({(g.positions || []).length})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {openDropdown === p.id && groups.length === 0 && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-2 px-3 min-w-[160px]">
                    <p className="text-slate-500 text-xs">No groups yet. Create one first.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {groups.length > 0 && (
            <p className="text-slate-500 text-xs mt-3">
              Click a ticker to assign it to a group, or use Auto-Assign to distribute them evenly.
            </p>
          )}
        </div>
      )}

      {/* Group cards */}
      {groups.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <p className="text-slate-400 mb-2">No review groups yet.</p>
          <p className="text-slate-500 text-sm mb-6">
            Create a group manually or auto-assign to split your positions into weekly batches.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); setCreatingGroup(true) }}
              className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
            >
              + New Group
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleAutoAssign() }}
              disabled={assigning}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-50"
            >
              {assigning ? 'Setting up...' : 'Auto-Assign All'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, idx) => (
            <GroupCard
              key={g.id}
              group={g}
              idx={idx}
              today={today}
              totalGroups={groups.length}
              expanded={expandedIds.has(g.id)}
              onToggle={() => toggleExpand(g.id)}
              onRemove={(pid) => handleRemove(g.id, pid)}
              onNavigate={() => navigate(`/review/${g.id}`)}
              editingId={editingId}
              editName={editName}
              setEditName={setEditName}
              onStartEdit={() => { setEditingId(g.id); setEditName(g.name) }}
              onSaveEdit={() => handleRename(g.id)}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCard({
  group, idx, today, totalGroups, expanded, onToggle,
  onRemove, onNavigate,
  editingId, editName, setEditName, onStartEdit, onSaveEdit, onCancelEdit,
}) {
  const isEditing = editingId === group.id
  const isFirst = idx === 0
  const positions = group.positions || []

  const status = (() => {
    if (!group.review_by_date) return 'upcoming'
    if (group.review_by_date < today) return 'overdue'
    if (group.review_by_date === today) return 'due-today'
    return 'upcoming'
  })()

  const statusBadge = {
    overdue: <span className="px-2 py-0.5 text-xs bg-red-900/50 text-red-400 rounded-full">Overdue</span>,
    'due-today': <span className="px-2 py-0.5 text-xs bg-amber-900/50 text-amber-400 rounded-full">Due Today</span>,
    upcoming: null,
  }[status]

  return (
    <div
      className={`bg-slate-800 border rounded-xl transition-all ${
        isFirst ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-slate-700'
      }`}
    >
      {/* Group header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Expand toggle */}
          <button
            onClick={onToggle}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xs w-4 flex-shrink-0"
          >
            {expanded ? '▼' : '▶'}
          </button>

          <div className="flex-1 min-w-0">
            {/* Group name */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isEditing ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveEdit()
                      if (e.key === 'Escape') onCancelEdit()
                    }}
                    className="bg-slate-700 text-white px-2 py-0.5 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button onClick={onSaveEdit} className="text-indigo-400 hover:text-indigo-300 text-xs">Save</button>
                  <button onClick={onCancelEdit} className="text-slate-500 hover:text-slate-300 text-xs">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={onStartEdit}
                  className="font-semibold text-white hover:text-indigo-300 transition-colors text-left"
                  title="Click to rename"
                >
                  {group.name}
                </button>
              )}
              {isFirst && (
                <span className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full flex-shrink-0">
                  Up Next
                </span>
              )}
              {statusBadge}
            </div>

            {/* Meta */}
            <div className="text-slate-400 text-sm flex gap-4 flex-wrap">
              <span>{positions.length} stock{positions.length !== 1 ? 's' : ''}</span>
              {group.review_by_date && <span>Due: {group.review_by_date}</span>}
              {group.last_reviewed_date && (
                <span className="text-slate-500">Last: {group.last_reviewed_date}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={onNavigate}
          className={`ml-4 flex-shrink-0 px-4 py-2 text-sm rounded-lg transition-colors ${
            isFirst
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
        >
          {isFirst ? 'Start Review →' : 'Review →'}
        </button>
      </div>

      {/* Expanded: position chips */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-700/60 pt-4">
          {positions.length === 0 ? (
            <p className="text-slate-500 text-sm">No positions in this group yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {positions.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 rounded-lg text-sm font-mono text-white border border-slate-600"
                >
                  {p.ticker}
                  <button
                    onClick={() => onRemove(p.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors text-xs leading-none"
                    title={`Remove ${p.ticker} from group`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rotation progress bar */}
      <div className="mx-5 mb-4 bg-slate-700 rounded-full h-0.5">
        <div
          className="bg-indigo-500 h-0.5 rounded-full transition-all"
          style={{ width: `${((totalGroups - idx) / totalGroups) * 100}%` }}
        />
      </div>
    </div>
  )
}
