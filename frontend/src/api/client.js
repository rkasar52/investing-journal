import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getDashboard = () => api.get('/dashboard')

// Positions
export const getPositions = () => api.get('/positions')
export const getPosition = (id) => api.get(`/positions/${id}`)
export const createPosition = (data) => api.post('/positions', data)
export const updatePosition = (id, data) => api.put(`/positions/${id}`, data)
export const deletePosition = (id) => api.delete(`/positions/${id}`)
export const refreshPositionPrice = (id) => api.post(`/positions/${id}/refresh-price`)
export const refreshNews = (id) => api.post(`/positions/${id}/refresh-news`)
export const refreshRatings = (id) => api.post(`/positions/${id}/refresh-ratings`)
export const positionChat = (id, message, history) => api.post(`/positions/${id}/chat`, { message, history })
export const researchGoal = (id) => api.post(`/positions/${id}/research-goal`)
export const addThesisUpdate = (id, data) => api.post(`/positions/${id}/thesis-updates`, data)

// Prices
export const refreshAllPrices = () => api.post('/prices/refresh')

// Chat
export const sendChat = (message, history) => api.post('/chat', { message, history })

// Daily brief
export const getDailyBrief = () => api.get('/daily-brief')
export const refreshDailyBrief = () => api.post('/daily-brief/refresh')

// Usage
export const getUsage = () => api.get('/usage')
export const updateBudget = (budget) => api.put('/usage/budget', { budget })

// Review groups
export const getReviewGroups = () => api.get('/review-groups')
export const getReviewGroupsWithPositions = () => api.get('/review-groups?with_positions=1')
export const getReviewGroup = (id) => api.get(`/review-groups/${id}`)
export const createReviewGroup = (data) => api.post('/review-groups', data)
export const updateReviewGroup = (id, data) => api.put(`/review-groups/${id}`, data)
export const finishReviewGroup = (id) => api.post(`/review-groups/${id}/finish`)
export const autoAssignGroups = () => api.post('/review-groups/auto-assign')
export const addPositionToGroup = (gid, pid) =>
  api.post(`/review-groups/${gid}/positions`, { position_id: pid })
export const removePositionFromGroup = (gid, pid) =>
  api.delete(`/review-groups/${gid}/positions/${pid}`)

// Position notes
export const addNote = (id, noteText) => api.post(`/positions/${id}/notes`, { note_text: noteText })
export const deleteNote = (positionId, noteId) => api.delete(`/positions/${positionId}/notes/${noteId}`)

// CSV import
export const importCSV = (formData) => api.post('/positions/import-csv', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// Watchlist
export const getWatchlist = () => api.get('/watchlist')
export const createWatchlistItem = (data) => api.post('/watchlist', data)
export const moveToPortfolio = (id, data) => api.post(`/positions/${id}/move-to-portfolio`, data)
