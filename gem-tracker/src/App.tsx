import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { LoginPage } from "./pages/LoginPage"
import { DashboardPage } from "./pages/DashboardPage"
import { QueuePage } from "./pages/QueuePage"
import { GemDetailPage } from "./pages/GemDetailPage"
import { IntakePage } from "./pages/IntakePage"
import { StatsPage } from "./pages/StatsPage"
import { UsersPage } from "./pages/UsersPage"
import { useGem } from "./hooks/useGemStore"
import { ReportPreviewPage } from "./pages/ReportPreviewPage"

export default function App() {
  const { user } = useGem()

  return (
    <Router>
      <Routes>
        <Route path='/' element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path='/dashboard' element={user ? <DashboardPage /> : <Navigate to='/' replace />} />
        <Route path='/queue' element={user ? <QueuePage /> : <Navigate to='/' replace />} />
        <Route path='/gems/:id' element={user ? <GemDetailPage /> : <Navigate to='/' replace />} />
        <Route
          path='/intake'
          element={
            user?.role === "HELPER" || user?.role === "ADMIN" ? (
              <IntakePage />
            ) : (
              <Navigate to='/dashboard' replace />
            )
          }
        />
        <Route
          path='/stats'
          element={user?.role === "ADMIN" ? <StatsPage /> : <Navigate to='/dashboard' replace />}
        />
        <Route
          path='/users'
          element={user?.role === "ADMIN" ? <UsersPage /> : <Navigate to='/dashboard' replace />}
        />
        <Route path='/reports/:id' element={<ReportPreviewPage />} />

        {/* Catch-all redirect */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </Router>
  )
}
