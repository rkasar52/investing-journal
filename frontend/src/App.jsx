import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Positions from './pages/Positions'
import PositionDetail from './pages/PositionDetail'
import PositionForm from './pages/PositionForm'
import ReviewQueue from './pages/ReviewQueue'
import GroupReview from './pages/GroupReview'
import Chat from './pages/Chat'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="positions" element={<Positions />} />
          <Route path="positions/new" element={<PositionForm />} />
          <Route path="positions/:id" element={<PositionDetail />} />
          <Route path="positions/:id/edit" element={<PositionForm />} />
          <Route path="review" element={<ReviewQueue />} />
          <Route path="review/:groupId" element={<GroupReview />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
