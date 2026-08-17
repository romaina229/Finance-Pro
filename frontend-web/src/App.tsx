import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { OrganizationProvider } from './context/OrganizationContext'
import { RequireAuth } from './components/RequireAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import OrganizationSettings from './pages/OrganizationSettings'
import Members from './pages/Members'
import Projects from './pages/Projects'
import Expenses from './pages/Expenses'
import Revenues from './pages/Revenues'
import Donors from './pages/Donors'
import ChartOfAccounts from './pages/ChartOfAccounts'
import Cash from './pages/Cash'

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
          <Route path="/projects" element={<ProtectedArea><Projects /></ProtectedArea>} />
          <Route path="/expenses" element={<ProtectedArea><Expenses /></ProtectedArea>} />
          <Route path="/revenues" element={<ProtectedArea><Revenues /></ProtectedArea>} />
          <Route path="/donors" element={<ProtectedArea><Donors /></ProtectedArea>} />
          <Route path="/chart-of-accounts" element={<ProtectedArea><ChartOfAccounts /></ProtectedArea>} />
          <Route path="/cash" element={<ProtectedArea><Cash /></ProtectedArea>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
