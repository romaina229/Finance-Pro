import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { OrganizationProvider } from './context/OrganizationContext'
import { RequireAuth } from './components/RequireAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import OrganizationSettings from './pages/OrganizationSettings'
import Members from './pages/Members'

function ProtectedArea({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <OrganizationProvider>{children}</OrganizationProvider>
    </RequireAuth>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedArea><Dashboard /></ProtectedArea>} />
          <Route path="/organization" element={<ProtectedArea><OrganizationSettings /></ProtectedArea>} />
          <Route path="/members" element={<ProtectedArea><Members /></ProtectedArea>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
