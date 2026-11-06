import { Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from './auth'
import Home from './Home'
import Login from './Login'
import Register from './Register'
import Hub from './Hub'

const Guard = ({ children }) => getToken() ? children : <Navigate to="/login" replace />

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/hub" element={<Guard><Hub /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
